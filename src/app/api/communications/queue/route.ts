import { Types } from "mongoose";
import { NextRequest } from "next/server";
import { connectDb } from "@/lib/db";
import { apiOk, requireAuth } from "@/lib/api";
import { EMAIL_TEMPLATE_TYPES } from "@/lib/constants";
import type { LifecycleStage } from "@/lib/lifecycle";
import { Candidate } from "@/models/Candidate";
import { sanitizeDeliveryError } from "@/lib/delivery-errors";
import { CommunicationLog } from "@/models/CommunicationLog";

type CommSummary = {
  sent: boolean;
  lastSentAt: string | null;
  status: string | null;
  sentByName: string | null;
  logId: string | null;
  errorMessage: string | null;
};

function emptySummary(): CommSummary {
  return { sent: false, lastSentAt: null, status: null, sentByName: null, logId: null, errorMessage: null };
}

function mapCommStatus(
  logs: Array<{
    _id: { toString(): string };
    type: string;
    status: string;
    sentAt?: Date | null;
    sentByName?: string;
    createdAt?: Date;
    errorMessage?: string;
  }>
) {
  const byType: Record<string, CommSummary> = Object.fromEntries(
    EMAIL_TEMPLATE_TYPES.map((t) => [t, emptySummary()])
  );

  for (const type of EMAIL_TEMPLATE_TYPES) {
    const latest = logs.find((l) => l.type === type);
    if (latest) {
      byType[type] = {
        sent: latest.status === "SENT",
        lastSentAt: (latest.sentAt ?? latest.createdAt)?.toISOString() ?? null,
        status: latest.status,
        sentByName: latest.sentByName ?? null,
        logId: latest._id.toString(),
        errorMessage:
          latest.status === "FAILED" && latest.errorMessage
            ? sanitizeDeliveryError(latest.errorMessage)
            : null,
      };
    }
  }

  return byType;
}

export async function GET(request: NextRequest) {
  const auth = await requireAuth(request, ["ADMIN", "HR"]);
  if (auth.error) return auth.error;

  await connectDb();

  const tab = request.nextUrl.searchParams.get("tab") ?? "workflow";
  const search = request.nextUrl.searchParams.get("search")?.trim();
  const searchFilter = search
    ? {
        $or: [
          { fullName: { $regex: search, $options: "i" } },
          { email: { $regex: search, $options: "i" } },
          { registrationId: { $regex: search, $options: "i" } },
        ],
      }
    : {};

  const lifecycleFilter: { lifecycleStage: LifecycleStage | { $in: LifecycleStage[] } } =
    tab === "offer"
      ? { lifecycleStage: "OFFER_LETTER" }
      : tab === "joining"
        ? { lifecycleStage: "JOINING_INSTRUCTIONS" }
        : tab === "workflow"
          ? { lifecycleStage: { $in: ["OFFER_LETTER", "JOINING_INSTRUCTIONS"] } }
          : { lifecycleStage: { $in: ["OFFER_LETTER", "JOINING_INSTRUCTIONS", "EMPLOYEE"] } };

  const workflowCandidates =
    tab === "history"
      ? []
      : await Candidate.find({ decision: "SELECTED", ...lifecycleFilter, ...searchFilter })
          .populate({ path: "batchId", select: "name" })
          .sort({ updatedAt: -1 })
          .limit(100)
          .select("registrationId fullName email phone batchId lifecycleStage updatedAt")
          .lean();

  const candidateIds = workflowCandidates.map((c) => c._id);

  const allLogs =
    candidateIds.length > 0
      ? await CommunicationLog.find({ candidateId: { $in: candidateIds } })
          .sort({ sentAt: -1, createdAt: -1 })
          .select("candidateId type status sentAt sentByName createdAt errorMessage")
          .lean()
      : [];

  const logsByCandidate = new Map<string, typeof allLogs>();
  for (const log of allLogs) {
    if (!log.candidateId) continue;
    const key = log.candidateId.toString();
    const list = logsByCandidate.get(key) ?? [];
    list.push(log);
    logsByCandidate.set(key, list);
  }

  const items = workflowCandidates.map((c) => {
    const id = c._id.toString();
    const batchName =
      c.batchId && typeof c.batchId === "object" && c.batchId !== null && "name" in c.batchId
        ? (c.batchId as { name: string }).name
        : null;
    const comms = mapCommStatus(logsByCandidate.get(id) ?? []);
    const workflowTypes = ["OFFER_LETTER", "JOINING_INSTRUCTIONS"] as const;
    const sentCount = workflowTypes.filter((t) => comms[t]?.sent).length;

    return {
      id,
      registrationId: c.registrationId,
      fullName: c.fullName,
      email: c.email,
      phone: c.phone,
      batchName,
      lifecycleStage: c.lifecycleStage,
      status: c.lifecycleStage,
      communications: comms,
      sentCount,
      workflowComplete: sentCount === workflowTypes.length,
    };
  });

  const [statusCounts, history] = await Promise.all([
    Promise.all([
      CommunicationLog.countDocuments({ status: "PENDING" }),
      CommunicationLog.countDocuments({ status: "SENT" }),
      CommunicationLog.countDocuments({ status: "FAILED" }),
      CommunicationLog.countDocuments({ type: "INTERVIEW_INVITATION" }),
      CommunicationLog.countDocuments({ type: "LETTER_OF_INTENT" }),
      CommunicationLog.countDocuments({ type: "OFFER_LETTER" }),
      CommunicationLog.countDocuments({ type: "JOINING_INSTRUCTIONS" }),
    ]),
    tab === "history" || tab === "workflow"
      ? CommunicationLog.find(
          tab === "history" && search
            ? {
                $or: [
                  { subject: { $regex: search, $options: "i" } },
                  { sentToEmail: { $regex: search, $options: "i" } },
                ],
              }
            : {}
        )
          .sort({ sentAt: -1, createdAt: -1 })
          .limit(100)
          .populate({ path: "candidateId", select: "fullName registrationId" })
          .lean()
      : [],
  ]);

  const [pendingEmails, sentEmails, failedEmails, interviewSent, loiSent, offerSent, joiningSent] =
    statusCounts;

  const filteredItems =
    tab === "history"
      ? []
      : tab === "offer"
        ? items.filter((i) => i.lifecycleStage === "OFFER_LETTER")
        : tab === "joining"
          ? items.filter((i) => i.lifecycleStage === "JOINING_INSTRUCTIONS")
          : tab === "workflow"
            ? items.filter((i) => !i.workflowComplete)
            : items;

  return apiOk({
    counts: {
      pending: pendingEmails,
      sent: sentEmails,
      failed: failedEmails,
      interviewInvitation: interviewSent,
      letterOfIntent: loiSent,
      offerLetter: offerSent,
      joiningInstructions: joiningSent,
      workflowPending: items.filter((i) => !i.workflowComplete).length,
    },
    items: tab === "history" ? [] : filteredItems,
    history: history.map((h) => {
      const candidate =
        h.candidateId && typeof h.candidateId === "object" && "fullName" in h.candidateId
          ? (h.candidateId as { _id: Types.ObjectId; fullName: string; registrationId?: string })
          : null;
      return {
        id: h._id.toString(),
        candidateId: candidate?._id.toString() ?? String(h.candidateId),
        candidateName: candidate?.fullName ?? "Unknown",
        registrationId: candidate?.registrationId ?? null,
        type: h.type,
        subject: h.subject,
        sentToEmail: h.sentToEmail,
        status: h.status,
        sentByName: h.sentByName,
        sentAt: h.sentAt ?? h.createdAt,
        attachmentCount: h.attachments?.length ?? 0,
        hasHtml: Boolean(h.htmlBody),
        errorMessage: h.errorMessage ? sanitizeDeliveryError(h.errorMessage) : "",
      };
    }),
  });
}

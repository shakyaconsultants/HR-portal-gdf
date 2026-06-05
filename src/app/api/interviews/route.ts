import { Types } from "mongoose";
import { NextRequest } from "next/server";
import { connectDb } from "@/lib/db";
import { apiError, apiOk, requireAuth } from "@/lib/api";
import { scheduleInterviewSchema } from "@/lib/validators";
import { formatInterviewMode } from "@/lib/interview-display";
import { parseInterviewDate, sendInterviewInvitation } from "@/lib/interviews";
import { renderEmailFromTemplate } from "@/lib/email-renderer";
import { Lead } from "@/models/Lead";
import { Interview } from "@/models/Interview";

function mapInterview(
  row: {
    _id: { toString(): string };
    leadId?: unknown;
    candidateId?: unknown;
    interviewDate: Date;
    interviewTime: string;
    interviewer: string;
    mode: string;
    instructions?: string;
    status: string;
    outcome?: string | null;
    outcomeRemarks?: string;
    invitationSubject?: string;
    invitationSentAt?: Date | null;
    scheduledByName: string;
    outcomeRecordedByName?: string;
    completedAt?: Date | null;
    createdAt?: Date;
    updatedAt?: Date;
  },
  lead?: {
    fullName: string;
    email: string;
    phone: string;
    leadStatus?: string | null;
  } | null
) {
  const leadId =
    lead && typeof row.leadId === "object" && row.leadId && "_id" in (row.leadId as object)
      ? (row.leadId as { _id: { toString(): string } })._id.toString()
      : String(row.leadId ?? "");
  return {
    id: row._id.toString(),
    leadId,
    candidateId: leadId,
    candidateName: lead?.fullName ?? "Unknown",
    candidateEmail: lead?.email ?? "",
    candidatePhone: lead?.phone ?? "",
    leadStatus: lead?.leadStatus ?? null,
    lifecycleStage: "",
    interviewDate: row.interviewDate,
    interviewTime: row.interviewTime,
    interviewer: row.interviewer,
    mode: row.mode,
    modeLabel: formatInterviewMode(row.mode),
    instructions: row.instructions ?? "",
    status: row.status,
    outcome: row.outcome ?? null,
    outcomeRemarks: row.outcomeRemarks ?? "",
    invitationSubject: row.invitationSubject ?? "",
    invitationSentAt: row.invitationSentAt ?? null,
    scheduledByName: row.scheduledByName,
    outcomeRecordedByName: row.outcomeRecordedByName ?? "",
    completedAt: row.completedAt ?? null,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

export async function GET(request: NextRequest) {
  const auth = await requireAuth(request, ["ADMIN", "HR"]);
  if (auth.error) return auth.error;

  await connectDb();
  const tab = request.nextUrl.searchParams.get("tab") ?? "upcoming";
  const search = request.nextUrl.searchParams.get("search")?.trim();

  const statusFilter =
    tab === "history"
      ? { status: "COMPLETED" as const }
      : tab === "upcoming"
        ? { status: "SCHEDULED" as const }
        : tab === "eligible"
          ? null
          : { status: "SCHEDULED" as const };

  if (tab === "eligible") {
    const leadFilter: Record<string, unknown> = {
      convertedAt: null,
      leadStatus: "NEW_LEAD",
    };
    if (search) {
      leadFilter.$or = [
        { fullName: { $regex: search, $options: "i" } },
        { email: { $regex: search, $options: "i" } },
        { phone: { $regex: search, $options: "i" } },
      ];
    }
    const leads = await Lead.find(leadFilter)
      .sort({ updatedAt: -1 })
      .limit(100)
      .select("fullName email phone leadStatus")
      .lean();

    return apiOk({
      eligible: leads.map((l) => ({
        id: l._id.toString(),
        leadId: l._id.toString(),
        fullName: l.fullName,
        email: l.email,
        phone: l.phone,
        leadStatus: l.leadStatus,
      })),
    });
  }

  const filter: Record<string, unknown> = statusFilter ? { ...statusFilter } : {};
  const interviews = await Interview.find(filter)
    .sort(tab === "history" ? { completedAt: -1, updatedAt: -1 } : { interviewDate: 1, interviewTime: 1 })
    .limit(100)
    .populate({ path: "leadId", select: "fullName email phone leadStatus" })
    .lean();

  type PopulatedLead = {
    _id: { toString(): string };
    fullName: string;
    email: string;
    phone: string;
    leadStatus?: string | null;
  };

  function isPopulatedLead(value: unknown): value is PopulatedLead {
    return (
      typeof value === "object" &&
      value !== null &&
      "fullName" in value &&
      "email" in value &&
      "phone" in value
    );
  }

  let rows = interviews.map((row) => {
    const lead = isPopulatedLead(row.leadId) ? row.leadId : null;
    return mapInterview(row, lead);
  });

  if (search) {
    const term = search.toLowerCase();
    rows = rows.filter(
      (r) =>
        r.candidateName.toLowerCase().includes(term) ||
        r.candidateEmail.toLowerCase().includes(term) ||
        r.interviewer.toLowerCase().includes(term)
    );
  }

  const [scheduledCount, completedCount, selectedCount, rejectedCount] = await Promise.all([
    Interview.countDocuments({ status: "SCHEDULED" }),
    Interview.countDocuments({ status: "COMPLETED" }),
    Interview.countDocuments({ status: "COMPLETED", outcome: "SELECTED" }),
    Interview.countDocuments({ status: "COMPLETED", outcome: "REJECTED" }),
  ]);

  return apiOk({
    items: rows,
    counts: {
      scheduled: scheduledCount,
      completed: completedCount,
      selected: selectedCount,
      rejected: rejectedCount,
    },
  });
}

export async function POST(request: NextRequest) {
  const auth = await requireAuth(request, ["ADMIN", "HR"]);
  if (auth.error || !auth.user) return auth.error;

  await connectDb();
  const body = await request.json();
  const parsed = scheduleInterviewSchema.safeParse(body);
  if (!parsed.success) {
    return apiError(parsed.error.issues[0]?.message ?? "Invalid payload", 422);
  }

  const { leadId, interviewDate, interviewTime, interviewer, mode, instructions } = parsed.data;
  if (!Types.ObjectId.isValid(leadId)) {
    return apiError("Invalid lead id", 422);
  }

  const interviewOn = parseInterviewDate(interviewDate);
  if (!interviewOn) return apiError("Invalid interview date.", 422);

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  if (interviewOn < today) {
    return apiError("Interview date cannot be in the past.", 422);
  }

  const lead = await Lead.findOne({ _id: leadId, convertedAt: null })
    .select("fullName email phone leadStatus")
    .lean();
  if (!lead) return apiError("Lead not found", 404);
  if (lead.leadStatus !== "NEW_LEAD") {
    return apiError("Only leads with New Lead status can be scheduled for interview.", 409);
  }

  await Interview.updateMany(
    { leadId, status: "SCHEDULED" },
    { $set: { status: "CANCELLED" } }
  );

  const interview = await Interview.create({
    leadId,
    interviewDate: interviewOn,
    interviewTime,
    interviewer,
    mode,
    instructions: instructions ?? "",
    status: "SCHEDULED",
    invitationSubject: "",
    invitationBody: "",
    invitationSentAt: null,
    invitationStatus: "PENDING",
    scheduledBy: auth.user.userId,
    scheduledByName: auth.user.name,
  });

  const interviewId = interview._id.toString();
  const rendered = await renderEmailFromTemplate({
    type: "INTERVIEW_INVITATION",
    leadId,
    extras: { interviewId },
  });

  const deliveryStatus = await sendInterviewInvitation({
    leadId,
    to: lead.email,
    sentBy: auth.user,
    interviewId,
  });

  const sentAt = new Date();
  await Interview.updateOne(
    { _id: interview._id },
    {
      $set: {
        invitationSubject: rendered.subject,
        invitationBody: rendered.textBody,
        invitationSentAt: sentAt,
        invitationStatus: deliveryStatus,
      },
    }
  );

  await Lead.updateOne(
    { _id: leadId },
    { $set: { leadStatus: "INTERVIEW_SCHEDULED" } }
  );

  return apiOk(
    {
      id: interview._id.toString(),
      leadId,
      candidateId: leadId,
      interviewDate: interviewOn,
      interviewTime,
      mode,
      invitation: {
        subject: rendered.subject,
        sentAt,
        status: deliveryStatus,
      },
    },
    201
  );
}

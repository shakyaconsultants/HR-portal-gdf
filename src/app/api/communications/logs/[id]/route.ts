import { Types } from "mongoose";
import { NextRequest } from "next/server";
import { connectDb } from "@/lib/db";
import { apiError, apiOk, requireAuth } from "@/lib/api";
import { sanitizeDeliveryError } from "@/lib/delivery-errors";
import { CommunicationLog } from "@/models/CommunicationLog";

type Params = { params: Promise<{ id: string }> };

export async function GET(_request: NextRequest, { params }: Params) {
  const auth = await requireAuth(_request, ["ADMIN", "HR"]);
  if (auth.error) return auth.error;

  const { id } = await params;
  if (!Types.ObjectId.isValid(id)) return apiError("Invalid log id", 422);

  await connectDb();
  const log = await CommunicationLog.findById(id)
    .populate({ path: "candidateId", select: "fullName email registrationId" })
    .lean();

  if (!log) return apiError("Email log not found", 404);

  type PopulatedCandidate = { fullName: string; email: string; registrationId?: string | null };

  const rawCandidate = log.candidateId;
  const candidate =
    rawCandidate &&
    typeof rawCandidate === "object" &&
    "fullName" in rawCandidate &&
    "email" in rawCandidate
      ? (rawCandidate as PopulatedCandidate)
      : null;

  return apiOk({
    id: log._id.toString(),
    candidateId: String(log.candidateId),
    candidateName: candidate?.fullName ?? "Unknown",
    candidateEmail: candidate?.email ?? log.sentToEmail,
    registrationId: candidate?.registrationId ?? null,
    type: log.type,
    subject: log.subject,
    body: log.body,
    htmlBody: log.htmlBody,
    attachments: (log.attachments ?? []).map((att) => ({
      fileName: att.fileName,
      mimeType: att.mimeType,
      storagePath: att.storagePath,
      size: att.size,
    })),
    sentToEmail: log.sentToEmail,
    sentByName: log.sentByName,
    sentAt: log.sentAt ?? log.createdAt,
    status: log.status,
    errorMessage: log.errorMessage ? sanitizeDeliveryError(log.errorMessage) : "",
    retryCount: log.retryCount ?? 0,
    messageId: log.messageId ?? "",
    relatedId: log.relatedId ? String(log.relatedId) : null,
    relatedModel: log.relatedModel ?? "",
    createdAt: log.createdAt,
  });
}

import { Types } from "mongoose";
import { NextRequest } from "next/server";
import { connectDb } from "@/lib/db";
import { apiError, apiOk, requireAuth } from "@/lib/api";
import { sanitizeDeliveryError } from "@/lib/delivery-errors";
import { updateLeadSchema } from "@/lib/validators";
import { formatLeadStatus, formatReferenceSource } from "@/lib/leads";
import { formatInterviewMode } from "@/lib/interview-display";
import { Lead } from "@/models/Lead";
import { LeadDocument } from "@/models/LeadDocument";
import { Candidate } from "@/models/Candidate";
import { Interview } from "@/models/Interview";
import { LetterOfIntent } from "@/models/LetterOfIntent";
import { CommunicationLog } from "@/models/CommunicationLog";

type Params = { params: Promise<{ id: string }> };

export async function PATCH(request: NextRequest, { params }: Params) {
  const auth = await requireAuth(request, ["ADMIN", "HR"]);
  if (auth.error || !auth.user) return auth.error;

  const { id } = await params;
  if (!Types.ObjectId.isValid(id)) return apiError("Invalid lead id", 422);

  await connectDb();
  const body = await request.json();
  const parsed = updateLeadSchema.safeParse(body);
  if (!parsed.success) {
    return apiError(parsed.error.issues[0]?.message ?? "Invalid payload", 422);
  }

  const existing = await Lead.findOne({ _id: id, convertedAt: null }).lean();
  if (!existing) return apiError("Lead not found", 404);

  if (existing.leadStatus === "REJECTED" && parsed.data.leadStatus && parsed.data.leadStatus !== "REJECTED") {
    return apiError("Rejected leads cannot be moved to another status.", 409);
  }

  const update: Record<string, unknown> = {};

  if (parsed.data.fullName) update.fullName = parsed.data.fullName;
  if (parsed.data.phone) update.phone = parsed.data.phone;
  if (parsed.data.email) {
    const email = parsed.data.email.toLowerCase();
    const dup = await Promise.all([
      Lead.exists({ email, convertedAt: null, _id: { $ne: id } }),
      Candidate.exists({ email }),
    ]);
    if (dup[0] || dup[1]) return apiError("Another lead or candidate already uses this email.", 409);
    update.email = email;
  }
  if (parsed.data.referenceSource) update.referenceSource = parsed.data.referenceSource;
  if (parsed.data.referenceName !== undefined) update.referenceName = parsed.data.referenceName;
  if (parsed.data.comments !== undefined) update.remarks = parsed.data.comments;
  if (parsed.data.leadStatus) update.leadStatus = parsed.data.leadStatus;

  const lead = await Lead.findByIdAndUpdate(id, { $set: update }, { new: true })
    .select("fullName email phone leadStatus referenceSource referenceName remarks candidateId updatedAt")
    .lean();

  return apiOk({
    id,
    fullName: lead!.fullName,
    email: lead!.email,
    phone: lead!.phone,
    leadStatus: lead!.leadStatus,
    leadStatusLabel: formatLeadStatus(lead!.leadStatus),
    referenceSource: lead!.referenceSource,
    referenceName: lead!.referenceName,
    remarks: lead!.remarks,
    candidateId: lead!.candidateId?.toString() ?? null,
    updatedAt: lead!.updatedAt,
  });
}

export async function GET(request: NextRequest, { params }: Params) {
  const auth = await requireAuth(request, ["ADMIN", "HR"]);
  if (auth.error) return auth.error;

  const { id } = await params;
  if (!Types.ObjectId.isValid(id)) return apiError("Invalid lead id", 422);

  await connectDb();
  const lead = await Lead.findById(id)
    .select(
      "fullName email phone leadStatus referenceSource referenceName remarks candidateId convertedAt registrationToken createdAt updatedAt"
    )
    .lean();
  if (!lead) return apiError("Lead not found", 404);

  const [resume, interviews, loi, communications] = await Promise.all([
    LeadDocument.findOne({ leadId: id, documentType: "RESUME" })
      .sort({ createdAt: -1 })
      .select("fileName filePath mimeType fileSize")
      .lean(),
    Interview.find({ leadId: id })
      .sort({ interviewDate: -1, createdAt: -1 })
      .select(
        "interviewDate interviewTime interviewer mode status outcome outcomeRemarks invitationSentAt invitationStatus scheduledByName outcomeRecordedByName completedAt createdAt"
      )
      .lean(),
    LetterOfIntent.findOne({ leadId: id }).sort({ sentAt: -1 }).lean(),
    CommunicationLog.find({ leadId: id })
      .sort({ createdAt: -1 })
      .limit(30)
      .select("type subject status sentAt sentByName sentToEmail errorMessage createdAt")
      .lean(),
  ]);

  return apiOk({
    id,
    fullName: lead.fullName,
    email: lead.email,
    phone: lead.phone,
    leadStatus: lead.leadStatus,
    leadStatusLabel: formatLeadStatus(lead.leadStatus),
    referenceSource: lead.referenceSource,
    referenceSourceLabel: lead.referenceSource ? formatReferenceSource(lead.referenceSource) : "—",
    referenceName: lead.referenceName ?? "",
    remarks: lead.remarks ?? "",
    candidateId: lead.candidateId?.toString() ?? null,
    convertedAt: lead.convertedAt,
    registrationToken: lead.registrationToken ?? null,
    isConverted: Boolean(lead.convertedAt),
    resume: resume
      ? {
          fileName: resume.fileName,
          filePath: resume.filePath,
          mimeType: resume.mimeType,
          fileSize: resume.fileSize,
        }
      : null,
    interviews: interviews.map((row) => ({
      id: row._id.toString(),
      interviewDate: row.interviewDate,
      interviewTime: row.interviewTime,
      interviewer: row.interviewer,
      mode: row.mode,
      modeLabel: formatInterviewMode(row.mode),
      status: row.status,
      outcome: row.outcome ?? null,
      outcomeRemarks: row.outcomeRemarks ?? "",
      invitationSentAt: row.invitationSentAt ?? null,
      invitationStatus: row.invitationStatus ?? "",
      scheduledByName: row.scheduledByName,
      outcomeRecordedByName: row.outcomeRecordedByName ?? "",
      completedAt: row.completedAt ?? null,
      createdAt: row.createdAt,
    })),
    letterOfIntent: loi
      ? {
          id: loi._id.toString(),
          referenceNumber: loi.referenceNumber,
          registrationLink: loi.registrationLink,
          sentAt: loi.sentAt,
          sentByName: loi.sentByName,
          emailStatus: loi.emailStatus,
        }
      : null,
    communications: communications.map((log) => ({
      id: log._id.toString(),
      type: log.type,
      subject: log.subject,
      status: log.status,
      sentAt: log.sentAt,
      sentByName: log.sentByName,
      sentToEmail: log.sentToEmail,
      errorMessage: log.errorMessage ? sanitizeDeliveryError(log.errorMessage) : "",
      createdAt: log.createdAt,
    })),
    createdAt: lead.createdAt,
    updatedAt: lead.updatedAt,
  });
}

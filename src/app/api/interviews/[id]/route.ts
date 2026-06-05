import { Types } from "mongoose";
import { NextRequest } from "next/server";
import { connectDb } from "@/lib/db";
import { apiError, apiOk, requireAuth } from "@/lib/api";
import { completeInterviewSchema } from "@/lib/validators";
import { formatInterviewMode } from "@/lib/interview-display";
import { leadStatusFromInterviewOutcome } from "@/lib/leads";
import { Lead } from "@/models/Lead";
import { Interview } from "@/models/Interview";

type Params = { params: Promise<{ id: string }> };

export async function GET(request: NextRequest, { params }: Params) {
  const auth = await requireAuth(request, ["ADMIN", "HR"]);
  if (auth.error) return auth.error;

  const { id } = await params;
  if (!Types.ObjectId.isValid(id)) return apiError("Invalid interview id", 422);

  await connectDb();
  const interview = await Interview.findById(id)
    .populate({ path: "leadId", select: "fullName email phone leadStatus" })
    .lean();
  if (!interview) return apiError("Interview not found", 404);

  type PopulatedLead = {
    _id: Types.ObjectId;
    fullName: string;
    email: string;
  };

  const lead: PopulatedLead | null =
    interview.leadId &&
    typeof interview.leadId === "object" &&
    "fullName" in interview.leadId &&
    "email" in interview.leadId
      ? (interview.leadId as PopulatedLead)
      : null;

  return apiOk({
    id: interview._id.toString(),
    leadId: lead ? lead._id.toString() : String(interview.leadId),
    candidateName: lead?.fullName ?? "Unknown",
    candidateEmail: lead?.email ?? "",
    interviewDate: interview.interviewDate,
    interviewTime: interview.interviewTime,
    interviewer: interview.interviewer,
    mode: interview.mode,
    modeLabel: formatInterviewMode(interview.mode),
    instructions: interview.instructions,
    status: interview.status,
    outcome: interview.outcome,
    outcomeRemarks: interview.outcomeRemarks,
    invitationSubject: interview.invitationSubject,
    invitationBody: interview.invitationBody,
    invitationSentAt: interview.invitationSentAt,
    scheduledByName: interview.scheduledByName,
    outcomeRecordedByName: interview.outcomeRecordedByName,
    completedAt: interview.completedAt,
    createdAt: interview.createdAt,
  });
}

export async function PATCH(request: NextRequest, { params }: Params) {
  const auth = await requireAuth(request, ["ADMIN", "HR"]);
  if (auth.error || !auth.user) return auth.error;

  const { id } = await params;
  if (!Types.ObjectId.isValid(id)) return apiError("Invalid interview id", 422);

  await connectDb();
  const body = await request.json();
  const parsed = completeInterviewSchema.safeParse(body);
  if (!parsed.success) {
    return apiError(parsed.error.issues[0]?.message ?? "Invalid payload", 422);
  }

  const interview = await Interview.findById(id).lean();
  if (!interview) return apiError("Interview not found", 404);
  if (interview.status !== "SCHEDULED") {
    return apiError("Only scheduled interviews can be completed.", 409);
  }

  if (!interview.leadId) return apiError("Interview is not linked to a lead.", 409);

  const lead = await Lead.findOne({ _id: interview.leadId, convertedAt: null })
    .select("leadStatus")
    .lean();
  if (!lead) return apiError("Lead not found", 404);

  const { outcome, remarks } = parsed.data;
  const completedAt = new Date();
  const nextStatus = leadStatusFromInterviewOutcome(outcome);

  await Promise.all([
    Interview.updateOne(
      { _id: id },
      {
        $set: {
          status: "COMPLETED",
          outcome,
          outcomeRemarks: remarks,
          completedAt,
          outcomeRecordedBy: auth.user.userId,
          outcomeRecordedByName: auth.user.name,
        },
      }
    ),
    Lead.updateOne({ _id: interview.leadId }, { $set: { leadStatus: nextStatus } }),
  ]);

  return apiOk({
    id,
    outcome,
    remarks,
    leadStatus: nextStatus,
    completedAt,
  });
}

import { Types } from "mongoose";
import { NextRequest } from "next/server";
import { connectDb } from "@/lib/db";
import { apiError, apiOk, requireAuth } from "@/lib/api";
import { updateVerificationSchema } from "@/lib/validators";
import { VERIFICATION_STAGES, VerificationStage } from "@/lib/constants";
import { Candidate } from "@/models/Candidate";
import { CandidateTimeline } from "@/models/CandidateTimeline";
import { VerificationRecord } from "@/models/VerificationRecord";
import { canSetStage, getNextStage, stageToLifecycleStage } from "@/lib/verification";

type Params = { params: Promise<{ id: string }> };

type VerificationRecordStage = (typeof VERIFICATION_STAGES)[number] | "REJECTED";

async function recordVerification(input: {
  candidateId: Types.ObjectId;
  previousStage: string | null;
  stage: VerificationRecordStage;
  action: "ADVANCE" | "SET_STAGE" | "APPROVE" | "REJECT";
  remarks: string;
  actorRole: string;
  actorName: string;
}) {
  await Promise.all([
    VerificationRecord.create(input),
    CandidateTimeline.create({
      candidateId: input.candidateId,
      action: input.action === "REJECT" ? "VERIFICATION_REJECTED" : "VERIFICATION_UPDATED",
      actorRole: input.actorRole,
      actorName: input.actorName,
      remarks: input.remarks,
    }),
  ]);
}

export async function GET(request: NextRequest, { params }: Params) {
  const auth = await requireAuth(request, ["ADMIN", "HR"]);
  if (auth.error) return auth.error;

  const { id } = await params;
  if (!Types.ObjectId.isValid(id)) return apiError("Invalid candidate id", 422);

  await connectDb();
  const candidate = await Candidate.findById(id)
    .select("fullName lifecycleStage verificationStage verificationRemarks verificationRejected")
    .lean();
  if (!candidate) return apiError("Candidate not found", 404);

  const history = await VerificationRecord.find({ candidateId: id }).sort({ createdAt: -1 }).limit(30).lean();

  return apiOk({
    candidate: {
      id,
      fullName: candidate.fullName,
      lifecycleStage: candidate.lifecycleStage,
      status: candidate.lifecycleStage,
      verificationStage: candidate.verificationStage,
      verificationRemarks: candidate.verificationRemarks,
      verificationRejected: candidate.verificationRejected,
    },
    stages: VERIFICATION_STAGES,
    nextStage: getNextStage(candidate.verificationStage as VerificationStage),
    history: history.map((h) => ({
      id: h._id.toString(),
      previousStage: h.previousStage,
      stage: h.stage,
      action: h.action,
      remarks: h.remarks,
      actorRole: h.actorRole,
      actorName: h.actorName,
      createdAt: h.createdAt,
    })),
  });
}

export async function PATCH(request: NextRequest, { params }: Params) {
  const auth = await requireAuth(request, ["ADMIN", "HR"]);
  if (auth.error || !auth.user) return auth.error;

  const { id } = await params;
  if (!Types.ObjectId.isValid(id)) return apiError("Invalid candidate id", 422);

  await connectDb();
  const body = await request.json();
  const parsed = updateVerificationSchema.safeParse(body);
  if (!parsed.success) {
    return apiError(parsed.error.issues[0]?.message ?? "Invalid payload", 422);
  }

  const existing = await Candidate.findById(id)
    .select("fullName verificationStage lifecycleStage verificationRejected")
    .lean();
  if (!existing) return apiError("Candidate not found", 404);

  if (existing.verificationRejected) {
    return apiError("Verification was rejected. Cannot update.", 409);
  }
  if (
    existing.lifecycleStage === "BATCH_ASSIGNMENT" &&
    existing.verificationStage === "FINAL_APPROVED" &&
    parsed.data.action !== "reject"
  ) {
    return apiError("Verification already approved.", 409);
  }
  if (!["REGISTRATION_SUBMITTED", "VERIFICATION"].includes(existing.lifecycleStage)) {
    return apiError("Candidate is not in the verification lifecycle stage.", 409);
  }

  const remarks = parsed.data.remarks?.trim() ?? "";
  const currentStage = existing.verificationStage as VerificationStage;

  if (parsed.data.action === "reject") {
    if (!remarks) return apiError("Remarks are required when rejecting verification.", 422);

    const candidate = await Candidate.findByIdAndUpdate(
      id,
      {
        $set: {
          lifecycleStage: "VERIFICATION",
          verificationRejected: true,
          verificationRemarks: remarks,
        },
      },
      { new: true }
    )
      .select("fullName lifecycleStage verificationStage verificationRemarks verificationRejected")
      .lean();

    await recordVerification({
      candidateId: new Types.ObjectId(id),
      previousStage: currentStage,
      stage: "REJECTED",
      action: "REJECT",
      remarks,
      actorRole: auth.user.role,
      actorName: auth.user.name,
    });

    return apiOk({
      id,
      fullName: candidate!.fullName,
      lifecycleStage: candidate!.lifecycleStage,
      status: candidate!.lifecycleStage,
      verificationStage: candidate!.verificationStage,
      verificationRemarks: candidate!.verificationRemarks,
      eligibleForBatch: false,
    });
  }

  let targetStage: VerificationStage;
  let recordAction: "ADVANCE" | "SET_STAGE" | "APPROVE" = "SET_STAGE";

  if (parsed.data.action === "advance") {
    const next = getNextStage(currentStage);
    if (!next) return apiError("Already at final verification stage.", 409);
    targetStage = next;
    recordAction = next === "FINAL_APPROVED" ? "APPROVE" : "ADVANCE";
  } else if (parsed.data.stage) {
    if (!canSetStage(currentStage, parsed.data.stage)) {
      return apiError("Stages must progress in order. Advance one step at a time.", 422);
    }
    targetStage = parsed.data.stage;
    recordAction = targetStage === "FINAL_APPROVED" ? "APPROVE" : "SET_STAGE";
  } else {
    return apiError("Provide action or stage", 422);
  }

  const newLifecycleStage = stageToLifecycleStage(targetStage);
  const timelineRemarks =
    remarks ||
    (targetStage === "FINAL_APPROVED"
      ? "Final verification approved — eligible for batch assignment."
      : `Verification advanced to ${targetStage}`);

  const candidate = await Candidate.findByIdAndUpdate(
    id,
    {
      $set: {
        verificationStage: targetStage,
        lifecycleStage: newLifecycleStage,
        verificationRemarks: remarks || existing.verificationRemarks || "",
        verificationRejected: false,
      },
    },
    { new: true }
  )
    .select("fullName lifecycleStage verificationStage verificationRemarks")
    .lean();

  await recordVerification({
    candidateId: new Types.ObjectId(id),
    previousStage: currentStage,
    stage: targetStage,
    action: recordAction,
    remarks: timelineRemarks,
    actorRole: auth.user.role,
    actorName: auth.user.name,
  });

  return apiOk({
    id: candidate!._id.toString(),
    fullName: candidate!.fullName,
    lifecycleStage: candidate!.lifecycleStage,
    status: candidate!.lifecycleStage,
    verificationStage: candidate!.verificationStage,
    verificationRemarks: candidate!.verificationRemarks,
    eligibleForBatch: targetStage === "FINAL_APPROVED",
  });
}

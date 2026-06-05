import { Types } from "mongoose";
import { NextRequest } from "next/server";
import { connectDb } from "@/lib/db";
import { apiError, apiOk, requireAuth } from "@/lib/api";
import { createEvaluationSchema } from "@/lib/validators";
import {
  buildMockCallBreakdown,
  computeMockCallScore,
  MOCK_CALL_ELIGIBILITY_FILTER,
  MOCK_CALL_ELIGIBLE_STAGES,
} from "@/lib/mock-call";
import { Evaluation } from "@/models/Evaluation";
import { Candidate } from "@/models/Candidate";
import { CandidateTimeline } from "@/models/CandidateTimeline";

export async function POST(request: NextRequest) {
  const auth = await requireAuth(request, ["ADMIN", "HR", "TRAINER"]);
  if (auth.error || !auth.user) return auth.error;

  await connectDb();
  const body = await request.json();
  const parsed = createEvaluationSchema.safeParse(body);
  if (!parsed.success) {
    return apiError(parsed.error.issues[0]?.message ?? "Invalid payload", 422);
  }

  if (!Types.ObjectId.isValid(parsed.data.candidateId)) {
    return apiError("Invalid candidate id", 422);
  }

  const candidate = await Candidate.findById(parsed.data.candidateId).select(
    "fullName batchId evaluationStatus lifecycleStage"
  );
  if (!candidate) return apiError("Candidate not found", 404);

  if (!candidate.batchId) {
    return apiError("Candidate must be assigned to a batch before final mock call evaluation.", 409);
  }

  if (candidate.evaluationStatus === "EVALUATED") {
    return apiError("This candidate already has a final mock call evaluation. Only one is allowed.", 409);
  }

  if (!(MOCK_CALL_ELIGIBLE_STAGES as readonly string[]).includes(candidate.lifecycleStage)) {
    return apiError("Candidate must be in training or final mock call stage to be evaluated.", 409);
  }

  const existing = await Evaluation.exists({ candidateId: parsed.data.candidateId });
  if (existing) {
    return apiError("Final mock call evaluation already exists for this candidate.", 409);
  }

  const scores = {
    communicationSkills: parsed.data.communicationSkills,
    confidenceLevel: parsed.data.confidenceLevel,
    productUnderstanding: parsed.data.productUnderstanding,
    salesPitch: parsed.data.salesPitch,
    objectionHandling: parsed.data.objectionHandling,
  };

  const finalScore = computeMockCallScore(scores);
  const breakdown = buildMockCallBreakdown(scores);
  const evaluatorName = parsed.data.evaluatorName?.trim() || auth.user.name;
  const evaluatedAt = parsed.data.evaluatedAt ? new Date(parsed.data.evaluatedAt) : new Date();
  if (Number.isNaN(evaluatedAt.getTime())) {
    return apiError("Invalid evaluation date.", 422);
  }

  const remarks = parsed.data.remarks?.trim() ?? "";

  const evalDoc = await Evaluation.create({
    candidateId: parsed.data.candidateId,
    trainerId: auth.user.userId,
    ...scores,
    finalScore,
    remarks,
    evaluatorName,
    evaluatedAt,
  });

  await Promise.all([
    Candidate.updateOne(
      { _id: parsed.data.candidateId },
      {
        $set: {
          finalScore,
          evaluationStatus: "EVALUATED",
          lifecycleStage: "HIRING_DECISION",
          evaluationRemarks: remarks,
        },
      }
    ),
    CandidateTimeline.create({
      candidateId: parsed.data.candidateId,
      action: "FINAL_MOCK_CALL_COMPLETED",
      actorRole: auth.user.role,
      actorName: evaluatorName,
      remarks: `Final mock call ${finalScore}/100 — eligible for hiring decision.`,
    }),
  ]);

  return apiOk(
    {
      id: evalDoc._id.toString(),
      candidateId: parsed.data.candidateId,
      finalScore,
      breakdown,
      evaluatorName,
      evaluatedAt,
      remarks,
      lifecycleStage: "HIRING_DECISION",
      eligibleForHiringDecision: true,
      message: "Evaluation saved. Candidate is now eligible for hiring decision.",
    },
    201
  );
}

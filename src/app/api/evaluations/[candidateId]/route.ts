import { Types } from "mongoose";
import { NextRequest } from "next/server";
import { connectDb } from "@/lib/db";
import { apiError, apiOk, requireAuth } from "@/lib/api";
import { buildMockCallBreakdown } from "@/lib/mock-call";
import { Evaluation } from "@/models/Evaluation";
import { Candidate } from "@/models/Candidate";

type Params = { params: Promise<{ candidateId: string }> };

export async function GET(_request: NextRequest, { params }: Params) {
  const auth = await requireAuth(_request, ["ADMIN", "HR", "TRAINER"]);
  if (auth.error) return auth.error;

  const { candidateId } = await params;
  if (!Types.ObjectId.isValid(candidateId)) return apiError("Invalid candidate id", 422);

  await connectDb();

  const [candidate, evaluation] = await Promise.all([
    Candidate.findById(candidateId)
      .select("fullName evaluationStatus lifecycleStage finalScore batchId")
      .populate({ path: "batchId", select: "name" })
      .lean(),
    Evaluation.findOne({ candidateId }).lean(),
  ]);

  if (!candidate) return apiError("Candidate not found", 404);

  const batchName =
    candidate.batchId && typeof candidate.batchId === "object" && "name" in candidate.batchId
      ? (candidate.batchId as { name: string }).name
      : null;

  if (!evaluation) {
    return apiOk({
      candidate: {
        id: candidateId,
        fullName: candidate.fullName,
        evaluationStatus: candidate.evaluationStatus,
        lifecycleStage: candidate.lifecycleStage,
        batchName,
      },
      evaluation: null,
      canEvaluate:
        candidate.evaluationStatus === "NOT_EVALUATED" &&
        !!candidate.batchId &&
        ["TRAINING", "FINAL_MOCK_CALL"].includes(candidate.lifecycleStage),
    });
  }

  const scores = {
    communicationSkills: evaluation.communicationSkills,
    confidenceLevel: evaluation.confidenceLevel,
    productUnderstanding: evaluation.productUnderstanding,
    salesPitch: evaluation.salesPitch,
    objectionHandling: evaluation.objectionHandling,
  };

  return apiOk({
    candidate: {
      id: candidateId,
      fullName: candidate.fullName,
      evaluationStatus: candidate.evaluationStatus,
      lifecycleStage: candidate.lifecycleStage,
      finalScore: candidate.finalScore,
      batchName,
      eligibleForHiringDecision: candidate.lifecycleStage === "HIRING_DECISION",
    },
    evaluation: {
      id: evaluation._id.toString(),
      ...scores,
      finalScore: evaluation.finalScore,
      breakdown: buildMockCallBreakdown(scores),
      remarks: evaluation.remarks,
      evaluatorName: evaluation.evaluatorName,
      evaluatedAt: evaluation.evaluatedAt,
    },
    canEvaluate: false,
  });
}

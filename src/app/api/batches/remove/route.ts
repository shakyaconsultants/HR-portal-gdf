import { Types } from "mongoose";
import { NextRequest } from "next/server";
import { connectDb } from "@/lib/db";
import { apiError, apiOk, requireAuth } from "@/lib/api";
import { removeCandidateFromBatchSchema } from "@/lib/validators";
import { Candidate } from "@/models/Candidate";
import { Batch } from "@/models/Batch";
import { CandidateTimeline } from "@/models/CandidateTimeline";
import { recordBatchHistory } from "@/lib/batch-history";

export async function POST(request: NextRequest) {
  const auth = await requireAuth(request, ["ADMIN", "HR", "TRAINER"]);
  if (auth.error || !auth.user) return auth.error;

  await connectDb();
  const body = await request.json();
  const parsed = removeCandidateFromBatchSchema.safeParse(body);
  if (!parsed.success) {
    return apiError(parsed.error.issues[0]?.message ?? "Invalid payload", 422);
  }

  const { candidateId, batchId, reason } = parsed.data;
  if (!Types.ObjectId.isValid(candidateId) || !Types.ObjectId.isValid(batchId)) {
    return apiError("Invalid ids", 422);
  }

  const [candidate, batch] = await Promise.all([
    Candidate.findById(candidateId).select("fullName batchId lifecycleStage"),
    Batch.findById(batchId).select("name"),
  ]);

  if (!candidate || !batch) return apiError("Candidate or batch not found", 404);
  if (!candidate.batchId || candidate.batchId.toString() !== batchId) {
    return apiError("Candidate is not assigned to this batch", 409);
  }

  await Candidate.updateOne(
    { _id: candidateId },
    {
      $set: {
        batchId: null,
        lifecycleStage: "BATCH_ASSIGNMENT",
        trainingStatus: "NOT_STARTED",
      },
    }
  );

  const removalReason = reason?.trim() || `Removed from batch ${batch.name}`;

  await Promise.all([
    CandidateTimeline.create({
      candidateId,
      action: "REMOVED_FROM_BATCH",
      actorRole: auth.user.role,
      actorName: auth.user.name,
      remarks: removalReason,
    }),
    recordBatchHistory({
      candidateId,
      action: "REMOVED",
      fromBatchId: batchId,
      reason: removalReason,
      performedBy: auth.user.userId,
      performedByName: auth.user.name,
      performedByRole: auth.user.role,
    }),
  ]);

  return apiOk({ removed: true });
}

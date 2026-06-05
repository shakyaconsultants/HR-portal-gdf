import { Types } from "mongoose";
import { NextRequest } from "next/server";
import { connectDb } from "@/lib/db";
import { apiError, apiOk, requireAuth } from "@/lib/api";
import { assignCandidateSchema, bulkAssignCandidateSchema } from "@/lib/validators";
import { BATCH_ASSIGNMENT_ELIGIBILITY_FILTER } from "@/lib/batch-eligibility";
import { getBatchSeatInfo } from "@/lib/batch-seats";
import { recordBatchHistory } from "@/lib/batch-history";
import { Candidate } from "@/models/Candidate";
import { Batch } from "@/models/Batch";
import { CandidateTimeline } from "@/models/CandidateTimeline";

async function assignCandidatesToBatch(params: {
  candidateIds: string[];
  batchId: string;
  actor: { userId: string; name: string; role: string };
}) {
  const { candidateIds, batchId, actor } = params;

  const batch = await Batch.findById(batchId).select("name capacity").lean();
  if (!batch) return { error: apiError("Batch not found", 404) };

  const validIds = candidateIds.filter((id) => Types.ObjectId.isValid(id));
  if (validIds.length === 0) return { error: apiError("No valid candidate ids", 422) };

  const eligible = await Candidate.countDocuments({
    _id: { $in: validIds },
    ...BATCH_ASSIGNMENT_ELIGIBILITY_FILTER,
  });
  if (eligible !== validIds.length) {
    return { error: apiError("All selected candidates must be verification-approved and unassigned.", 409) };
  }

  const seats = await getBatchSeatInfo(batchId, batch.capacity);
  if (validIds.length > seats.remainingSeats) {
    return {
      error: apiError(
        `Batch has only ${seats.remainingSeats} remaining seat(s). You selected ${validIds.length} candidate(s).`,
        409
      ),
    };
  }

  await Candidate.updateMany(
    { _id: { $in: validIds } },
    {
      $set: {
        batchId,
        lifecycleStage: "TRAINING",
        trainingStatus: "IN_PROGRESS",
      },
    }
  );

  await Promise.all([
    CandidateTimeline.insertMany(
      validIds.map((candidateId) => ({
        candidateId,
        action: "ASSIGNED_TO_BATCH",
        actorRole: actor.role,
        actorName: actor.name,
        remarks: `Assigned to batch ${batch.name}`,
      }))
    ),
    ...validIds.map((candidateId) =>
      recordBatchHistory({
        candidateId,
        action: "ASSIGNED",
        toBatchId: batchId,
        reason: `Assigned to ${batch.name}`,
        performedBy: actor.userId,
        performedByName: actor.name,
        performedByRole: actor.role,
      })
    ),
  ]);

  const updatedSeats = await getBatchSeatInfo(batchId, batch.capacity);
  return {
    data: {
      assigned: true,
      count: validIds.length,
      batchId,
      batchName: batch.name,
      assignedCount: updatedSeats.assignedCount,
      remainingSeats: updatedSeats.remainingSeats,
      capacity: updatedSeats.capacity,
    },
  };
}

export async function POST(request: NextRequest) {
  const auth = await requireAuth(request, ["ADMIN", "HR", "TRAINER"]);
  if (auth.error || !auth.user) return auth.error;

  await connectDb();
  const body = await request.json();

  const bulkParsed = bulkAssignCandidateSchema.safeParse(body);
  if (bulkParsed.success) {
    const result = await assignCandidatesToBatch({
      candidateIds: bulkParsed.data.candidateIds,
      batchId: bulkParsed.data.batchId,
      actor: auth.user,
    });
    if (result.error) return result.error;
    return apiOk(result.data);
  }

  const parsed = assignCandidateSchema.safeParse(body);
  if (!parsed.success) {
    return apiError(parsed.error.issues[0]?.message ?? "Invalid payload", 422);
  }

  const result = await assignCandidatesToBatch({
    candidateIds: [parsed.data.candidateId],
    batchId: parsed.data.batchId,
    actor: auth.user,
  });
  if (result.error) return result.error;
  return apiOk(result.data);
}

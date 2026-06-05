import { Types } from "mongoose";
import { NextRequest } from "next/server";
import { connectDb } from "@/lib/db";
import { apiError, apiOk, requireAuth } from "@/lib/api";
import { transferCandidateSchema, bulkTransferCandidateSchema } from "@/lib/validators";
import { getBatchSeatInfo } from "@/lib/batch-seats";
import { recordBatchHistory } from "@/lib/batch-history";
import { Candidate } from "@/models/Candidate";
import { Batch } from "@/models/Batch";
import { BatchTransfer } from "@/models/BatchTransfer";
import { CandidateTimeline } from "@/models/CandidateTimeline";

async function transferCandidates(params: {
  candidateIds: string[];
  fromBatchId: string;
  toBatchId: string;
  reason: string;
  actor: { userId: string; name: string; role: string };
}) {
  const { candidateIds, fromBatchId, toBatchId, reason, actor } = params;

  if (fromBatchId === toBatchId) {
    return { error: apiError("From and to batch cannot be the same.", 422) };
  }

  const validIds = candidateIds.filter((id) => Types.ObjectId.isValid(id));
  if (validIds.length === 0) return { error: apiError("No valid candidate ids", 422) };

  const [fromBatch, toBatch] = await Promise.all([
    Batch.findById(fromBatchId).select("name capacity").lean(),
    Batch.findById(toBatchId).select("name capacity").lean(),
  ]);
  if (!fromBatch || !toBatch) return { error: apiError("Batch not found", 404) };

  const assignedCount = await Candidate.countDocuments({
    _id: { $in: validIds },
    batchId: fromBatchId,
  });
  if (assignedCount !== validIds.length) {
    return { error: apiError("All selected candidates must belong to the source batch.", 409) };
  }

  const destSeats = await getBatchSeatInfo(toBatchId, toBatch.capacity);
  if (validIds.length > destSeats.remainingSeats) {
    return {
      error: apiError(
        `Destination batch has only ${destSeats.remainingSeats} remaining seat(s). You selected ${validIds.length} candidate(s).`,
        409
      ),
    };
  }

  await Candidate.updateMany(
    { _id: { $in: validIds } },
    {
      $set: {
        batchId: toBatchId,
        lifecycleStage: "TRAINING",
      },
    }
  );

  await Promise.all([
    BatchTransfer.insertMany(
      validIds.map((candidateId) => ({
        candidateId,
        fromBatchId,
        toBatchId,
        reason,
        transferredBy: actor.userId,
      }))
    ),
    CandidateTimeline.insertMany(
      validIds.map((candidateId) => ({
        candidateId,
        action: "BATCH_TRANSFERRED",
        actorRole: actor.role,
        actorName: actor.name,
        remarks: `${fromBatch.name} → ${toBatch.name}. Reason: ${reason}`,
      }))
    ),
    ...validIds.map((candidateId) =>
      recordBatchHistory({
        candidateId,
        action: "TRANSFERRED",
        fromBatchId,
        toBatchId,
        reason,
        performedBy: actor.userId,
        performedByName: actor.name,
        performedByRole: actor.role,
      })
    ),
  ]);

  const updatedSeats = await getBatchSeatInfo(toBatchId, toBatch.capacity);
  return {
    data: {
      transferred: true,
      count: validIds.length,
      fromBatchName: fromBatch.name,
      toBatchName: toBatch.name,
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

  const bulkParsed = bulkTransferCandidateSchema.safeParse(body);
  if (bulkParsed.success) {
    const result = await transferCandidates({
      candidateIds: bulkParsed.data.candidateIds,
      fromBatchId: bulkParsed.data.fromBatchId,
      toBatchId: bulkParsed.data.toBatchId,
      reason: bulkParsed.data.reason,
      actor: auth.user,
    });
    if (result.error) return result.error;
    return apiOk(result.data);
  }

  const parsed = transferCandidateSchema.safeParse(body);
  if (!parsed.success) {
    return apiError(parsed.error.issues[0]?.message ?? "Invalid payload", 422);
  }

  const result = await transferCandidates({
    candidateIds: [parsed.data.candidateId],
    fromBatchId: parsed.data.fromBatchId,
    toBatchId: parsed.data.toBatchId,
    reason: parsed.data.reason,
    actor: auth.user,
  });
  if (result.error) return result.error;
  return apiOk(result.data);
}

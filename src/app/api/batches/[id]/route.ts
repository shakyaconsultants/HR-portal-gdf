import { Types } from "mongoose";
import { NextRequest } from "next/server";
import { connectDb } from "@/lib/db";
import { apiError, apiOk, requireAuth } from "@/lib/api";
import { computeBatchStats } from "@/lib/batch-stats";
import { BATCH_ASSIGNMENT_ELIGIBILITY_FILTER } from "@/lib/batch-eligibility";
import { getBatchSeatInfo, getBatchSeatMap, resolveBatchCapacity } from "@/lib/batch-seats";
import { Batch } from "@/models/Batch";
import { Candidate } from "@/models/Candidate";

type Params = { params: Promise<{ id: string }> };

export async function GET(request: NextRequest, { params }: Params) {
  const auth = await requireAuth(request, ["ADMIN", "HR", "TRAINER"]);
  if (auth.error) return auth.error;

  const { id } = await params;
  if (!Types.ObjectId.isValid(id)) return apiError("Invalid batch id", 422);

  await connectDb();

  const batch = await Batch.findById(id).lean();
  if (!batch) return apiError("Batch not found", 404);

  const [candidates, otherBatches, eligibleCandidates, seats] = await Promise.all([
    Candidate.find({ batchId: id })
      .sort({ fullName: 1 })
      .select(
        "registrationId fullName email phone lifecycleStage trainingStatus evaluationStatus finalScore decision verificationStage updatedAt"
      )
      .lean(),
    Batch.find({ _id: { $ne: id } })
      .sort({ name: 1 })
      .select("name trainerName status capacity")
      .lean(),
    Candidate.find(BATCH_ASSIGNMENT_ELIGIBILITY_FILTER)
      .sort({ updatedAt: -1 })
      .limit(200)
      .select("registrationId fullName email lifecycleStage verificationStage")
      .lean(),
    getBatchSeatInfo(id, batch.capacity),
  ]);

  const otherSeatMap = await getBatchSeatMap(otherBatches.map((b) => b._id));

  const candidateRows = candidates.map((c) => ({
    id: c._id.toString(),
    registrationId: c.registrationId,
    fullName: c.fullName,
    email: c.email,
    phone: c.phone,
    lifecycleStage: c.lifecycleStage,
    status: c.lifecycleStage,
    trainingStatus: c.trainingStatus,
    evaluationStatus: c.evaluationStatus,
    finalScore: c.finalScore,
    decision: c.decision,
    updatedAt: c.updatedAt,
  }));

  return apiOk({
    batch: {
      id: batch._id.toString(),
      name: batch.name,
      trainerName: batch.trainerName,
      startDate: batch.startDate,
      endDate: batch.endDate,
      status: batch.status,
      capacity: seats.capacity,
      assignedCount: seats.assignedCount,
      remainingSeats: seats.remainingSeats,
      createdAt: batch.createdAt,
    },
    stats: computeBatchStats(candidateRows),
    candidates: candidateRows,
    otherBatches: otherBatches.map((b) => {
      const batchId = b._id.toString();
      const capacity = resolveBatchCapacity(b.capacity);
      const assignedCount = otherSeatMap.get(batchId) ?? 0;
      return {
        id: batchId,
        name: b.name,
        trainerName: b.trainerName,
        status: b.status,
        capacity,
        assignedCount,
        remainingSeats: Math.max(0, capacity - assignedCount),
      };
    }),
    eligibleForAssign: eligibleCandidates.map((c) => ({
      id: c._id.toString(),
      registrationId: c.registrationId,
      fullName: c.fullName,
      email: c.email,
      verificationStage: c.verificationStage,
    })),
  });
}

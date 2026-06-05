import { Types } from "mongoose";
import { Candidate } from "@/models/Candidate";

const DEFAULT_CAPACITY = 30;

export function resolveBatchCapacity(capacity: number | null | undefined) {
  return typeof capacity === "number" && capacity > 0 ? capacity : DEFAULT_CAPACITY;
}

export async function getBatchSeatInfo(batchId: string | Types.ObjectId, capacity: number | null | undefined) {
  const resolvedCapacity = resolveBatchCapacity(capacity);
  const assignedCount = await Candidate.countDocuments({ batchId });
  const remainingSeats = Math.max(0, resolvedCapacity - assignedCount);
  return { capacity: resolvedCapacity, assignedCount, remainingSeats };
}

export async function getBatchSeatMap(batchIds: Types.ObjectId[]) {
  if (batchIds.length === 0) return new Map<string, number>();

  const rows = await Candidate.aggregate<{ _id: Types.ObjectId; count: number }>([
    { $match: { batchId: { $in: batchIds } } },
    { $group: { _id: "$batchId", count: { $sum: 1 } } },
  ]);

  return new Map(rows.map((r) => [r._id.toString(), r.count]));
}

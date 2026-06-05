import { Types } from "mongoose";
import { NextRequest } from "next/server";
import { connectDb } from "@/lib/db";
import { apiError, apiOk, requireAuth } from "@/lib/api";
import { createBatchSchema } from "@/lib/validators";
import { emptyBatchStats } from "@/lib/batch-stats";
import { getBatchSeatMap, resolveBatchCapacity } from "@/lib/batch-seats";
import { Batch } from "@/models/Batch";
import { Candidate } from "@/models/Candidate";
import { BATCH_STATUSES } from "@/lib/constants";

export async function GET(request: NextRequest) {
  const auth = await requireAuth(request, ["ADMIN", "HR", "TRAINER"]);
  if (auth.error) {
    return auth.error;
  }

  await connectDb();
  const status = request.nextUrl.searchParams.get("status");
  const filter: { status?: (typeof BATCH_STATUSES)[number] } = {};
  if (status && BATCH_STATUSES.includes(status as (typeof BATCH_STATUSES)[number])) {
    filter.status = status as (typeof BATCH_STATUSES)[number];
  }

  const batches = await Batch.find(filter)
    .sort({ startDate: -1 })
    .select("name trainerName startDate endDate status capacity createdAt")
    .lean();

  const batchIds = batches.map((b) => b._id);
  const seatMap = await getBatchSeatMap(batchIds);
  const statsRows =
    batchIds.length > 0
      ? await Candidate.aggregate<{
          _id: Types.ObjectId;
          total: number;
          evaluated: number;
          selected: number;
          hold: number;
          rejected: number;
        }>([
          { $match: { batchId: { $in: batchIds } } },
          {
            $group: {
              _id: "$batchId",
              total: { $sum: 1 },
              evaluated: {
                $sum: {
                  $cond: [
                    {
                      $or: [
                        { $eq: ["$status", "EVALUATED"] },
                        { $eq: ["$evaluationStatus", "EVALUATED"] },
                        { $ne: ["$finalScore", null] },
                      ],
                    },
                    1,
                    0,
                  ],
                },
              },
              selected: { $sum: { $cond: [{ $eq: ["$decision", "SELECTED"] }, 1, 0] } },
              hold: { $sum: { $cond: [{ $eq: ["$decision", "HOLD"] }, 1, 0] } },
              rejected: { $sum: { $cond: [{ $eq: ["$decision", "REJECTED"] }, 1, 0] } },
            },
          },
        ])
      : [];

  const statsMap = new Map(statsRows.map((row) => [row._id.toString(), row]));

  return apiOk({
    items: batches.map((b) => {
      const id = b._id.toString();
      const stats = statsMap.get(id);
      const capacity = resolveBatchCapacity(b.capacity);
      const assignedCount = seatMap.get(id) ?? 0;
      return {
        id,
        name: b.name,
        trainerName: b.trainerName,
        startDate: b.startDate,
        endDate: b.endDate,
        status: b.status,
        capacity,
        assignedCount,
        remainingSeats: Math.max(0, capacity - assignedCount),
        createdAt: b.createdAt,
        stats: stats
          ? {
              total: stats.total,
              evaluated: stats.evaluated,
              selected: stats.selected,
              hold: stats.hold,
              rejected: stats.rejected,
            }
          : emptyBatchStats,
      };
    }),
  });
}

export async function POST(request: NextRequest) {
  const auth = await requireAuth(request, ["ADMIN", "HR", "TRAINER"]);
  if (auth.error) {
    return auth.error;
  }

  await connectDb();
  const body = await request.json();
  const parsed = createBatchSchema.safeParse(body);
  if (!parsed.success) {
    return apiError(parsed.error.issues[0]?.message ?? "Invalid payload", 422);
  }

  const batch = await Batch.create({
    ...parsed.data,
    startDate: new Date(parsed.data.startDate),
    endDate: new Date(parsed.data.endDate),
  });

  return apiOk(
    {
      id: batch._id.toString(),
      name: batch.name,
      trainerName: batch.trainerName,
      status: batch.status,
      capacity: batch.capacity,
      assignedCount: 0,
      remainingSeats: batch.capacity,
    },
    201
  );
}


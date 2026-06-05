import { Types } from "mongoose";
import { NextRequest } from "next/server";
import { connectDb } from "@/lib/db";
import { apiError, apiOk, requireAuth } from "@/lib/api";
import { DecisionRecord } from "@/models/DecisionRecord";

type Params = { params: Promise<{ candidateId: string }> };

export async function GET(request: NextRequest, { params }: Params) {
  const auth = await requireAuth(request, ["ADMIN", "HR"]);
  if (auth.error) return auth.error;

  const { candidateId } = await params;
  if (!Types.ObjectId.isValid(candidateId)) return apiError("Invalid candidate id", 422);

  await connectDb();

  const records = await DecisionRecord.find({ candidateId }).sort({ createdAt: -1 }).limit(50).lean();

  return apiOk({
    items: records.map((r) => ({
      id: r._id.toString(),
      previousDecision: r.previousDecision,
      decision: r.decision,
      remarks: r.remarks,
      reassignBatchId: r.reassignBatchId?.toString() ?? null,
      reassignBatchName: r.reassignBatchName,
      actorRole: r.actorRole,
      actorName: r.actorName,
      createdAt: r.createdAt,
    })),
  });
}

import { Types } from "mongoose";
import { NextRequest } from "next/server";
import { connectDb } from "@/lib/db";
import { apiError, apiOk, requireAuth } from "@/lib/api";
import { VerificationRecord } from "@/models/VerificationRecord";

type Params = { params: Promise<{ candidateId: string }> };

export async function GET(request: NextRequest, { params }: Params) {
  const auth = await requireAuth(request, ["ADMIN", "HR"]);
  if (auth.error) return auth.error;

  const { candidateId } = await params;
  if (!Types.ObjectId.isValid(candidateId)) {
    return apiError("Invalid candidate id", 422);
  }

  await connectDb();

  const records = await VerificationRecord.find({ candidateId })
    .sort({ createdAt: -1 })
    .limit(50)
    .lean();

  return apiOk({
    items: records.map((r) => ({
      id: r._id.toString(),
      previousStage: r.previousStage,
      stage: r.stage,
      action: r.action,
      remarks: r.remarks,
      actorRole: r.actorRole,
      actorName: r.actorName,
      createdAt: r.createdAt,
    })),
  });
}

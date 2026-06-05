import { Types } from "mongoose";
import { NextRequest } from "next/server";
import { connectDb } from "@/lib/db";
import { apiError, apiOk, requireAuth } from "@/lib/api";
import { Batch } from "@/models/Batch";
import { BatchHistory } from "@/models/BatchHistory";

type Params = { params: Promise<{ id: string }> };

type PopulatedCandidate = { _id: Types.ObjectId; fullName: string; registrationId?: string | null };
type PopulatedBatch = { _id: Types.ObjectId; name: string };

function isPopulatedCandidate(value: unknown): value is PopulatedCandidate {
  return typeof value === "object" && value !== null && "_id" in value && "fullName" in value;
}

function isPopulatedBatch(value: unknown): value is PopulatedBatch {
  return typeof value === "object" && value !== null && "name" in value;
}

function batchName(value: unknown) {
  return isPopulatedBatch(value) ? value.name : "Unknown batch";
}

function candidateLabel(value: unknown) {
  if (!isPopulatedCandidate(value)) return "Unknown candidate";
  return value.registrationId ? `${value.fullName} (${value.registrationId})` : value.fullName;
}

function candidateIdString(value: unknown) {
  if (isPopulatedCandidate(value)) return value._id.toString();
  return String(value);
}

export async function GET(request: NextRequest, { params }: Params) {
  const auth = await requireAuth(request, ["ADMIN", "HR", "TRAINER"]);
  if (auth.error) return auth.error;

  const { id } = await params;
  if (!Types.ObjectId.isValid(id)) return apiError("Invalid batch id", 422);

  await connectDb();
  const batch = await Batch.findById(id).select("name").lean();
  if (!batch) return apiError("Batch not found", 404);

  const limit = Math.min(Number(request.nextUrl.searchParams.get("limit") ?? 50), 100);

  const records = await BatchHistory.find({
    $or: [{ toBatchId: id }, { fromBatchId: id }],
  })
    .sort({ createdAt: -1 })
    .limit(limit)
    .populate({ path: "candidateId", select: "fullName registrationId" })
    .populate({ path: "fromBatchId", select: "name" })
    .populate({ path: "toBatchId", select: "name" })
    .lean();

  return apiOk({
    batchId: id,
    batchName: batch.name,
    items: records.map((r) => ({
      id: r._id.toString(),
      action: r.action,
      candidateId: candidateIdString(r.candidateId),
      candidateName: candidateLabel(r.candidateId),
      fromBatchId: r.fromBatchId ? String(r.fromBatchId) : null,
      fromBatchName: r.fromBatchId ? batchName(r.fromBatchId) : null,
      toBatchId: r.toBatchId ? String(r.toBatchId) : null,
      toBatchName: r.toBatchId ? batchName(r.toBatchId) : null,
      reason: r.reason,
      performedByName: r.performedByName,
      performedByRole: r.performedByRole,
      createdAt: r.createdAt,
    })),
  });
}

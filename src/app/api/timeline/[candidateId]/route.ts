import { Types } from "mongoose";
import { NextRequest } from "next/server";
import { connectDb } from "@/lib/db";
import { apiError, apiOk, requireAuth } from "@/lib/api";
import { CandidateTimeline } from "@/models/CandidateTimeline";

type Params = { params: Promise<{ candidateId: string }> };

export async function GET(request: NextRequest, { params }: Params) {
  const auth = await requireAuth(request, ["ADMIN", "HR", "TRAINER"]);
  if (auth.error) {
    return auth.error;
  }

  const { candidateId } = await params;
  if (!Types.ObjectId.isValid(candidateId)) {
    return apiError("Invalid candidate id", 422);
  }

  await connectDb();
  const timeline = await CandidateTimeline.find({ candidateId })
    .sort({ createdAt: -1 })
    .select("action remarks actorRole actorName createdAt")
    .limit(200)
    .lean();

  return apiOk({
    items: timeline.map((item) => ({
      id: item._id.toString(),
      action: item.action,
      remarks: item.remarks,
      actorRole: item.actorRole,
      actorName: item.actorName,
      createdAt: item.createdAt,
    })),
  });
}

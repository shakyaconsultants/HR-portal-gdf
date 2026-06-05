import { Types } from "mongoose";
import { NextRequest } from "next/server";
import { connectDb } from "@/lib/db";
import { apiOk, requireAuth } from "@/lib/api";
import { buildOnboardingLinks, computeOnboardingProgress } from "@/lib/onboarding";
import { Onboarding } from "@/models/Onboarding";

export async function GET(request: NextRequest) {
  const auth = await requireAuth(request, ["ADMIN", "HR"]);
  if (auth.error) return auth.error;

  await connectDb();
  const candidateId = request.nextUrl.searchParams.get("candidateId");
  const filter: Record<string, unknown> = {};
  if (candidateId && Types.ObjectId.isValid(candidateId)) {
    filter.candidateId = candidateId;
  }
  const items = await Onboarding.find(filter).sort({ updatedAt: -1 }).limit(200).lean();
  return apiOk({
    items: items.map((item) => ({
      id: item._id.toString(),
      candidateId: item.candidateId.toString(),
      status: item.status,
      progress: computeOnboardingProgress(item),
      links: item.accessToken ? buildOnboardingLinks(item.accessToken) : null,
      updatedAt: item.updatedAt,
    })),
  });
}

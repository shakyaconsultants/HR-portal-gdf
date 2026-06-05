import { Types } from "mongoose";
import { NextRequest } from "next/server";
import { connectDb } from "@/lib/db";
import { apiError, apiOk, requireAuth } from "@/lib/api";
import { ensureOnboardingInvite } from "@/lib/onboarding-server";
import { Candidate } from "@/models/Candidate";

export async function POST(request: NextRequest) {
  const auth = await requireAuth(request, ["ADMIN", "HR"]);
  if (auth.error || !auth.user) return auth.error;

  await connectDb();
  const body = await request.json();
  const candidateId = String(body.candidateId ?? "");
  if (!Types.ObjectId.isValid(candidateId)) return apiError("Invalid candidate id", 422);

  const candidate = await Candidate.findById(candidateId).select("decision fullName").lean();
  if (!candidate) return apiError("Candidate not found", 404);
  if (candidate.decision !== "SELECTED") {
    return apiError("Onboarding links can only be generated for selected candidates.", 403);
  }

  const regenerate = Boolean(body.regenerate);

  const result = await ensureOnboardingInvite(
    candidateId,
    {
      userId: auth.user.userId,
      name: auth.user.name,
      role: auth.user.role,
    },
    { regenerate, skipEmail: true }
  );

  if (!result) return apiError("Unable to generate onboarding links", 500);

  return apiOk({
    candidateId,
    links: result.links,
    created: result.created,
  });
}

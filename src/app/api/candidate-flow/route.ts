import { NextRequest } from "next/server";
import { connectDb } from "@/lib/db";
import { apiError, apiOk, requireAuth } from "@/lib/api";
import { LIFECYCLE_PIPELINE, lifecycleStageIndex } from "@/lib/lifecycle";
import { Candidate } from "@/models/Candidate";

export async function GET(request: NextRequest) {
  const auth = await requireAuth(request, ["ADMIN", "HR", "TRAINER"]);
  if (auth.error) return auth.error;

  await connectDb();
  const candidateId = request.nextUrl.searchParams.get("candidateId");
  if (!candidateId) return apiError("candidateId is required", 422);

  const candidate = await Candidate.findById(candidateId)
    .select("fullName lifecycleStage verificationStage batchId finalScore decision")
    .populate({ path: "batchId", select: "name" })
    .lean();
  if (!candidate) return apiError("Candidate not found", 404);

  const currentIndex = lifecycleStageIndex(candidate.lifecycleStage);

  const steps = LIFECYCLE_PIPELINE.map((meta) => ({
    key: meta.stage,
    label: meta.label,
    slug: meta.slug,
    href: meta.href,
    done: lifecycleStageIndex(meta.stage) < currentIndex,
    current: meta.stage === candidate.lifecycleStage,
  }));

  return apiOk({
    candidate: {
      id: candidate._id.toString(),
      fullName: candidate.fullName,
      lifecycleStage: candidate.lifecycleStage,
      status: candidate.lifecycleStage,
      verificationStage: candidate.verificationStage,
      batchName:
        candidate.batchId && typeof candidate.batchId === "object" && "name" in candidate.batchId
          ? (candidate.batchId as { name?: string }).name ?? null
          : null,
      finalScore: candidate.finalScore,
      decision: candidate.decision,
    },
    steps,
    currentStageIndex: currentIndex,
  });
}

import { Types } from "mongoose";
import { NextRequest } from "next/server";
import { connectDb } from "@/lib/db";
import { apiError, apiOk, requireAuth } from "@/lib/api";
import { candidateListFilterSchema } from "@/lib/validators";
import type { CandidateListFilterInput } from "@/lib/validators";
import {
  applyLifecycleSlugFilter,
  applyLifecycleStageFilter,
  getLifecycleMetaBySlug,
  type LifecycleStage,
  type LifecycleStageSlug,
} from "@/lib/lifecycle";
import { CANDIDATE_REGISTRY_FILTER } from "@/lib/candidate-scope";
import { Candidate } from "@/models/Candidate";

type PopulatedBatchLean = {
  _id: Types.ObjectId;
  name: string;
  trainerName: string;
  status: string;
};

function isPopulatedBatch(batchId: unknown): batchId is PopulatedBatchLean {
  return (
    typeof batchId === "object" &&
    batchId !== null &&
    "name" in batchId &&
    typeof (batchId as PopulatedBatchLean).name === "string"
  );
}

function buildCandidateFilter(parsed: CandidateListFilterInput): Record<string, unknown> {
  const filter: Record<string, unknown> = { ...CANDIDATE_REGISTRY_FILTER };
  const slug = (parsed.lifecycleSlug ?? parsed.workflowStage) as LifecycleStageSlug | undefined;

  if (parsed.lifecycleStage) {
    applyLifecycleStageFilter(filter, parsed.lifecycleStage as LifecycleStage, parsed.tab);
  } else if (slug) {
    applyLifecycleSlugFilter(filter, slug, parsed.tab);
  } else {
    if (parsed.decision) filter.decision = parsed.decision;
    if (parsed.unassigned === "true") filter.batchId = null;
    else if (parsed.batchId && Types.ObjectId.isValid(parsed.batchId)) {
      filter.batchId = new Types.ObjectId(parsed.batchId);
    }
  }

  if (parsed.verificationStage) {
    filter.verificationStage = parsed.verificationStage;
  }
  if (parsed.search?.trim()) {
    const term = parsed.search.trim();
    filter.$or = [
      { fullName: { $regex: term, $options: "i" } },
      { email: { $regex: term, $options: "i" } },
      { phone: { $regex: term, $options: "i" } },
      { registrationId: { $regex: term, $options: "i" } },
      { city: { $regex: term, $options: "i" } },
    ];
  }
  return filter;
}

export async function GET(request: NextRequest) {
  const auth = await requireAuth(request, ["ADMIN", "HR", "TRAINER"]);
  if (auth.error) {
    return auth.error;
  }

  await connectDb();
  const query = Object.fromEntries(request.nextUrl.searchParams.entries());
  const parsed = candidateListFilterSchema.safeParse(query);
  if (!parsed.success) {
    return apiError(parsed.error.issues[0]?.message ?? "Invalid query", 422);
  }

  const { page, pageSize } = parsed.data;
  const filter = buildCandidateFilter(parsed.data);
  const skip = (page - 1) * pageSize;

  const [items, total] = await Promise.all([
    Candidate.find(filter)
      .populate({ path: "batchId", select: "name trainerName status" })
      .sort({ updatedAt: -1 })
      .skip(skip)
      .limit(pageSize)
      .select(
        "registrationId fullName email phone city state education experienceYears preferredRole lifecycleStage verificationStage verificationRejected batchId trainingStatus evaluationStatus finalScore decision salarySlab proposedCtc finalCtc updatedAt createdAt"
      )
      .lean(),
    Candidate.countDocuments(filter),
  ]);

  const slug = (parsed.data.lifecycleSlug ?? parsed.data.workflowStage) as LifecycleStageSlug | undefined;
  const stageMeta = slug ? getLifecycleMetaBySlug(slug) : null;

  return apiOk({
    items: items.map((item) => {
      const batch = isPopulatedBatch(item.batchId)
        ? {
            id: item.batchId._id.toString(),
            name: item.batchId.name,
            trainerName: item.batchId.trainerName,
            status: item.batchId.status,
          }
        : null;
      return {
        id: item._id.toString(),
        registrationId: item.registrationId,
        fullName: item.fullName,
        email: item.email,
        phone: item.phone,
        city: item.city,
        state: item.state,
        education: item.education,
        experienceYears: item.experienceYears,
        preferredRole: item.preferredRole,
        lifecycleStage: item.lifecycleStage,
        status: item.lifecycleStage,
        verificationStage: item.verificationStage,
        verificationRejected: item.verificationRejected,
        batchId: batch?.id ?? null,
        batch,
        trainingStatus: item.trainingStatus,
        evaluationStatus: item.evaluationStatus,
        finalScore: item.finalScore,
        decision: item.decision,
        salarySlab: item.salarySlab,
        proposedCtc: item.proposedCtc,
        finalCtc: item.finalCtc,
        updatedAt: item.updatedAt,
        createdAt: item.createdAt,
      };
    }),
    total,
    page,
    pageSize,
    totalPages: Math.ceil(total / pageSize),
    stage: stageMeta,
  });
}

export async function POST() {
  return apiError(
    "Manual registration is disabled. Create a lead from the Leads queue or use the public application form at /apply.",
    403
  );
}

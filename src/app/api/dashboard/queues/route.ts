import { NextRequest } from "next/server";
import { connectDb } from "@/lib/db";
import { apiOk, requireAuth } from "@/lib/api";
import { CANDIDATE_REGISTRY_FILTER, POST_REGISTRATION_LIFECYCLE_STAGES } from "@/lib/candidate-scope";
import { Candidate } from "@/models/Candidate";
import { Lead } from "@/models/Lead";

const QUEUE_STAGES = [
  "REGISTRATION_SUBMITTED",
  "VERIFICATION",
  "BATCH_ASSIGNMENT",
  "FINAL_MOCK_CALL",
  "HIRING_DECISION",
  "OFFER_LETTER",
] as const;

export async function GET(request: NextRequest) {
  const auth = await requireAuth(request, ["ADMIN", "HR", "TRAINER"]);
  if (auth.error) return auth.error;

  await connectDb();

  const queuePromises = QUEUE_STAGES.map(async (stage) => {
    const filter: Record<string, unknown> = { ...CANDIDATE_REGISTRY_FILTER };
    if (stage !== "REGISTRATION_SUBMITTED") {
      filter.lifecycleStage = stage;
    }
    if (stage === "VERIFICATION") {
      filter.lifecycleStage = { $in: ["REGISTRATION_SUBMITTED", "VERIFICATION"] };
      filter.verificationRejected = { $ne: true };
      filter.verificationStage = { $ne: "FINAL_APPROVED" };
    }
    if (stage === "BATCH_ASSIGNMENT") {
      filter.batchId = null;
      filter.verificationStage = "FINAL_APPROVED";
    }
    if (stage === "FINAL_MOCK_CALL") {
      filter.evaluationStatus = "NOT_EVALUATED";
    }
    if (stage === "HIRING_DECISION") {
      filter.$or = [{ decision: null }, { decision: { $exists: false } }];
    }

    const items = await Candidate.find(filter)
      .sort({ updatedAt: -1 })
      .limit(8)
      .select("registrationId fullName lifecycleStage verificationStage finalScore updatedAt createdAt")
      .lean();

    return {
      stage,
      items: items.map((c) => ({
        id: c._id.toString(),
        registrationId: c.registrationId,
        fullName: c.fullName,
        lifecycleStage: c.lifecycleStage,
        status: c.lifecycleStage,
        verificationStage: c.verificationStage,
        finalScore: c.finalScore,
        updatedAt: c.updatedAt ?? c.createdAt,
      })),
    };
  });

  const [queues, recentCandidates, recentLeads, stageTotals] = await Promise.all([
    Promise.all(queuePromises),
    Candidate.find(CANDIDATE_REGISTRY_FILTER)
      .sort({ updatedAt: -1 })
      .limit(8)
      .select("registrationId fullName lifecycleStage updatedAt createdAt")
      .lean(),
    Lead.find({ convertedAt: null })
      .sort({ updatedAt: -1 })
      .limit(8)
      .select("fullName email leadStatus updatedAt createdAt")
      .lean(),
    Promise.all(
      POST_REGISTRATION_LIFECYCLE_STAGES.map((s) =>
        Candidate.countDocuments({ ...CANDIDATE_REGISTRY_FILTER, lifecycleStage: s })
      )
    ),
  ]);

  const lifecycleTotals = Object.fromEntries(
    POST_REGISTRATION_LIFECYCLE_STAGES.map((stage, i) => [stage, stageTotals[i]])
  );

  return apiOk({
    queues: Object.fromEntries(queues.map((q) => [q.stage, q.items])),
    recentCandidates: recentCandidates.map((c) => ({
      id: c._id.toString(),
      registrationId: c.registrationId,
      fullName: c.fullName,
      lifecycleStage: c.lifecycleStage,
      status: c.lifecycleStage,
      updatedAt: c.updatedAt ?? c.createdAt,
    })),
    recentLeads: recentLeads.map((l) => ({
      id: l._id.toString(),
      fullName: l.fullName,
      email: l.email,
      leadStatus: l.leadStatus,
      status: l.leadStatus,
      updatedAt: l.updatedAt ?? l.createdAt,
    })),
    lifecycleTotals,
  });
}

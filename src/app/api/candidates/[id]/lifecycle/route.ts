import { Types } from "mongoose";
import { NextRequest } from "next/server";
import { connectDb } from "@/lib/db";
import { apiError, apiOk, requireAuth } from "@/lib/api";
import { advanceLifecycleSchema } from "@/lib/validators";
import { assertCanSetLifecycleStage } from "@/lib/communication-prerequisites";
import { getNextLifecycleStage, LIFECYCLE_STAGES, type LifecycleStage } from "@/lib/lifecycle";
import { Candidate } from "@/models/Candidate";
import { CandidateTimeline } from "@/models/CandidateTimeline";

type Params = { params: Promise<{ id: string }> };

const EARLY_STAGES: LifecycleStage[] = [
  "LEAD",
  "INTERVIEW_SCHEDULED",
  "INTERVIEW_COMPLETED",
  "INTERVIEW_SELECTED",
  "LETTER_OF_INTENT_SENT",
];

export async function PATCH(request: NextRequest, { params }: Params) {
  const auth = await requireAuth(request, ["ADMIN", "HR"]);
  if (auth.error || !auth.user) return auth.error;

  const { id } = await params;
  if (!Types.ObjectId.isValid(id)) return apiError("Invalid candidate id", 422);

  await connectDb();
  const body = await request.json();
  const parsed = advanceLifecycleSchema.safeParse(body);
  if (!parsed.success) {
    return apiError(parsed.error.issues[0]?.message ?? "Invalid payload", 422);
  }

  const candidate = await Candidate.findById(id).select("fullName lifecycleStage").lean();
  if (!candidate) return apiError("Candidate not found", 404);

  const current = candidate.lifecycleStage as LifecycleStage;

  if (parsed.data.action === "advance") {
    if (!EARLY_STAGES.includes(current) && current !== "TRAINING") {
      return apiError("Use the dedicated workflow action for this lifecycle stage.", 409);
    }

    let next = getNextLifecycleStage(current);
    if (current === "TRAINING") {
      next = "FINAL_MOCK_CALL";
    }
    if (!next) return apiError("Already at the final lifecycle stage.", 409);

    const updated = await Candidate.findByIdAndUpdate(
      id,
      { $set: { lifecycleStage: next } },
      { new: true }
    )
      .select("fullName lifecycleStage")
      .lean();

    await CandidateTimeline.create({
      candidateId: id,
      action: "LIFECYCLE_ADVANCED",
      actorRole: auth.user.role,
      actorName: auth.user.name,
      remarks:
        parsed.data.remarks?.trim() ||
        `Advanced from ${current} to ${next}`,
    });

    return apiOk({
      id,
      fullName: updated!.fullName,
      lifecycleStage: updated!.lifecycleStage,
      previousStage: current,
    });
  }

  if (parsed.data.action === "set_stage") {
    if (auth.user.role !== "ADMIN") {
      return apiError("Only administrators can manually set lifecycle stage.", 403);
    }

    const nextStage = parsed.data.lifecycleStage as LifecycleStage;
    if (!LIFECYCLE_STAGES.includes(nextStage)) {
      return apiError("Invalid lifecycle stage.", 422);
    }

    const stageGate = await assertCanSetLifecycleStage(id, current, nextStage);
    if (!stageGate.ok) return apiError(stageGate.message, 409);

    const updated = await Candidate.findByIdAndUpdate(
      id,
      { $set: { lifecycleStage: nextStage } },
      { new: true }
    )
      .select("fullName lifecycleStage")
      .lean();

    await CandidateTimeline.create({
      candidateId: id,
      action: "LIFECYCLE_STAGE_SET",
      actorRole: auth.user.role,
      actorName: auth.user.name,
      remarks:
        parsed.data.remarks?.trim() ||
        `Stage manually set from ${current} to ${nextStage}`,
    });

    return apiOk({
      id,
      fullName: updated!.fullName,
      lifecycleStage: updated!.lifecycleStage,
      previousStage: current,
    });
  }

  return apiError("Unsupported lifecycle action.", 422);
}

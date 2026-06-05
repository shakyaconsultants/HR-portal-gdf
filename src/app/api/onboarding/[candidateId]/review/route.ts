import { Types } from "mongoose";
import { NextRequest } from "next/server";
import { connectDb } from "@/lib/db";
import { apiError, apiOk, requireAuth } from "@/lib/api";
import { assertCanSetLifecycleStage } from "@/lib/communication-prerequisites";
import { onboardingReviewSchema } from "@/lib/validators";
import type { OnboardingSection } from "@/lib/constants";
import {
  computeOnboardingProgress,
  deriveOnboardingStatus,
  getSectionStatus,
  sectionAwaitingReview,
} from "@/lib/onboarding";
import { Onboarding } from "@/models/Onboarding";
import { OnboardingReviewRecord } from "@/models/OnboardingReviewRecord";
import { Candidate } from "@/models/Candidate";
import { CandidateTimeline } from "@/models/CandidateTimeline";

type Params = { params: Promise<{ candidateId: string }> };

function sectionKeys(section: OnboardingSection) {
  switch (section) {
    case "JOINING_FORM":
      return { statusKey: "joiningFormStatus" as const, correctionsKey: "joiningFormCorrections" as const };
    case "ID_CARD":
      return { statusKey: "idCardInfoStatus" as const, correctionsKey: "idCardInfoCorrections" as const };
  }
}

export async function PATCH(request: NextRequest, { params }: Params) {
  const auth = await requireAuth(request, ["ADMIN", "HR"]);
  if (auth.error || !auth.user) return auth.error;

  const { candidateId } = await params;
  if (!Types.ObjectId.isValid(candidateId)) return apiError("Invalid candidate id", 422);

  await connectDb();
  const body = await request.json();
  const parsed = onboardingReviewSchema.safeParse(body);
  if (!parsed.success) {
    return apiError(parsed.error.issues[0]?.message ?? "Invalid payload", 422);
  }

  const candidate = await Candidate.findById(candidateId).select("decision fullName").lean();
  if (!candidate) return apiError("Candidate not found", 404);
  if (candidate.decision !== "SELECTED") {
    return apiError("Onboarding review is only for selected candidates.", 403);
  }

  const onboarding = await Onboarding.findOne({ candidateId });
  if (!onboarding) return apiError("Onboarding record not found. Generate links first.", 404);

  const { section, action, remarks } = parsed.data;
  const keys = sectionKeys(section);
  const previousStatus = getSectionStatus(onboarding, section);

  if (!sectionAwaitingReview(previousStatus)) {
    return apiError("Only forms under review can be approved or sent back for corrections.", 409);
  }

  const newStatus = action === "approve" ? "APPROVED" : "CORRECTIONS_REQUESTED";
  onboarding.set(keys.statusKey, newStatus);
  if (action === "request_corrections") {
    onboarding.set(keys.correctionsKey, remarks);
  } else {
    onboarding.set(keys.correctionsKey, "");
  }
  onboarding.status = deriveOnboardingStatus(onboarding);
  onboarding.updatedBy = new Types.ObjectId(auth.user.userId);
  await onboarding.save();

  const progress = computeOnboardingProgress(onboarding);
  let lifecycleStage = onboarding.status === "COMPLETED" ? "EMPLOYEE" : "JOINING_INSTRUCTIONS";
  if (lifecycleStage === "EMPLOYEE") {
    const stageGate = await assertCanSetLifecycleStage(candidateId, "JOINING_INSTRUCTIONS", "EMPLOYEE");
    if (!stageGate.ok) lifecycleStage = "JOINING_INSTRUCTIONS";
  }

  await Promise.all([
    Candidate.updateOne({ _id: candidateId }, { $set: { lifecycleStage } }),
    OnboardingReviewRecord.create({
      candidateId,
      section,
      action: action === "approve" ? "APPROVE" : "REQUEST_CORRECTIONS",
      previousStatus,
      newStatus,
      remarks,
      actorRole: auth.user.role,
      actorName: auth.user.name,
    }),
    CandidateTimeline.create({
      candidateId,
      action: action === "approve" ? "ONBOARDING_SECTION_APPROVED" : "ONBOARDING_CORRECTIONS_REQUESTED",
      actorRole: auth.user.role,
      actorName: auth.user.name,
      remarks: `${section}: ${remarks}`,
    }),
  ]);

  return apiOk({
    section,
    status: newStatus,
    progress,
    onboardingStatus: onboarding.status,
    lifecycleStage,
    candidateStatus: lifecycleStage,
  });
}

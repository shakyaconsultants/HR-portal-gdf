import { NextRequest } from "next/server";
import { connectDb } from "@/lib/db";
import { apiError, apiOk } from "@/lib/api";
import { assertCanSetLifecycleStage, assertOnboardingAccess } from "@/lib/communication-prerequisites";
import { publicOnboardingSubmitSchema } from "@/lib/validators";
import { buildCandidateUpdateFromOnboarding } from "@/lib/candidate-profile-update";
import {
  computeOnboardingProgress,
  deriveOnboardingStatus,
  getSectionStatus,
  isOnboardingTokenExpired,
  sectionAwaitingReview,
  sectionCanEdit,
} from "@/lib/onboarding";
import type { OnboardingSection } from "@/lib/constants";
import { Onboarding } from "@/models/Onboarding";
import { Candidate } from "@/models/Candidate";
import { CandidateTimeline } from "@/models/CandidateTimeline";
import { OnboardingReviewRecord } from "@/models/OnboardingReviewRecord";

type Params = { params: Promise<{ token: string }> };

function sectionFieldMap(section: OnboardingSection) {
  switch (section) {
    case "JOINING_FORM":
      return {
        statusKey: "joiningFormStatus" as const,
        correctionsKey: "joiningFormCorrections" as const,
        submittedKey: "joiningFormSubmittedAt" as const,
      };
    case "ID_CARD":
      return {
        statusKey: "idCardInfoStatus" as const,
        correctionsKey: "idCardInfoCorrections" as const,
        submittedKey: "idCardInfoSubmittedAt" as const,
      };
  }
}

export async function POST(request: NextRequest, { params }: Params) {
  const { token } = await params;
  if (!token || token.length < 16) return apiError("Invalid onboarding link", 422);

  await connectDb();
  const body = await request.json();
  const parsed = publicOnboardingSubmitSchema.safeParse(body);
  if (!parsed.success) {
    return apiError(parsed.error.issues[0]?.message ?? "Invalid form data", 422);
  }

  const onboarding = await Onboarding.findOne({ accessToken: token });
  if (!onboarding) return apiError("Onboarding link not found", 404);
  if (isOnboardingTokenExpired(onboarding.tokenGeneratedAt)) {
    return apiError("This onboarding link has expired. Please contact HR for a new link.", 410);
  }

  const candidate = await Candidate.findById(onboarding.candidateId).select("decision fullName").lean();
  if (!candidate || candidate.decision !== "SELECTED") {
    return apiError("This onboarding link is no longer active.", 403);
  }

  const access = await assertOnboardingAccess(String(onboarding.candidateId));
  if (!access.ok) return apiError(access.message, 403);

  const { section, data } = parsed.data;
  const fields = sectionFieldMap(section);
  const currentStatus = getSectionStatus(onboarding, section);

  if (sectionAwaitingReview(currentStatus)) {
    return apiError("This form is awaiting HR review. You cannot edit it yet.", 409);
  }
  if (currentStatus === "APPROVED") {
    return apiError("This form has already been approved.", 409);
  }
  if (!sectionCanEdit(currentStatus)) {
    return apiError("This form cannot be edited in its current state.", 409);
  }

  const candidateUpdate = buildCandidateUpdateFromOnboarding(section, data as Record<string, string>);

  onboarding.set(fields.statusKey, "UNDER_REVIEW");
  onboarding.set(fields.correctionsKey, "");
  onboarding.set(fields.submittedKey, new Date());
  onboarding.status = deriveOnboardingStatus(onboarding);
  await onboarding.save();

  let lifecycleStage = onboarding.status === "COMPLETED" ? "EMPLOYEE" : "JOINING_INSTRUCTIONS";
  if (lifecycleStage === "EMPLOYEE") {
    const stageGate = await assertCanSetLifecycleStage(
      String(onboarding.candidateId),
      "JOINING_INSTRUCTIONS",
      "EMPLOYEE"
    );
    if (!stageGate.ok) lifecycleStage = "JOINING_INSTRUCTIONS";
  }

  await Promise.all([
    Candidate.updateOne({ _id: onboarding.candidateId }, { $set: { ...candidateUpdate, lifecycleStage } }),
    OnboardingReviewRecord.create({
      candidateId: onboarding.candidateId,
      section,
      action: "SUBMIT",
      previousStatus: currentStatus,
      newStatus: "UNDER_REVIEW",
      remarks: `${section} form submitted by candidate`,
      actorRole: "CANDIDATE",
      actorName: candidate.fullName,
    }),
    CandidateTimeline.create({
      candidateId: onboarding.candidateId,
      action: "ONBOARDING_FORM_SUBMITTED",
      actorRole: "CANDIDATE",
      actorName: candidate.fullName,
      remarks: `${section} submitted for HR review`,
    }),
  ]);

  const progress = computeOnboardingProgress(onboarding);

  return apiOk({
    section,
    status: "UNDER_REVIEW",
    progress,
    onboardingStatus: onboarding.status,
  });
}

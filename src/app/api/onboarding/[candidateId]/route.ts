import { Types } from "mongoose";
import { NextRequest } from "next/server";
import { connectDb } from "@/lib/db";
import { apiError, apiOk, requireAuth } from "@/lib/api";
import {
  buildOnboardingLinks,
  computeOnboardingProgress,
  formatOnboardingExpiryDate,
  isOnboardingTokenExpired,
  sectionFillLabel,
  sectionLabel,
} from "@/lib/onboarding";
import { ONBOARDING_SECTIONS } from "@/lib/constants";
import { Onboarding } from "@/models/Onboarding";
import { OnboardingReviewRecord } from "@/models/OnboardingReviewRecord";
import { Candidate } from "@/models/Candidate";

type Params = { params: Promise<{ candidateId: string }> };

export async function GET(request: NextRequest, { params }: Params) {
  const auth = await requireAuth(request, ["ADMIN", "HR"]);
  if (auth.error) return auth.error;

  const { candidateId } = await params;
  if (!Types.ObjectId.isValid(candidateId)) return apiError("Invalid candidate id", 422);

  await connectDb();

  const candidate = await Candidate.findById(candidateId)
    .select("fullName email registrationId decision lifecycleStage")
    .lean();
  if (!candidate) return apiError("Candidate not found", 404);
  if (candidate.decision !== "SELECTED") {
    return apiError("Onboarding is only available for selected candidates.", 403);
  }

  const onboarding = await Onboarding.findOne({ candidateId }).lean();
  const history = await OnboardingReviewRecord.find({ candidateId })
    .sort({ createdAt: -1 })
    .limit(50)
    .lean();

  const progress = onboarding
    ? computeOnboardingProgress(onboarding)
    : {
        submittedCount: 0,
        approvedCount: 0,
        totalSections: ONBOARDING_SECTIONS.length,
        submissionPercent: 0,
        approvalPercent: 0,
        completionPercent: 0,
      };

  function sectionPayload(section: (typeof ONBOARDING_SECTIONS)[number]) {
    if (!onboarding) {
      return { section, label: sectionLabel(section), fillStatus: "NOT_FILLED" as const, submittedAt: null };
    }
    const submittedAt =
      section === "JOINING_FORM" ? onboarding.joiningFormSubmittedAt : onboarding.idCardInfoSubmittedAt;

    return {
      section,
      label: sectionLabel(section),
      fillStatus: sectionFillLabel(onboarding, section),
      submittedAt,
    };
  }

  return apiOk({
    candidate: {
      id: candidateId,
      fullName: candidate.fullName,
      email: candidate.email,
      registrationId: candidate.registrationId,
      lifecycleStage: candidate.lifecycleStage,
      status: candidate.lifecycleStage,
    },
    onboarding: onboarding
      ? {
          id: onboarding._id.toString(),
          status: onboarding.status,
          links: onboarding.accessToken ? buildOnboardingLinks(onboarding.accessToken) : null,
          tokenGeneratedAt: onboarding.tokenGeneratedAt,
          tokenExpiresAt: formatOnboardingExpiryDate(onboarding.tokenGeneratedAt),
          tokenExpired: isOnboardingTokenExpired(onboarding.tokenGeneratedAt),
        }
      : null,
    progress,
    sections: ONBOARDING_SECTIONS.map(sectionPayload),
    history: history.map((h) => ({
      id: h._id.toString(),
      section: h.section,
      action: h.action,
      previousStatus: h.previousStatus,
      newStatus: h.newStatus,
      remarks: h.remarks,
      actorName: h.actorName,
      actorRole: h.actorRole,
      createdAt: h.createdAt,
    })),
  });
}

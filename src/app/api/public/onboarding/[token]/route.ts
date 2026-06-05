import { NextRequest } from "next/server";
import { connectDb } from "@/lib/db";
import { apiError, apiOk } from "@/lib/api";
import { assertOnboardingAccess } from "@/lib/communication-prerequisites";
import { COMPANY } from "@/lib/company";
import {
  buildOnboardingLinks,
  computeOnboardingProgress,
  getSectionCorrections,
  getSectionStatus,
  isOnboardingTokenExpired,
  sectionCanEdit,
  sectionLabel,
} from "@/lib/onboarding";
import { ONBOARDING_SECTIONS } from "@/lib/constants";
import { Onboarding } from "@/models/Onboarding";
import { Candidate } from "@/models/Candidate";

type Params = { params: Promise<{ token: string }> };

export async function GET(_request: NextRequest, { params }: Params) {
  const { token } = await params;
  if (!token || token.length < 16) return apiError("Invalid onboarding link", 422);

  await connectDb();
  const onboarding = await Onboarding.findOne({ accessToken: token }).lean();
  if (!onboarding) return apiError("Onboarding link not found or expired", 404);
  if (isOnboardingTokenExpired(onboarding.tokenGeneratedAt)) {
    return apiError("This onboarding link has expired. Please contact HR for a new link.", 410);
  }

  const candidate = await Candidate.findById(onboarding.candidateId).select("fullName email decision").lean();
  if (!candidate || candidate.decision !== "SELECTED") {
    return apiError("This onboarding link is no longer active.", 403);
  }

  const access = await assertOnboardingAccess(String(onboarding.candidateId));
  if (!access.ok) return apiError(access.message, 403);

  const progress = computeOnboardingProgress(onboarding);
  const links = buildOnboardingLinks(token);

  return apiOk({
    companyName: COMPANY.name,
    programName: COMPANY.tagline,
    candidateName: candidate.fullName,
    email: candidate.email,
    status: onboarding.status,
    progress,
    links,
    sections: ONBOARDING_SECTIONS.map((section) => {
      const status = getSectionStatus(onboarding, section);
      return {
        section,
        label: sectionLabel(section),
        status,
        corrections: getSectionCorrections(onboarding, section),
        canEdit: sectionCanEdit(status),
      };
    }),
  });
}

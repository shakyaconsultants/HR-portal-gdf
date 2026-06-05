import { randomBytes } from "crypto";
import { getAppBaseUrl } from "@/lib/app-url";
import type { OnboardingSection, OnboardingSectionStatus } from "@/lib/constants";
import { ONBOARDING_SECTIONS } from "@/lib/constants";
import { fieldsForSection, type OnboardingRecordShape } from "@/lib/onboarding-data";

export const SECTION_SLUGS: Record<OnboardingSection, string> = {
  JOINING_FORM: "joining-form",
  ID_CARD: "id-card",
};

export const SLUG_TO_SECTION: Record<string, OnboardingSection> = {
  "joining-form": "JOINING_FORM",
  "id-card": "ID_CARD",
  "personal-info": "JOINING_FORM",
  "bank-details": "JOINING_FORM",
};

export function generateOnboardingToken() {
  return randomBytes(24).toString("base64url");
}

export function buildOnboardingLinks(accessToken: string, baseUrl = getAppBaseUrl()) {
  return {
    hub: `${baseUrl}/onboard/${accessToken}`,
    joiningForm: `${baseUrl}/onboard/${accessToken}/joining-form`,
    idCard: `${baseUrl}/onboard/${accessToken}/id-card`,
  };
}

type SectionFields = OnboardingRecordShape;

function legacyJoiningStatus(onboarding: SectionFields) {
  const personal = normalizeSectionStatus(onboarding.personalInfoStatus ?? "NOT_STARTED");
  const bank = normalizeSectionStatus(onboarding.bankDetailsStatus ?? "NOT_STARTED");
  if (personal === "APPROVED" && bank === "APPROVED") return "APPROVED";
  if (personal === "UNDER_REVIEW" || bank === "UNDER_REVIEW") return "UNDER_REVIEW";
  if (personal === "CORRECTIONS_REQUESTED" || bank === "CORRECTIONS_REQUESTED") {
    return "CORRECTIONS_REQUESTED";
  }
  if (personal !== "NOT_STARTED" || bank !== "NOT_STARTED") return "UNDER_REVIEW";
  return "NOT_STARTED";
}

export function normalizeSectionStatus(status: string | undefined): OnboardingSectionStatus {
  if (!status) return "NOT_STARTED";
  if (status === "SUBMITTED") return "UNDER_REVIEW";
  return status as OnboardingSectionStatus;
}

export function getSectionStatus(onboarding: SectionFields, section: OnboardingSection) {
  switch (section) {
    case "JOINING_FORM":
      return onboarding.joiningFormStatus
        ? normalizeSectionStatus(onboarding.joiningFormStatus)
        : legacyJoiningStatus(onboarding);
    case "ID_CARD":
      return normalizeSectionStatus(onboarding.idCardInfoStatus ?? "NOT_STARTED");
  }
}

export function getSectionCorrections(onboarding: SectionFields & Record<string, unknown>, section: OnboardingSection) {
  switch (section) {
    case "JOINING_FORM":
      return String(onboarding.joiningFormCorrections ?? "");
    case "ID_CARD":
      return String(onboarding.idCardInfoCorrections ?? "");
  }
}

export function sectionCanEdit(status: string) {
  const normalized = normalizeSectionStatus(status);
  return normalized === "NOT_STARTED" || normalized === "CORRECTIONS_REQUESTED";
}

export function sectionAwaitingReview(status: string) {
  return normalizeSectionStatus(status) === "UNDER_REVIEW";
}

export function countSectionsWithStatus(onboarding: SectionFields, statuses: string[]) {
  const normalized = new Set(statuses.map((s) => normalizeSectionStatus(s)));
  return ONBOARDING_SECTIONS.filter((s) => normalized.has(getSectionStatus(onboarding, s))).length;
}

export function isSectionFilled(onboarding: SectionFields, section: OnboardingSection) {
  return getSectionStatus(onboarding, section) !== "NOT_STARTED";
}

export function sectionFillLabel(onboarding: SectionFields, section: OnboardingSection) {
  return isSectionFilled(onboarding, section) ? ("FILLED" as const) : ("NOT_FILLED" as const);
}

export function computeOnboardingProgress(onboarding: SectionFields) {
  const filledCount = ONBOARDING_SECTIONS.filter((s) => isSectionFilled(onboarding, s)).length;

  return {
    submittedCount: filledCount,
    underReviewCount: 0,
    approvedCount: filledCount,
    totalSections: ONBOARDING_SECTIONS.length,
    submissionPercent: Math.round((filledCount / ONBOARDING_SECTIONS.length) * 100),
    approvalPercent: Math.round((filledCount / ONBOARDING_SECTIONS.length) * 100),
    completionPercent: Math.round((filledCount / ONBOARDING_SECTIONS.length) * 100),
    fieldsPercent: Math.round((filledCount / ONBOARDING_SECTIONS.length) * 100),
    filledFields: filledCount,
    totalFields: ONBOARDING_SECTIONS.length,
  };
}

export function deriveOnboardingStatus(onboarding: SectionFields) {
  const { filledFields, totalFields } = computeOnboardingProgress(onboarding);
  if (filledFields === totalFields) return "COMPLETED" as const;
  if (filledFields > 0) return "IN_PROGRESS" as const;
  return "PENDING" as const;
}

export function formatOnboardingExpiryDate(tokenGeneratedAt: Date | string | null | undefined) {
  if (!tokenGeneratedAt) return null;
  const generated = new Date(tokenGeneratedAt).getTime();
  if (Number.isNaN(generated)) return null;
  return new Date(generated + getOnboardingTokenTtlMs()).toLocaleDateString("en-IN", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

export type OnboardingQueueStatus =
  | "NOT_STARTED"
  | "IN_PROGRESS"
  | "UNDER_REVIEW"
  | "APPROVED"
  | "CORRECTION_REQUIRED";

export function deriveOnboardingQueueStatus(
  progress: { submittedCount: number; approvedCount: number; totalSections: number },
  sections: Array<{ status: string }>
): OnboardingQueueStatus {
  if (progress.approvedCount === progress.totalSections) return "APPROVED";
  if (sections.some((s) => normalizeSectionStatus(s.status) === "CORRECTIONS_REQUESTED")) {
    return "CORRECTION_REQUIRED";
  }
  if (sections.some((s) => sectionAwaitingReview(s.status))) return "UNDER_REVIEW";
  if (progress.submittedCount > 0 || progress.approvedCount > 0) return "IN_PROGRESS";
  return "NOT_STARTED";
}

const DEFAULT_TOKEN_TTL_DAYS = 3;

export function getOnboardingTokenTtlMs() {
  const days = Number(process.env.ONBOARDING_TOKEN_TTL_DAYS);
  const ttlDays = Number.isFinite(days) && days > 0 ? days : DEFAULT_TOKEN_TTL_DAYS;
  return ttlDays * 24 * 60 * 60 * 1000;
}

export function isOnboardingTokenExpired(tokenGeneratedAt: Date | string | null | undefined) {
  if (!tokenGeneratedAt) return false;
  const generated = new Date(tokenGeneratedAt).getTime();
  if (Number.isNaN(generated)) return true;
  return Date.now() - generated > getOnboardingTokenTtlMs();
}

export function sectionLabel(section: OnboardingSection) {
  switch (section) {
    case "JOINING_FORM":
      return "Joining Form";
    case "ID_CARD":
      return "ID Card Form";
  }
}

export function editableFieldsForSection(section: OnboardingSection) {
  return fieldsForSection(section).filter((f) => !f.readOnly && f.type !== "checkbox");
}

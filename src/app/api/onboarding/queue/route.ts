import { NextRequest } from "next/server";
import { connectDb } from "@/lib/db";
import { apiOk, requireAuth } from "@/lib/api";
import {
  buildOnboardingLinks,
  computeOnboardingProgress,
  deriveOnboardingQueueStatus,
  getSectionStatus,
} from "@/lib/onboarding";
import { ONBOARDING_SECTIONS } from "@/lib/constants";
import { Candidate } from "@/models/Candidate";
import { Onboarding } from "@/models/Onboarding";

const ONBOARDING_LIFECYCLE_STAGES = ["OFFER_LETTER", "JOINING_INSTRUCTIONS", "EMPLOYEE"] as const;

type QueueTab =
  | "all"
  | "not_started"
  | "in_progress"
  | "under_review"
  | "approved"
  | "corrections";

export async function GET(request: NextRequest) {
  const auth = await requireAuth(request, ["ADMIN", "HR"]);
  if (auth.error) return auth.error;

  await connectDb();

  const tab = (request.nextUrl.searchParams.get("tab") ?? "all") as QueueTab;
  const search = request.nextUrl.searchParams.get("search")?.trim();
  const searchFilter = search
    ? {
        $or: [
          { fullName: { $regex: search, $options: "i" } },
          { email: { $regex: search, $options: "i" } },
          { registrationId: { $regex: search, $options: "i" } },
        ],
      }
    : {};

  const onboardingCandidateIds = await Onboarding.distinct("candidateId");

  const selectedCandidates = await Candidate.find({
    decision: "SELECTED",
    ...searchFilter,
    $or: [
      { lifecycleStage: { $in: [...ONBOARDING_LIFECYCLE_STAGES] } },
      { _id: { $in: onboardingCandidateIds } },
    ],
  })
    .sort({ updatedAt: -1 })
    .limit(100)
    .select("registrationId fullName email phone lifecycleStage updatedAt")
    .lean();

  const candidateIds = selectedCandidates.map((c) => c._id);
  const onboardings =
    candidateIds.length > 0
      ? await Onboarding.find({ candidateId: { $in: candidateIds } }).lean()
      : [];
  const onboardingByCandidate = new Map(onboardings.map((o) => [o.candidateId.toString(), o]));

  const items = selectedCandidates.map((c) => {
    const id = c._id.toString();
    const onboarding = onboardingByCandidate.get(id);
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

    const sections = onboarding
      ? ONBOARDING_SECTIONS.map((section) => ({
          section,
          status: getSectionStatus(onboarding, section),
        }))
      : ONBOARDING_SECTIONS.map((section) => ({ section, status: "NOT_STARTED" }));

    const queueStatus = deriveOnboardingQueueStatus(progress, sections);

    return {
      id,
      registrationId: c.registrationId,
      fullName: c.fullName,
      email: c.email,
      phone: c.phone,
      candidateStatus: c.lifecycleStage,
      lifecycleStage: c.lifecycleStage,
      onboardingId: onboarding?._id.toString() ?? null,
      onboardingStatus: onboarding?.status ?? "PENDING",
      queueStatus,
      hasLinks: Boolean(onboarding?.accessToken),
      links: onboarding?.accessToken ? buildOnboardingLinks(onboarding.accessToken) : null,
      progress,
      sections,
      tokenGeneratedAt: onboarding?.tokenGeneratedAt ?? null,
    };
  });

  const counts = {
    all: items.length,
    not_started: items.filter((i) => i.queueStatus === "NOT_STARTED").length,
    in_progress: items.filter((i) => i.queueStatus === "IN_PROGRESS").length,
    under_review: items.filter((i) => i.queueStatus === "UNDER_REVIEW").length,
    approved: items.filter((i) => i.queueStatus === "APPROVED").length,
    corrections: items.filter((i) => i.queueStatus === "CORRECTION_REQUIRED").length,
    sectionNotStarted: items.reduce(
      (sum, i) => sum + i.sections.filter((s) => s.status === "NOT_STARTED").length,
      0
    ),
    sectionUnderReview: items.reduce(
      (sum, i) =>
        sum +
        i.sections.filter((s) => s.status === "UNDER_REVIEW" || s.status === "SUBMITTED").length,
      0
    ),
    sectionApproved: items.reduce(
      (sum, i) => sum + i.sections.filter((s) => s.status === "APPROVED").length,
      0
    ),
    sectionCorrections: items.reduce(
      (sum, i) => sum + i.sections.filter((s) => s.status === "CORRECTIONS_REQUESTED").length,
      0
    ),
  };

  const filtered =
    tab === "all"
      ? items
      : tab === "not_started"
        ? items.filter((i) => i.queueStatus === "NOT_STARTED")
        : tab === "in_progress"
          ? items.filter((i) => i.queueStatus === "IN_PROGRESS")
          : tab === "under_review"
            ? items.filter((i) => i.queueStatus === "UNDER_REVIEW")
            : tab === "approved"
              ? items.filter((i) => i.queueStatus === "APPROVED")
              : tab === "corrections"
                ? items.filter((i) => i.queueStatus === "CORRECTION_REQUIRED")
                : items;

  return apiOk({ counts, items: filtered });
}

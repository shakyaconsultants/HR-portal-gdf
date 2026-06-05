import { LIFECYCLE_STAGES, type LifecycleStage } from "@/lib/lifecycle";

/** Lifecycle stages that belong to Lead Management only — never Candidate Management. */
export const PRE_REGISTRATION_LIFECYCLE_STAGES: LifecycleStage[] = [
  "LEAD",
  "INTERVIEW_SCHEDULED",
  "INTERVIEW_COMPLETED",
  "INTERVIEW_SELECTED",
  "LETTER_OF_INTENT_SENT",
  "AWAITING_REGISTRATION",
];

/** Post-registration stages — Candidate Management registry. */
export const POST_REGISTRATION_LIFECYCLE_STAGES = LIFECYCLE_STAGES.filter(
  (stage) => !PRE_REGISTRATION_LIFECYCLE_STAGES.includes(stage)
);

/**
 * Mongo filter for registered candidates.
 * Uses lifecycle stage (not only registrationSubmittedAt) so legacy rows at
 * Verification/Offer/etc. still appear after the lead/candidate split.
 */
export const CANDIDATE_REGISTRY_FILTER = {
  lifecycleStage: { $in: POST_REGISTRATION_LIFECYCLE_STAGES },
} as const;

export function isPostRegistrationStage(stage: string) {
  return POST_REGISTRATION_LIFECYCLE_STAGES.includes(stage as LifecycleStage);
}

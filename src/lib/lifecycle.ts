import type { HiringDecision } from "@/lib/constants";

export const LIFECYCLE_STAGES = [
  "LEAD",
  "INTERVIEW_SCHEDULED",
  "INTERVIEW_COMPLETED",
  "INTERVIEW_SELECTED",
  "LETTER_OF_INTENT_SENT",
  "AWAITING_REGISTRATION",
  "REGISTRATION_SUBMITTED",
  "VERIFICATION",
  "BATCH_ASSIGNMENT",
  "TRAINING",
  "FINAL_MOCK_CALL",
  "HIRING_DECISION",
  "OFFER_LETTER",
  "JOINING_INSTRUCTIONS",
  "EMPLOYEE",
] as const;

export type LifecycleStage = (typeof LIFECYCLE_STAGES)[number];

export type LifecycleStageSlug =
  | "lead"
  | "interview-scheduled"
  | "interview-completed"
  | "interview-selected"
  | "letter-of-intent-sent"
  | "awaiting-registration"
  | "registration-submitted"
  | "verification"
  | "batch-assignment"
  | "training"
  | "final-mock-call"
  | "hiring-decision"
  | "offer-letter"
  | "joining-instructions"
  | "employee";

export type LifecycleStageMeta = {
  stage: LifecycleStage;
  slug: LifecycleStageSlug;
  href: string;
  label: string;
  shortLabel: string;
  description: string;
  actionHint: string;
  order: number;
};

export const LIFECYCLE_PIPELINE: LifecycleStageMeta[] = [
  {
    stage: "LEAD",
    slug: "lead",
    href: "/leads",
    label: "Lead",
    shortLabel: "Lead",
    description: "New prospects captured before interview scheduling.",
    actionHint: "Add lead details and schedule interview.",
    order: 1,
  },
  {
    stage: "INTERVIEW_SCHEDULED",
    slug: "interview-scheduled",
    href: "/interviews?tab=scheduled",
    label: "Interview Scheduled",
    shortLabel: "Scheduled",
    description: "Candidates with a confirmed interview slot.",
    actionHint: "Mark interview completed after the session.",
    order: 2,
  },
  {
    stage: "INTERVIEW_COMPLETED",
    slug: "interview-completed",
    href: "/interviews?tab=completed",
    label: "Interview Completed",
    shortLabel: "Completed",
    description: "Interview done — awaiting selection decision.",
    actionHint: "Record interview outcome and move to selected.",
    order: 3,
  },
  {
    stage: "INTERVIEW_SELECTED",
    slug: "interview-selected",
    href: "/interviews?tab=selected",
    label: "Interview Selected",
    shortLabel: "Selected",
    description: "Passed interview — ready for letter of intent.",
    actionHint: "Send letter of intent to proceed.",
    order: 4,
  },
  {
    stage: "LETTER_OF_INTENT_SENT",
    slug: "letter-of-intent-sent",
    href: "/letter-of-intent?tab=pending",
    label: "Letter Of Intent",
    shortLabel: "LOI",
    description: "Interview-selected candidates awaiting LOI generation and delivery.",
    actionHint: "Generate LOI PDF and send email with registration link.",
    order: 5,
  },
  {
    stage: "AWAITING_REGISTRATION",
    slug: "awaiting-registration",
    href: "/letter-of-intent?tab=sent",
    label: "Registration Pending",
    shortLabel: "Reg. Pending",
    description: "LOI sent — candidate must complete the registration form via their unique link.",
    actionHint: "Track until registration is submitted through the shared link.",
    order: 6,
  },
  {
    stage: "REGISTRATION_SUBMITTED",
    slug: "registration-submitted",
    href: "/registrations",
    label: "Registration Submitted",
    shortLabel: "Reg. Submitted",
    description: "Registration completed — candidate is in the verification queue.",
    actionHint: "Review documents on profile → Verification tab",
    order: 7,
  },
  {
    stage: "VERIFICATION",
    slug: "verification",
    href: "/verification",
    label: "Verification",
    shortLabel: "Verification",
    description: "Background verification and document checks in progress.",
    actionHint: "Open profile → Verification tab",
    order: 8,
  },
  {
    stage: "BATCH_ASSIGNMENT",
    slug: "batch-assignment",
    href: "/batches?tab=assignment",
    label: "Batch Assignment",
    shortLabel: "Batch",
    description: "Verified candidates awaiting batch assignment.",
    actionHint: "Assign to a training batch",
    order: 9,
  },
  {
    stage: "TRAINING",
    slug: "training",
    href: "/batches?tab=training",
    label: "Training",
    shortLabel: "Training",
    description: "Candidates actively in a training batch.",
    actionHint: "Mark ready for final mock call when training is complete.",
    order: 10,
  },
  {
    stage: "FINAL_MOCK_CALL",
    slug: "final-mock-call",
    href: "/evaluations",
    label: "Final Mock Call",
    shortLabel: "Mock Call",
    description: "Trainees ready for the one-time final mock call evaluation.",
    actionHint: "Score Communication, Confidence, Product Knowledge, Sales Pitch, Objection Handling",
    order: 11,
  },
  {
    stage: "HIRING_DECISION",
    slug: "hiring-decision",
    href: "/hiring-decisions",
    label: "Hiring Decision",
    shortLabel: "Hiring",
    description: "Evaluated candidates awaiting selected, hold, or rejected decision.",
    actionHint: "Open profile → Hiring tab",
    order: 12,
  },
  {
    stage: "OFFER_LETTER",
    slug: "offer-letter",
    href: "/communications?tab=offer",
    label: "Offer Letter",
    shortLabel: "Offer",
    description: "Selected candidates awaiting offer letter.",
    actionHint: "Send offer letter from Communications",
    order: 13,
  },
  {
    stage: "JOINING_INSTRUCTIONS",
    slug: "joining-instructions",
    href: "/communications?tab=joining",
    label: "Joining & Onboarding",
    shortLabel: "Joining",
    description: "Offer sent — onboarding forms and joining instructions.",
    actionHint: "Onboarding links are sent with the offer letter; track form completion on profile",
    order: 14,
  },
  {
    stage: "EMPLOYEE",
    slug: "employee",
    href: "/employees",
    label: "Employee",
    shortLabel: "Employee",
    description: "Onboarding forms complete — active employees.",
    actionHint: "View employee records",
    order: 15,
  },
];

const STAGE_BY_SLUG = new Map(LIFECYCLE_PIPELINE.map((m) => [m.slug, m]));
const STAGE_BY_VALUE = new Map(LIFECYCLE_PIPELINE.map((m) => [m.stage, m]));

export function getLifecycleMeta(stage: LifecycleStage): LifecycleStageMeta {
  const meta = STAGE_BY_VALUE.get(stage);
  if (!meta) throw new Error(`Unknown lifecycle stage: ${stage}`);
  return meta;
}

export function getLifecycleMetaBySlug(slug: LifecycleStageSlug): LifecycleStageMeta {
  const meta = STAGE_BY_SLUG.get(slug);
  if (!meta) throw new Error(`Unknown lifecycle slug: ${slug}`);
  return meta;
}

export function getNextLifecycleStage(stage: LifecycleStage): LifecycleStage | null {
  const idx = LIFECYCLE_STAGES.indexOf(stage);
  if (idx < 0 || idx >= LIFECYCLE_STAGES.length - 1) return null;
  return LIFECYCLE_STAGES[idx + 1];
}

export function lifecycleStageIndex(stage: LifecycleStage): number {
  return LIFECYCLE_STAGES.indexOf(stage);
}

export type LifecycleQueueTab = "all" | "pending" | "approved" | "rejected" | "selected" | "hold";

export function applyLifecycleStageFilter(
  filter: Record<string, unknown>,
  stage: LifecycleStage,
  tab?: LifecycleQueueTab
) {
  switch (stage) {
    case "REGISTRATION_SUBMITTED":
      filter.registrationSubmittedAt = { $ne: null };
      break;
    default:
      filter.lifecycleStage = stage;
      break;
  }

  switch (stage) {
    case "VERIFICATION":
      if (tab === "approved") {
        filter.verificationStage = "FINAL_APPROVED";
        filter.verificationRejected = { $ne: true };
      } else if (tab === "rejected") {
        filter.verificationRejected = true;
      } else if (tab === "pending" || !tab || tab === "all") {
        filter.verificationRejected = { $ne: true };
        if (tab === "pending") {
          filter.verificationStage = { $ne: "FINAL_APPROVED" };
        }
      }
      break;
    case "BATCH_ASSIGNMENT":
      filter.batchId = null;
      filter.verificationStage = "FINAL_APPROVED";
      filter.verificationRejected = { $ne: true };
      break;
    case "TRAINING":
      filter.batchId = { $ne: null };
      break;
    case "FINAL_MOCK_CALL":
      filter.evaluationStatus = "NOT_EVALUATED";
      filter.batchId = { $ne: null };
      break;
    case "HIRING_DECISION":
      filter.evaluationStatus = "EVALUATED";
      if (tab === "selected") {
        filter.decision = "SELECTED";
      } else if (tab === "hold") {
        filter.decision = "HOLD";
      } else if (tab === "rejected") {
        filter.decision = "REJECTED";
      } else if (tab === "pending" || !tab || tab === "all") {
        filter.$or = [{ decision: null }, { decision: { $exists: false } }];
      }
      break;
    case "OFFER_LETTER":
      filter.decision = "SELECTED";
      break;
    case "JOINING_INSTRUCTIONS":
      filter.decision = "SELECTED";
      break;
    default:
      break;
  }
}

export function applyLifecycleSlugFilter(
  filter: Record<string, unknown>,
  slug: LifecycleStageSlug,
  tab?: LifecycleQueueTab
) {
  const meta = getLifecycleMetaBySlug(slug);
  applyLifecycleStageFilter(filter, meta.stage, tab);
}

/** Map legacy `status` field values to lifecycle stages for one-time migration. */
export function legacyStatusToLifecycleStage(
  status: string,
  extras?: {
    batchId?: unknown;
    evaluationStatus?: string;
    decision?: HiringDecision | null;
    verificationStage?: string;
    verificationRejected?: boolean;
  }
): LifecycleStage {
  if (extras?.verificationRejected) return "VERIFICATION";

  switch (status) {
    case "REGISTERED":
      return "REGISTRATION_SUBMITTED";
    case "UNDER_VERIFICATION":
      return "VERIFICATION";
    case "VERIFICATION_APPROVED":
      return extras?.batchId ? "TRAINING" : "BATCH_ASSIGNMENT";
    case "VERIFICATION_REJECTED":
      return "VERIFICATION";
    case "ASSIGNED_TO_BATCH":
    case "TRAINING_IN_PROGRESS":
      return extras?.evaluationStatus === "EVALUATED" ? "HIRING_DECISION" : "TRAINING";
    case "EVALUATED":
      if (extras?.decision === "SELECTED") return "OFFER_LETTER";
      if (extras?.decision === "HOLD") return "TRAINING";
      if (extras?.decision === "REJECTED") return "HIRING_DECISION";
      return "HIRING_DECISION";
    case "SELECTED":
      return "OFFER_LETTER";
    case "HOLD":
      return "TRAINING";
    case "REJECTED":
      return "HIRING_DECISION";
    case "ONBOARDING_IN_PROGRESS":
      return "JOINING_INSTRUCTIONS";
    case "ONBOARDED":
      return "EMPLOYEE";
    case "RESIGNED":
      return "EMPLOYEE";
    default:
      return "LEAD";
  }
}

// Backward-compatible aliases for gradual migration
export const WORKFLOW_STAGES = LIFECYCLE_PIPELINE.map((m) => m.slug) as unknown as readonly LifecycleStageSlug[];
export type WorkflowStage = LifecycleStageSlug;

export function getStageMeta(slug: LifecycleStageSlug): LifecycleStageMeta {
  return getLifecycleMetaBySlug(slug);
}

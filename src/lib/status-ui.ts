import { LIFECYCLE_PIPELINE } from "@/lib/lifecycle";

export type BadgeVariant = "neutral" | "success" | "warning" | "danger" | "info";

const LIFECYCLE_VARIANT: Record<string, BadgeVariant> = {
  LEAD: "neutral",
  INTERVIEW_SCHEDULED: "info",
  INTERVIEW_COMPLETED: "info",
  INTERVIEW_SELECTED: "success",
  LETTER_OF_INTENT_SENT: "info",
  AWAITING_REGISTRATION: "warning",
  REGISTRATION_SUBMITTED: "success",
  VERIFICATION: "info",
  BATCH_ASSIGNMENT: "warning",
  TRAINING: "warning",
  FINAL_MOCK_CALL: "info",
  HIRING_DECISION: "warning",
  OFFER_LETTER: "success",
  JOINING_INSTRUCTIONS: "success",
  EMPLOYEE: "success",
  NOT_EVALUATED: "warning",
  HOLD: "warning",
  SELECTED: "success",
  REJECTED: "danger",
};

const LIFECYCLE_LABELS = new Map<string, string>(LIFECYCLE_PIPELINE.map((s) => [s.stage, s.label]));

export function statusToVariant(status: string): BadgeVariant {
  return LIFECYCLE_VARIANT[status] ?? "neutral";
}

const LABEL_OVERRIDES: Record<string, string> = {
  REGISTRATION_SUBMITTED: "Registration Completed",
  NOT_EVALUATED: "Pending Evaluation",
  OFFER_LETTER: "Offer Letter",
  INTERVIEW_INVITATION: "Interview Invitation",
  LETTER_OF_INTENT: "Letter Of Intent",
  TRAINING_COMPLETION: "Training Completion Letter",
  JOINING_INSTRUCTIONS: "Joining Instructions",
  PENDING: "Pending",
  SENT: "Sent",
  DELIVERED: "Delivered",
  FAILED: "Failed",
  JOINING_FORM: "Joining Form",
  ID_CARD: "ID Card Form",
  NOT_STARTED: "Not Started",
  NOT_FILLED: "Not Filled",
  FILLED: "Filled",
  SUBMITTED: "Submitted",
  UNDER_REVIEW: "Under Review",
  APPROVED: "Approved",
  CORRECTIONS_REQUESTED: "Correction Requested",
  CORRECTION_REQUIRED: "Correction Requested",
  IN_PROGRESS: "In Progress",
  COMPLETED: "Completed",
  FRESHER: "Fresher",
  EXPERIENCED: "Experienced",
  AADHAR: "Aadhar",
  PAN: "PAN",
  TENTH: "10th Certificate",
  TWELFTH: "12th Certificate",
  GRADUATION: "Graduation Certificate",
  NEW_LEAD: "New Lead",
  INTERVIEW_SCHEDULED: "Interview Scheduled",
  INTERVIEW_COMPLETED: "Interview Completed",
  SELECTED: "Selected",
  REJECTED: "Rejected",
  LINKEDIN: "LinkedIn",
  NAUKRI: "Naukri",
  WALK_IN: "Walk In",
  REFERRAL: "Referral",
  INDEED: "Indeed",
  WEBSITE_APPLICATION: "Website Application",
  OTHER: "Other",
};

const SECTION_VARIANT: Record<string, BadgeVariant> = {
  NOT_STARTED: "neutral",
  NOT_FILLED: "neutral",
  FILLED: "success",
  IN_PROGRESS: "info",
  SUBMITTED: "info",
  UNDER_REVIEW: "info",
  APPROVED: "success",
  CORRECTIONS_REQUESTED: "warning",
  CORRECTION_REQUIRED: "warning",
};

export function sectionStatusToVariant(status: string): BadgeVariant {
  return SECTION_VARIANT[status] ?? "neutral";
}

const DELIVERY_VARIANT: Record<string, BadgeVariant> = {
  PENDING: "warning",
  SENT: "success",
  DELIVERED: "success",
  FAILED: "danger",
};

export function deliveryToVariant(status: string): BadgeVariant {
  return DELIVERY_VARIANT[status] ?? "neutral";
}

export function formatStatusLabel(status: string) {
  if (LABEL_OVERRIDES[status]) return LABEL_OVERRIDES[status];
  if (LIFECYCLE_LABELS.has(status)) return LIFECYCLE_LABELS.get(status)!;
  return status
    .toLowerCase()
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

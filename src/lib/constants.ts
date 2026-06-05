export const USER_ROLES = ["ADMIN", "HR", "TRAINER"] as const;
export type UserRole = (typeof USER_ROLES)[number];

export { LIFECYCLE_STAGES, type LifecycleStage } from "@/lib/lifecycle";

/** @deprecated Use LIFECYCLE_STAGES / lifecycleStage instead */
export const CANDIDATE_STATUSES = [
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
export type CandidateStatus = (typeof CANDIDATE_STATUSES)[number];

export const VERIFICATION_STAGES = [
  "DOCUMENTS_RECEIVED",
  "IDENTITY_VERIFIED",
  "ADDRESS_VERIFIED",
  "REFERENCE_VERIFIED",
  "FINAL_APPROVED",
] as const;
export type VerificationStage = (typeof VERIFICATION_STAGES)[number];

export const BATCH_STATUSES = ["PLANNED", "ACTIVE", "COMPLETED"] as const;
export type BatchStatus = (typeof BATCH_STATUSES)[number];

export const HIRING_DECISIONS = ["SELECTED", "HOLD", "REJECTED"] as const;
export type HiringDecision = (typeof HIRING_DECISIONS)[number];

export const REGISTRATION_DOCUMENT_TYPES = [
  "AADHAR",
  "PAN",
  "TENTH",
  "TWELFTH",
  "GRADUATION",
] as const;
export type RegistrationDocumentType = (typeof REGISTRATION_DOCUMENT_TYPES)[number];

export const REFERENCE_SOURCES = [
  "LINKEDIN",
  "NAUKRI",
  "WALK_IN",
  "REFERRAL",
  "INDEED",
  "WEBSITE_APPLICATION",
  "OTHER",
] as const;
export type ReferenceSource = (typeof REFERENCE_SOURCES)[number];

export const INTERVIEW_MODES = ["OFFICE", "GOOGLE_MEET", "PHONE_CALL"] as const;
export type InterviewMode = (typeof INTERVIEW_MODES)[number];

export const INTERVIEW_STATUSES = ["SCHEDULED", "COMPLETED", "CANCELLED"] as const;
export type InterviewStatus = (typeof INTERVIEW_STATUSES)[number];

export const INTERVIEW_OUTCOMES = ["SELECTED", "REJECTED", "HOLD"] as const;
export type InterviewOutcome = (typeof INTERVIEW_OUTCOMES)[number];

/** Pre-registration lead pipeline — separate from candidate lifecycle. */
export const LEAD_STATUSES = [
  "NEW_LEAD",
  "INTERVIEW_SCHEDULED",
  "INTERVIEW_COMPLETED",
  "SELECTED",
  "REJECTED",
  "HOLD",
  "LOI_SENT",
  "AWAITING_REGISTRATION",
] as const;
export type LeadStatus = (typeof LEAD_STATUSES)[number];

export const CANDIDATE_TYPES = ["FRESHER", "EXPERIENCED"] as const;
export type CandidateType = (typeof CANDIDATE_TYPES)[number];

export const DOCUMENT_TYPES = [
  ...REGISTRATION_DOCUMENT_TYPES,
  "ID_PROOF",
  "ADDRESS_PROOF",
  "EDUCATION_CERTIFICATE",
  "RESUME",
  "PHOTO",
  "OTHER",
] as const;
export type DocumentType = (typeof DOCUMENT_TYPES)[number];

export const SALARY_SLABS = ["SLAB_A", "SLAB_B", "SLAB_C", "CUSTOM"] as const;
export type SalarySlab = (typeof SALARY_SLABS)[number];

export const EVALUATION_STATUSES = ["NOT_EVALUATED", "EVALUATED"] as const;
export type EvaluationStatus = (typeof EVALUATION_STATUSES)[number];

export const EMAIL_TEMPLATE_TYPES = [
  "INTERVIEW_INVITATION",
  "LETTER_OF_INTENT",
  "OFFER_LETTER",
  "JOINING_INSTRUCTIONS",
  "ONBOARDING_INVITATION",
] as const;
export type EmailTemplateType = (typeof EMAIL_TEMPLATE_TYPES)[number];

/** Active workflow templates */
export const COMMUNICATION_TYPES = EMAIL_TEMPLATE_TYPES;
export type CommunicationType = EmailTemplateType;

/** Includes legacy log types for historical records */
export const COMMUNICATION_LOG_TYPES = [...EMAIL_TEMPLATE_TYPES, "TRAINING_COMPLETION"] as const;

export const DELIVERY_STATUSES = ["PENDING", "SENT", "FAILED"] as const;
export type DeliveryStatus = (typeof DELIVERY_STATUSES)[number];

export const ONBOARDING_SECTIONS = ["JOINING_FORM", "ID_CARD"] as const;
export type OnboardingSection = (typeof ONBOARDING_SECTIONS)[number];

export const ONBOARDING_SECTION_STATUSES = [
  "NOT_STARTED",
  "UNDER_REVIEW",
  "CORRECTIONS_REQUESTED",
  "APPROVED",
] as const;
export type OnboardingSectionStatus = (typeof ONBOARDING_SECTION_STATUSES)[number];

export const ONBOARDING_STATUSES = ["PENDING", "IN_PROGRESS", "COMPLETED"] as const;
export type OnboardingStatus = (typeof ONBOARDING_STATUSES)[number];

export { MOCK_CALL_CRITERIA, MOCK_CALL_SECTION_MAX, MOCK_CALL_TOTAL_MAX } from "@/lib/mock-call";

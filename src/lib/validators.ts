import { z } from "zod";
import {
  BATCH_STATUSES,
  HIRING_DECISIONS,
  LEAD_STATUSES,
  LIFECYCLE_STAGES,
  INTERVIEW_MODES,
  INTERVIEW_OUTCOMES,
  REFERENCE_SOURCES,
  USER_ROLES,
  VERIFICATION_STAGES,
} from "@/lib/constants";
import { LIFECYCLE_PIPELINE } from "@/lib/lifecycle";
import { MOCK_CALL_SECTION_MAX } from "@/lib/mock-call";

const LIFECYCLE_SLUGS = LIFECYCLE_PIPELINE.map((s) => s.slug) as [string, ...string[]];

export const loginSchema = z.object({
  email: z.email(),
  password: z.string().min(6),
});

export const createUserSchema = z.object({
  name: z.string().min(2).max(100),
  email: z.email(),
  password: z.string().min(6).max(100),
  role: z.enum(USER_ROLES),
});

export const createLeadSchema = z.object({
  fullName: z.string().min(2).max(120),
  email: z.email(),
  phone: z.string().min(8).max(20),
  referenceSource: z.enum(REFERENCE_SOURCES),
  referenceName: z.string().max(120).optional(),
  comments: z.string().max(2000).optional(),
});

export const leadListFilterSchema = z.object({
  page: z.coerce.number().min(1).default(1),
  pageSize: z.coerce.number().min(5).max(300).default(50),
  leadStatus: z.enum(LEAD_STATUSES).optional(),
  referenceSource: z.enum(REFERENCE_SOURCES).optional(),
  search: z.string().max(120).optional(),
});

export const updateLeadSchema = z.object({
  leadStatus: z.enum(LEAD_STATUSES).optional(),
  referenceSource: z.enum(REFERENCE_SOURCES).optional(),
  referenceName: z.string().max(120).optional(),
  comments: z.string().max(2000).optional(),
  fullName: z.string().min(2).max(120).optional(),
  phone: z.string().min(8).max(20).optional(),
  email: z.email().optional(),
});

export const scheduleInterviewSchema = z.object({
  leadId: z.string().min(1),
  interviewDate: z.string().min(1),
  interviewTime: z.string().min(1).max(40),
  interviewer: z.string().min(2).max(120),
  mode: z.enum(INTERVIEW_MODES),
  instructions: z.string().max(2000).optional(),
});

export const completeInterviewSchema = z.object({
  outcome: z.enum(INTERVIEW_OUTCOMES),
  remarks: z.string().min(3).max(2000),
});

export const advanceLifecycleSchema = z
  .object({
    action: z.enum(["advance", "reject_verification", "set_stage"]),
    lifecycleStage: z.enum(LIFECYCLE_STAGES).optional(),
    remarks: z.string().max(1000).optional(),
  })
  .refine((data) => data.action !== "set_stage" || data.lifecycleStage, {
    message: "lifecycleStage is required when setting stage",
    path: ["lifecycleStage"],
  });

export const updateVerificationSchema = z
  .object({
    action: z.enum(["advance", "set_stage", "reject"]).optional(),
    stage: z.enum(VERIFICATION_STAGES).optional(),
    remarks: z.string().max(1000).optional(),
  })
  .refine((data) => data.action === "reject" || data.action === "advance" || data.stage, {
    message: "Provide action or stage",
  });

export const createBatchSchema = z.object({
  name: z.string().min(2).max(120),
  trainerName: z.string().min(2).max(100),
  startDate: z.string(),
  endDate: z.string(),
  status: z.enum(BATCH_STATUSES).default("PLANNED"),
  capacity: z.coerce.number().int().min(1).max(200).default(30),
});

export const assignCandidateSchema = z.object({
  candidateId: z.string().min(1),
  batchId: z.string().min(1),
});

export const bulkAssignCandidateSchema = z.object({
  candidateIds: z.array(z.string().min(1)).min(1).max(50),
  batchId: z.string().min(1),
});

export const transferCandidateSchema = z.object({
  candidateId: z.string().min(1),
  fromBatchId: z.string().min(1),
  toBatchId: z.string().min(1),
  reason: z.string().min(3).max(500),
});

export const bulkTransferCandidateSchema = z.object({
  candidateIds: z.array(z.string().min(1)).min(1).max(50),
  fromBatchId: z.string().min(1),
  toBatchId: z.string().min(1),
  reason: z.string().min(3).max(500),
});

export const removeCandidateFromBatchSchema = z.object({
  candidateId: z.string().min(1),
  batchId: z.string().min(1),
  reason: z.string().max(500).optional(),
});

export const createEvaluationSchema = z.object({
  candidateId: z.string().min(1),
  communicationSkills: z.coerce.number().min(0).max(MOCK_CALL_SECTION_MAX),
  confidenceLevel: z.coerce.number().min(0).max(MOCK_CALL_SECTION_MAX),
  productUnderstanding: z.coerce.number().min(0).max(MOCK_CALL_SECTION_MAX),
  salesPitch: z.coerce.number().min(0).max(MOCK_CALL_SECTION_MAX),
  objectionHandling: z.coerce.number().min(0).max(MOCK_CALL_SECTION_MAX),
  remarks: z.string().max(1200).optional(),
  evaluatorName: z.string().min(2).max(100).optional(),
  evaluatedAt: z.string().optional(),
});

export const updateDecisionSchema = z.object({
  candidateId: z.string().min(1),
  decision: z.enum(HIRING_DECISIONS),
  remarks: z.string().min(3).max(1000),
  reassignBatchId: z.string().optional(),
});

export const offerLetterDetailsSchema = z.object({
  candidateName: z.string().min(2).max(120),
  designation: z.string().min(2).max(120),
  department: z.string().min(2).max(120),
  ctc: z.string().min(1).max(80),
  joiningDate: z.string().min(1).max(80),
  reportingManager: z.string().min(2).max(120),
  offerDate: z.string().min(1).max(80),
});

export const sendCommunicationSchema = z
  .object({
    candidateId: z.string().min(1),
    type: z.enum([
      "INTERVIEW_INVITATION",
      "LETTER_OF_INTENT",
      "OFFER_LETTER",
      "JOINING_INSTRUCTIONS",
      "ONBOARDING_INVITATION",
    ]),
    subject: z.string().min(3).max(150).optional(),
    body: z.string().min(5).max(5000).optional(),
    joiningDate: z.string().min(1).max(80).optional(),
    offerDetails: offerLetterDetailsSchema.optional(),
    resend: z.boolean().optional(),
  })
  .superRefine((data, ctx) => {
    if (data.type === "OFFER_LETTER" && !data.offerDetails) {
      ctx.addIssue({
        code: "custom",
        message: "Offer letter details are required to generate the PDF.",
        path: ["offerDetails"],
      });
    }
    if (data.type === "JOINING_INSTRUCTIONS" && !data.joiningDate?.trim()) {
      ctx.addIssue({
        code: "custom",
        message: "Joining date is required for joining instructions.",
        path: ["joiningDate"],
      });
    }
  });

export const updateEmailTemplateSchema = z.object({
  name: z.string().min(2).max(120).optional(),
  subject: z.string().min(3).max(200).optional(),
  htmlBody: z.string().min(10).max(50000).optional(),
  textBody: z.string().max(20000).optional(),
  showLogo: z.boolean().optional(),
  actionButton: z
    .object({
      enabled: z.boolean(),
      label: z.string().max(80),
      url: z.string().max(500),
    })
    .optional(),
  attachments: z
    .array(
      z.object({
        fileName: z.string().min(1).max(200),
        mimeType: z.string().min(3).max(100),
        storagePath: z.string().min(1).max(500),
      })
    )
    .optional(),
  isActive: z.boolean().optional(),
});

export const updateOrganizationSettingsSchema = z.object({
  companyName: z.string().min(1).max(120).optional(),
  companyTagline: z.string().max(200).optional(),
  companyAddressLine1: z.string().max(200).optional(),
  companyAddressLine2: z.string().max(200).optional(),
  companyAddressLine3: z.string().max(200).optional(),
  companyAddressLine4: z.string().max(200).optional(),
  hrName: z.string().max(120).optional(),
  hrDesignation: z.string().max(120).optional(),
  hrEmail: z.union([z.literal(""), z.email()]).optional(),
  hrPhone: z.string().max(30).optional(),
  companyLogoPath: z.string().max(300).optional(),
});

export const emailPreviewSchema = z.object({
  type: z.enum([
    "INTERVIEW_INVITATION",
    "LETTER_OF_INTENT",
    "OFFER_LETTER",
    "JOINING_INSTRUCTIONS",
    "ONBOARDING_INVITATION",
  ]),
  candidateId: z.string().min(1).optional(),
  subject: z.string().optional(),
  htmlBody: z.string().optional(),
  textBody: z.string().optional(),
  showLogo: z.boolean().optional(),
  actionButton: z
    .object({
      enabled: z.boolean(),
      label: z.string(),
      url: z.string(),
    })
    .optional(),
});

export const onboardingJoiningFormSchema = z.object({
  fullName: z.string().min(2).max(120),
  phone: z.string().min(8).max(20),
  email: z.string().email(),
  joiningDate: z.string().min(1),
  monthOfJoining: z.string().min(1),
  gender: z.enum(["Male", "Female", "Other"]),
  currentAddress: z.string().min(5).max(500),
  permanentAddress: z.string().min(5).max(500),
  fatherName: z.string().min(2).max(120),
  fatherPhone: z.string().min(8).max(20),
  motherName: z.string().min(2).max(120),
  motherPhone: z.string().min(8).max(20),
  designation: z.string().min(2).max(120),
  maritalStatus: z.enum(["Married", "Un-Married", "Does Not Wish To Specify"]),
  professionalPhotoPath: z.string().min(1),
  aadharPanNumber: z.string().min(5).max(40),
  aadharPanPhotoPath: z.string().min(1),
  joiningDeclarationAccepted: z.literal("true"),
  policyComplianceAccepted: z.literal("true"),
});

export const onboardingIdCardSchema = z.object({
  gender: z.enum(["Ms.", "Mr."]),
  fullName: z.string().min(2).max(120),
  phone: z.string().min(8).max(20),
  address: z.string().max(500).optional(),
  email: z.string().email(),
  joiningDate: z.string().min(1),
  employeeId: z.string().min(1).max(40),
  designation: z.string().min(2).max(120),
  professionalPhotoPath: z.string().min(1),
});

export const publicOnboardingSubmitSchema = z.discriminatedUnion("section", [
  z.object({ section: z.literal("JOINING_FORM"), data: onboardingJoiningFormSchema }),
  z.object({ section: z.literal("ID_CARD"), data: onboardingIdCardSchema }),
]);

export const onboardingReviewSchema = z.object({
  section: z.enum(["JOINING_FORM", "ID_CARD"]),
  action: z.enum(["approve", "request_corrections"]),
  remarks: z.string().min(3).max(1000),
});

export const onboardingUpsertSchema = z.object({
  candidateId: z.string().min(1),
  status: z.enum(["PENDING", "IN_PROGRESS", "COMPLETED"]).optional(),
});

export const candidateListFilterSchema = z.object({
  page: z.coerce.number().min(1).default(1),
  pageSize: z.coerce.number().min(5).max(300).default(50),
  lifecycleStage: z.enum(LIFECYCLE_STAGES).optional(),
  lifecycleSlug: z.enum(LIFECYCLE_SLUGS).optional(),
  workflowStage: z.enum(LIFECYCLE_SLUGS).optional(),
  verificationStage: z.enum(VERIFICATION_STAGES).optional(),
  batchId: z.string().optional(),
  unassigned: z.enum(["true", "false"]).optional(),
  decision: z.enum(HIRING_DECISIONS).optional(),
  tab: z.enum(["all", "pending", "approved", "rejected", "selected", "hold"]).optional(),
  search: z.string().max(120).optional(),
});

export type CandidateListFilterInput = z.infer<typeof candidateListFilterSchema>;

export const publicRegistrationSchema = z
  .object({
    fullName: z.string().min(2).max(120),
    email: z.email(),
    phone: z.string().min(8).max(20),
    candidateType: z.enum(["FRESHER", "EXPERIENCED"]),
    experienceYears: z.coerce.number().min(0).max(50).optional(),
    previousOrganization: z.string().max(200).optional(),
    previousCtc: z.coerce.number().min(0).optional(),
    qualification: z.string().min(2).max(200),
    dateOfBirth: z.string().min(1),
  })
  .superRefine((data, ctx) => {
    if (data.candidateType === "EXPERIENCED") {
      if (!data.experienceYears || data.experienceYears <= 0) {
        ctx.addIssue({
          code: "custom",
          message: "Years of experience is required for experienced candidates.",
          path: ["experienceYears"],
        });
      }
      if (!data.previousOrganization?.trim()) {
        ctx.addIssue({
          code: "custom",
          message: "Previous organization name is required.",
          path: ["previousOrganization"],
        });
      }
      if (data.previousCtc == null || Number.isNaN(data.previousCtc)) {
        ctx.addIssue({
          code: "custom",
          message: "Previous salary (CTC) is required.",
          path: ["previousCtc"],
        });
      }
    }
  });

export const updateSalarySchema = z.object({
  salarySlab: z.enum(["SLAB_A", "SLAB_B", "SLAB_C", "CUSTOM"]).optional(),
  proposedCtc: z.coerce.number().min(0).optional(),
  finalCtc: z.coerce.number().min(0).optional(),
  salaryRemarks: z.string().max(500).optional(),
});

import mongoose, { InferSchemaType } from "mongoose";
import { LIFECYCLE_STAGES } from "@/lib/lifecycle";
import {
  CANDIDATE_TYPES,
  HIRING_DECISIONS,
  LEAD_STATUSES,
  REFERENCE_SOURCES,
  SALARY_SLABS,
  VERIFICATION_STAGES,
} from "@/lib/constants";

const CandidateSchema = new mongoose.Schema(
  {
    registrationId: { type: String, unique: true, sparse: true },
    registrationToken: { type: String, unique: true, sparse: true },
    registrationSubmittedAt: { type: Date, default: null },
    convertedAt: { type: Date, default: null },
    leadId: { type: mongoose.Schema.Types.ObjectId, ref: "Lead", default: null },
    fullName: { type: String, required: true, trim: true },
    email: { type: String, required: true, lowercase: true, trim: true },
    phone: { type: String, required: true, trim: true },
    city: { type: String, default: "", trim: true },
    state: { type: String, default: "" },
    address: { type: String, default: "" },
    pincode: { type: String, default: "" },
    dateOfBirth: { type: Date, default: null },
    candidateType: { type: String, enum: CANDIDATE_TYPES, default: "FRESHER" },
    qualification: { type: String, default: "" },
    education: { type: String, default: "" },
    experienceYears: { type: Number, default: 0 },
    previousOrganization: { type: String, default: "" },
    previousCtc: { type: Number, default: null },
    preferredRole: { type: String, default: "" },
    notes: { type: String, default: "" },
    leadStatus: { type: String, enum: LEAD_STATUSES, default: null },
    referenceSource: { type: String, enum: REFERENCE_SOURCES, default: null },
    leadComments: { type: String, default: "" },
    referenceName: { type: String, default: "", trim: true },
    gender: { type: String, default: "" },
    maritalStatus: { type: String, default: "" },
    fatherName: { type: String, default: "", trim: true },
    fatherPhone: { type: String, default: "", trim: true },
    motherName: { type: String, default: "", trim: true },
    motherPhone: { type: String, default: "", trim: true },
    currentAddress: { type: String, default: "" },
    permanentAddress: { type: String, default: "" },
    joiningDate: { type: Date, default: null },
    monthOfJoining: { type: String, default: "" },
    designation: { type: String, default: "", trim: true },
    department: { type: String, default: "", trim: true },
    employeeId: { type: String, default: "", trim: true },
    idCardPdfPath: { type: String, default: "" },
    idCardPdfFileName: { type: String, default: "" },
    idCardGeneratedAt: { type: Date, default: null },
    idCardEmailStatus: { type: String, default: "" },
    idCardEmailSentAt: { type: Date, default: null },
    idCardEmailError: { type: String, default: "" },
    aadharPanNumber: { type: String, default: "", trim: true },
    professionalPhotoPath: { type: String, default: "" },
    aadharPanPhotoPath: { type: String, default: "" },
    joiningDeclarationAccepted: { type: Boolean, default: false },
    policyComplianceAccepted: { type: Boolean, default: false },
    lifecycleStage: {
      type: String,
      enum: LIFECYCLE_STAGES,
      default: "REGISTRATION_SUBMITTED",
      required: true,
    },
    verificationRejected: { type: Boolean, default: false },
    verificationStage: {
      type: String,
      enum: VERIFICATION_STAGES,
      default: "DOCUMENTS_RECEIVED",
    },
    verificationRemarks: { type: String, default: "" },
    batchId: { type: mongoose.Schema.Types.ObjectId, ref: "Batch", default: null },
    trainingStatus: { type: String, default: "NOT_STARTED" },
    evaluationStatus: { type: String, default: "NOT_EVALUATED" },
    finalScore: { type: Number, default: null },
    evaluationRemarks: { type: String, default: "" },
    decision: { type: String, enum: HIRING_DECISIONS, default: null },
    decisionRemarks: { type: String, default: "" },
    salarySlab: { type: String, enum: SALARY_SLABS, default: null },
    proposedCtc: { type: Number, default: null },
    finalCtc: { type: Number, default: null },
    salaryRemarks: { type: String, default: "" },
  },
  { timestamps: true }
);

CandidateSchema.index({ email: 1 }, { name: "idx_candidate_email" });
CandidateSchema.index({ registrationId: 1 }, { unique: true, sparse: true, name: "idx_candidate_reg_id" });
CandidateSchema.index(
  { registrationToken: 1 },
  { unique: true, sparse: true, name: "idx_candidate_registration_token" }
);
CandidateSchema.index({ lifecycleStage: 1, updatedAt: -1 }, { name: "idx_candidate_lifecycle_updated" });
CandidateSchema.index({ leadStatus: 1, updatedAt: -1 }, { name: "idx_candidate_lead_status" });
CandidateSchema.index({ referenceSource: 1, leadStatus: 1 }, { name: "idx_candidate_lead_source" });
CandidateSchema.index(
  { verificationStage: 1, lifecycleStage: 1, updatedAt: -1 },
  { name: "idx_candidate_verification_lifecycle" }
);
CandidateSchema.index({ batchId: 1, lifecycleStage: 1 }, { name: "idx_candidate_batch_lifecycle" });
CandidateSchema.index({ createdAt: -1 }, { name: "idx_candidate_created_desc" });
CandidateSchema.index({ fullName: "text", email: "text", phone: "text" }, { name: "idx_candidate_text" });

export type CandidateDocument = InferSchemaType<typeof CandidateSchema> & {
  _id: mongoose.Types.ObjectId;
};

export const Candidate =
  (mongoose.models.Candidate as mongoose.Model<CandidateDocument> | undefined) ??
  mongoose.model<CandidateDocument>("Candidate", CandidateSchema);

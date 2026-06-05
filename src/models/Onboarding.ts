import mongoose, { InferSchemaType } from "mongoose";
import { ONBOARDING_SECTION_STATUSES, ONBOARDING_STATUSES } from "@/lib/constants";

const sectionStatusField = {
  type: String,
  enum: ONBOARDING_SECTION_STATUSES,
  default: "NOT_STARTED",
};

const OnboardingSchema = new mongoose.Schema(
  {
    candidateId: { type: mongoose.Schema.Types.ObjectId, ref: "Candidate", required: true, unique: true },
    accessToken: { type: String, unique: true, sparse: true },
    tokenGeneratedAt: { type: Date, default: null },
    personalInfo: {
      fullName: { type: String, default: "" },
      fatherName: { type: String, default: "" },
      motherName: { type: String, default: "" },
      dob: { type: Date, default: null },
      gender: { type: String, default: "" },
      maritalStatus: { type: String, default: "" },
      currentAddress: { type: String, default: "" },
      permanentAddress: { type: String, default: "" },
      emergencyContact: { type: String, default: "" },
      personalEmail: { type: String, default: "" },
      mobileNumber: { type: String, default: "" },
    },
    personalInfoStatus: sectionStatusField,
    personalInfoCorrections: { type: String, default: "" },
    personalInfoSubmittedAt: { type: Date, default: null },
    joiningFormStatus: sectionStatusField,
    joiningFormCorrections: { type: String, default: "" },
    joiningFormSubmittedAt: { type: Date, default: null },
    bankDetails: {
      accountHolderName: { type: String, default: "" },
      bankName: { type: String, default: "" },
      branchName: { type: String, default: "" },
      accountNumber: { type: String, default: "" },
      ifsc: { type: String, default: "" },
      cancelledChequePath: { type: String, default: "" },
    },
    bankDetailsStatus: sectionStatusField,
    bankDetailsCorrections: { type: String, default: "" },
    bankDetailsSubmittedAt: { type: Date, default: null },
    idCardInfo: {
      employeePhotoPath: { type: String, default: "" },
      bloodGroup: { type: String, default: "" },
      designation: { type: String, default: "" },
      department: { type: String, default: "" },
      emergencyContactName: { type: String, default: "" },
      emergencyContactNumber: { type: String, default: "" },
    },
    idCardInfoStatus: sectionStatusField,
    idCardInfoCorrections: { type: String, default: "" },
    idCardInfoSubmittedAt: { type: Date, default: null },
    status: { type: String, enum: ONBOARDING_STATUSES, default: "PENDING" },
    updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
  },
  { timestamps: true }
);

OnboardingSchema.index({ status: 1, updatedAt: -1 }, { name: "idx_onboarding_status_updated" });
OnboardingSchema.index({ accessToken: 1 }, { unique: true, sparse: true, name: "idx_onboarding_token" });

export type OnboardingDocument = InferSchemaType<typeof OnboardingSchema> & {
  _id: mongoose.Types.ObjectId;
};

export const Onboarding =
  (mongoose.models.Onboarding as mongoose.Model<OnboardingDocument> | undefined) ??
  mongoose.model<OnboardingDocument>("Onboarding", OnboardingSchema);

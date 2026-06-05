import mongoose, { InferSchemaType } from "mongoose";
import { ONBOARDING_SECTIONS } from "@/lib/constants";

const OnboardingReviewRecordSchema = new mongoose.Schema(
  {
    candidateId: { type: mongoose.Schema.Types.ObjectId, ref: "Candidate", required: true },
    section: { type: String, enum: ONBOARDING_SECTIONS, required: true },
    action: { type: String, enum: ["SUBMIT", "APPROVE", "REQUEST_CORRECTIONS"], required: true },
    previousStatus: { type: String, default: null },
    newStatus: { type: String, required: true },
    remarks: { type: String, default: "" },
    actorRole: { type: String, required: true },
    actorName: { type: String, required: true },
  },
  { timestamps: true }
);

OnboardingReviewRecordSchema.index(
  { candidateId: 1, createdAt: -1 },
  { name: "idx_onboarding_review_candidate_created" }
);

export type OnboardingReviewRecordDocument = InferSchemaType<typeof OnboardingReviewRecordSchema> & {
  _id: mongoose.Types.ObjectId;
};

export const OnboardingReviewRecord =
  (mongoose.models.OnboardingReviewRecord as mongoose.Model<OnboardingReviewRecordDocument> | undefined) ??
  mongoose.model<OnboardingReviewRecordDocument>("OnboardingReviewRecord", OnboardingReviewRecordSchema);

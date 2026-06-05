import mongoose, { InferSchemaType } from "mongoose";
import { VERIFICATION_STAGES } from "@/lib/constants";

const VerificationRecordSchema = new mongoose.Schema(
  {
    candidateId: { type: mongoose.Schema.Types.ObjectId, ref: "Candidate", required: true },
    previousStage: { type: String, default: null },
    stage: { type: String, enum: [...VERIFICATION_STAGES, "REJECTED"], required: true },
    action: {
      type: String,
      enum: ["ADVANCE", "SET_STAGE", "APPROVE", "REJECT"],
      required: true,
    },
    remarks: { type: String, default: "" },
    actorRole: { type: String, required: true },
    actorName: { type: String, required: true },
  },
  { timestamps: true }
);

VerificationRecordSchema.index({ candidateId: 1, createdAt: -1 }, { name: "idx_verification_candidate_created" });

export type VerificationRecordDocument = InferSchemaType<typeof VerificationRecordSchema> & {
  _id: mongoose.Types.ObjectId;
};

export const VerificationRecord =
  (mongoose.models.VerificationRecord as mongoose.Model<VerificationRecordDocument> | undefined) ??
  mongoose.model<VerificationRecordDocument>("VerificationRecord", VerificationRecordSchema);

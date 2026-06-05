import mongoose, { InferSchemaType } from "mongoose";
import { HIRING_DECISIONS } from "@/lib/constants";

const DecisionRecordSchema = new mongoose.Schema(
  {
    candidateId: { type: mongoose.Schema.Types.ObjectId, ref: "Candidate", required: true },
    previousDecision: { type: String, default: null },
    decision: { type: String, enum: HIRING_DECISIONS, required: true },
    remarks: { type: String, required: true },
    reassignBatchId: { type: mongoose.Schema.Types.ObjectId, ref: "Batch", default: null },
    reassignBatchName: { type: String, default: "" },
    actorRole: { type: String, required: true },
    actorName: { type: String, required: true },
  },
  { timestamps: true }
);

DecisionRecordSchema.index({ candidateId: 1, createdAt: -1 }, { name: "idx_decision_candidate_created" });

export type DecisionRecordDocument = InferSchemaType<typeof DecisionRecordSchema> & {
  _id: mongoose.Types.ObjectId;
};

export const DecisionRecord =
  (mongoose.models.DecisionRecord as mongoose.Model<DecisionRecordDocument> | undefined) ??
  mongoose.model<DecisionRecordDocument>("DecisionRecord", DecisionRecordSchema);

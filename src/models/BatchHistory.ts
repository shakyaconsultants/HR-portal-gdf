import mongoose, { InferSchemaType } from "mongoose";

export const BATCH_HISTORY_ACTIONS = ["ASSIGNED", "REMOVED", "TRANSFERRED"] as const;
export type BatchHistoryAction = (typeof BATCH_HISTORY_ACTIONS)[number];

const BatchHistorySchema = new mongoose.Schema(
  {
    candidateId: { type: mongoose.Schema.Types.ObjectId, ref: "Candidate", required: true },
    action: { type: String, enum: BATCH_HISTORY_ACTIONS, required: true },
    fromBatchId: { type: mongoose.Schema.Types.ObjectId, ref: "Batch", default: null },
    toBatchId: { type: mongoose.Schema.Types.ObjectId, ref: "Batch", default: null },
    reason: { type: String, default: "" },
    performedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    performedByName: { type: String, required: true },
    performedByRole: { type: String, required: true },
  },
  { timestamps: true }
);

BatchHistorySchema.index({ toBatchId: 1, createdAt: -1 }, { name: "idx_batch_history_to" });
BatchHistorySchema.index({ fromBatchId: 1, createdAt: -1 }, { name: "idx_batch_history_from" });
BatchHistorySchema.index({ candidateId: 1, createdAt: -1 }, { name: "idx_batch_history_candidate" });

export type BatchHistoryDocument = InferSchemaType<typeof BatchHistorySchema> & {
  _id: mongoose.Types.ObjectId;
};

export const BatchHistory =
  (mongoose.models.BatchHistory as mongoose.Model<BatchHistoryDocument> | undefined) ??
  mongoose.model<BatchHistoryDocument>("BatchHistory", BatchHistorySchema);

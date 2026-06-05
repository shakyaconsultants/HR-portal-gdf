import mongoose, { InferSchemaType } from "mongoose";

const BatchTransferSchema = new mongoose.Schema(
  {
    candidateId: { type: mongoose.Schema.Types.ObjectId, ref: "Candidate", required: true },
    fromBatchId: { type: mongoose.Schema.Types.ObjectId, ref: "Batch", required: true },
    toBatchId: { type: mongoose.Schema.Types.ObjectId, ref: "Batch", required: true },
    reason: { type: String, required: true },
    transferredBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  },
  { timestamps: true }
);

BatchTransferSchema.index({ candidateId: 1, createdAt: -1 }, { name: "idx_transfer_candidate_created" });
BatchTransferSchema.index({ toBatchId: 1, createdAt: -1 }, { name: "idx_transfer_to_batch_created" });

export type BatchTransferDocument = InferSchemaType<typeof BatchTransferSchema> & {
  _id: mongoose.Types.ObjectId;
};

export const BatchTransfer =
  (mongoose.models.BatchTransfer as mongoose.Model<BatchTransferDocument> | undefined) ??
  mongoose.model<BatchTransferDocument>("BatchTransfer", BatchTransferSchema);

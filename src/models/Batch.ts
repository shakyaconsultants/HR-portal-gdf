import mongoose, { InferSchemaType } from "mongoose";
import { BATCH_STATUSES } from "@/lib/constants";

const BatchSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    trainerName: { type: String, required: true, trim: true },
    startDate: { type: Date, required: true },
    endDate: { type: Date, required: true },
    status: { type: String, enum: BATCH_STATUSES, default: "PLANNED" },
    capacity: { type: Number, default: 30, min: 1 },
  },
  { timestamps: true }
);

BatchSchema.index({ name: 1 }, { unique: true, name: "idx_batch_name_unique" });
BatchSchema.index({ status: 1, startDate: 1 }, { name: "idx_batch_status_start" });

export type BatchDocument = InferSchemaType<typeof BatchSchema> & {
  _id: mongoose.Types.ObjectId;
};

export const Batch =
  (mongoose.models.Batch as mongoose.Model<BatchDocument> | undefined) ??
  mongoose.model<BatchDocument>("Batch", BatchSchema);

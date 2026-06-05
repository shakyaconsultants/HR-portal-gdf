import mongoose, { InferSchemaType } from "mongoose";

const LeadDocumentSchema = new mongoose.Schema(
  {
    leadId: { type: mongoose.Schema.Types.ObjectId, ref: "Lead", required: true },
    documentType: { type: String, enum: ["RESUME"], default: "RESUME", required: true },
    fileName: { type: String, required: true },
    filePath: { type: String, required: true },
    mimeType: { type: String, default: "" },
    fileSize: { type: Number, default: 0 },
  },
  { timestamps: true }
);

LeadDocumentSchema.index({ leadId: 1, createdAt: -1 }, { name: "idx_lead_docs" });

export type LeadDocumentFile = InferSchemaType<typeof LeadDocumentSchema> & {
  _id: mongoose.Types.ObjectId;
};

export const LeadDocument =
  (mongoose.models.LeadDocument as mongoose.Model<LeadDocumentFile> | undefined) ??
  mongoose.model<LeadDocumentFile>("LeadDocument", LeadDocumentSchema);

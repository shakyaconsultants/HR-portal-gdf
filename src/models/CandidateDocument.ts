import mongoose, { InferSchemaType } from "mongoose";
import { DOCUMENT_TYPES } from "@/lib/constants";

const CandidateDocumentSchema = new mongoose.Schema(
  {
    candidateId: { type: mongoose.Schema.Types.ObjectId, ref: "Candidate", required: true },
    documentType: { type: String, enum: DOCUMENT_TYPES, required: true },
    fileName: { type: String, required: true },
    filePath: { type: String, required: true },
    mimeType: { type: String, default: "" },
    fileSize: { type: Number, default: 0 },
  },
  { timestamps: true }
);

CandidateDocumentSchema.index({ candidateId: 1, createdAt: -1 }, { name: "idx_candidate_docs" });

export type CandidateDocumentDoc = InferSchemaType<typeof CandidateDocumentSchema> & {
  _id: mongoose.Types.ObjectId;
};

export const CandidateDocument =
  (mongoose.models.CandidateDocument as mongoose.Model<CandidateDocumentDoc> | undefined) ??
  mongoose.model<CandidateDocumentDoc>("CandidateDocument", CandidateDocumentSchema);

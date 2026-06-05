import mongoose, { InferSchemaType } from "mongoose";
import { DELIVERY_STATUSES } from "@/lib/constants";

const OfferLetterSchema = new mongoose.Schema(
  {
    candidateId: { type: mongoose.Schema.Types.ObjectId, ref: "Candidate", required: true },
    referenceNumber: { type: String, required: true, trim: true },
    candidateName: { type: String, required: true },
    designation: { type: String, required: true },
    department: { type: String, required: true },
    ctc: { type: String, required: true },
    joiningDate: { type: String, required: true },
    reportingManager: { type: String, required: true },
    offerDate: { type: String, required: true },
    pdfPath: { type: String, required: true },
    pdfFileName: { type: String, required: true },
    emailSubject: { type: String, required: true },
    emailBody: { type: String, required: true },
    sentToEmail: { type: String, required: true },
    sentAt: { type: Date, required: true },
    sentBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    sentByName: { type: String, required: true },
    emailStatus: { type: String, enum: DELIVERY_STATUSES, default: "SENT" },
    communicationLogId: { type: mongoose.Schema.Types.ObjectId, ref: "CommunicationLog", default: null },
  },
  { timestamps: true }
);

OfferLetterSchema.index({ candidateId: 1, sentAt: -1 }, { name: "idx_offer_candidate_sent" });
OfferLetterSchema.index({ referenceNumber: 1 }, { name: "idx_offer_reference" });

export type OfferLetterDocument = InferSchemaType<typeof OfferLetterSchema> & {
  _id: mongoose.Types.ObjectId;
};

export const OfferLetter =
  (mongoose.models.OfferLetter as mongoose.Model<OfferLetterDocument> | undefined) ??
  mongoose.model<OfferLetterDocument>("OfferLetter", OfferLetterSchema);

import mongoose, { InferSchemaType } from "mongoose";
import { DELIVERY_STATUSES } from "@/lib/constants";

const LetterOfIntentSchema = new mongoose.Schema(
  {
    leadId: { type: mongoose.Schema.Types.ObjectId, ref: "Lead", default: null },
    candidateId: { type: mongoose.Schema.Types.ObjectId, ref: "Candidate", default: null },
    referenceNumber: { type: String, required: true, trim: true },
    registrationLink: { type: String, required: true },
    emailSubject: { type: String, required: true },
    emailBody: { type: String, required: true },
    sentToEmail: { type: String, required: true },
    sentAt: { type: Date, required: true },
    sentBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    sentByName: { type: String, required: true },
    emailStatus: { type: String, enum: DELIVERY_STATUSES, default: "SENT" },
  },
  { timestamps: true }
);

LetterOfIntentSchema.index({ leadId: 1, sentAt: -1 }, { name: "idx_loi_lead_sent" });
LetterOfIntentSchema.index({ candidateId: 1, sentAt: -1 }, { name: "idx_loi_candidate_sent" });
LetterOfIntentSchema.index({ referenceNumber: 1 }, { name: "idx_loi_reference" });

export type LetterOfIntentDocument = InferSchemaType<typeof LetterOfIntentSchema> & {
  _id: mongoose.Types.ObjectId;
};

export const LetterOfIntent =
  (mongoose.models.LetterOfIntent as mongoose.Model<LetterOfIntentDocument> | undefined) ??
  mongoose.model<LetterOfIntentDocument>("LetterOfIntent", LetterOfIntentSchema);

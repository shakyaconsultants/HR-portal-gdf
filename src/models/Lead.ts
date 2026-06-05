import mongoose, { InferSchemaType } from "mongoose";
import { LEAD_STATUSES, REFERENCE_SOURCES } from "@/lib/constants";

const LeadSchema = new mongoose.Schema(
  {
    fullName: { type: String, required: true, trim: true },
    email: { type: String, required: true, lowercase: true, trim: true },
    phone: { type: String, required: true, trim: true },
    referenceSource: { type: String, enum: REFERENCE_SOURCES, required: true },
    referenceName: { type: String, default: "", trim: true },
    remarks: { type: String, default: "" },
    leadStatus: { type: String, enum: LEAD_STATUSES, default: "NEW_LEAD", required: true },
    registrationToken: { type: String, unique: true, sparse: true, default: null },
    registrationTokenExpiresAt: { type: Date, default: null },
    convertedAt: { type: Date, default: null },
    candidateId: { type: mongoose.Schema.Types.ObjectId, ref: "Candidate", default: null },
  },
  { timestamps: true }
);

LeadSchema.index({ email: 1 }, { name: "idx_lead_email" });
LeadSchema.index({ leadStatus: 1, updatedAt: -1 }, { name: "idx_lead_status_updated" });
LeadSchema.index({ convertedAt: 1, leadStatus: 1 }, { name: "idx_lead_active" });
LeadSchema.index(
  { registrationToken: 1 },
  { unique: true, sparse: true, name: "idx_lead_registration_token" }
);
LeadSchema.index({ fullName: "text", email: "text", phone: "text" }, { name: "idx_lead_text" });

export type LeadDocument = InferSchemaType<typeof LeadSchema> & {
  _id: mongoose.Types.ObjectId;
};

export const Lead =
  (mongoose.models.Lead as mongoose.Model<LeadDocument> | undefined) ??
  mongoose.model<LeadDocument>("Lead", LeadSchema);

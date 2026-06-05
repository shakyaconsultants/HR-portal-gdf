import mongoose, { InferSchemaType } from "mongoose";
import { COMMUNICATION_LOG_TYPES, DELIVERY_STATUSES } from "@/lib/constants";

const EmailAttachmentSchema = new mongoose.Schema(
  {
    fileName: { type: String, required: true },
    mimeType: { type: String, required: true },
    storagePath: { type: String, default: "" },
    size: { type: Number, default: 0 },
  },
  { _id: false }
);

const CommunicationLogSchema = new mongoose.Schema(
  {
    candidateId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Candidate",
      required: false,
      default: null,
    },
    leadId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Lead",
      required: false,
      default: null,
    },
    type: { type: String, enum: COMMUNICATION_LOG_TYPES, required: true },
    subject: { type: String, required: true },
    body: { type: String, required: true },
    htmlBody: { type: String, default: "" },
    attachments: { type: [EmailAttachmentSchema], default: [] },
    sentBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    sentByName: { type: String, required: true },
    sentToEmail: { type: String, required: true },
    sentAt: { type: Date, default: null },
    status: { type: String, enum: DELIVERY_STATUSES, default: "PENDING" },
    errorMessage: { type: String, default: "" },
    messageId: { type: String, default: "" },
    retryCount: { type: Number, default: 0 },
    relatedId: { type: mongoose.Schema.Types.ObjectId, default: null },
    relatedModel: { type: String, default: "" },
  },
  { timestamps: true }
);

CommunicationLogSchema.pre("validate", function () {
  if (!this.candidateId && !this.leadId) {
    this.invalidate("leadId", "Either candidateId or leadId is required.");
  }
});

CommunicationLogSchema.index({ candidateId: 1, createdAt: -1 }, { name: "idx_comm_candidate_created" });
CommunicationLogSchema.index({ leadId: 1, createdAt: -1 }, { name: "idx_comm_lead_created" });
CommunicationLogSchema.index({ type: 1, createdAt: -1 }, { name: "idx_comm_type_created" });
CommunicationLogSchema.index({ status: 1, createdAt: -1 }, { name: "idx_comm_status_created" });

export type CommunicationLogDocument = InferSchemaType<typeof CommunicationLogSchema> & {
  _id: mongoose.Types.ObjectId;
};

if (mongoose.models.CommunicationLog) {
  mongoose.deleteModel("CommunicationLog");
}

export const CommunicationLog = mongoose.model<CommunicationLogDocument>(
  "CommunicationLog",
  CommunicationLogSchema
);

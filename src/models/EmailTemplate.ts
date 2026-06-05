import mongoose, { InferSchemaType } from "mongoose";
import { EMAIL_TEMPLATE_TYPES } from "@/lib/constants";

const TemplateAttachmentSchema = new mongoose.Schema(
  {
    fileName: { type: String, required: true },
    mimeType: { type: String, default: "application/pdf" },
    storagePath: { type: String, required: true },
  },
  { _id: false }
);

const ActionButtonSchema = new mongoose.Schema(
  {
    enabled: { type: Boolean, default: false },
    label: { type: String, default: "Open Link" },
    url: { type: String, default: "" },
  },
  { _id: false }
);

const EmailTemplateSchema = new mongoose.Schema(
  {
    type: { type: String, enum: EMAIL_TEMPLATE_TYPES, required: true, unique: true },
    name: { type: String, required: true },
    subject: { type: String, required: true },
    htmlBody: { type: String, required: true },
    textBody: { type: String, default: "" },
    showLogo: { type: Boolean, default: true },
    actionButton: { type: ActionButtonSchema, default: () => ({}) },
    attachments: { type: [TemplateAttachmentSchema], default: [] },
    variables: { type: [String], default: [] },
    isActive: { type: Boolean, default: true },
    updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
  },
  { timestamps: true }
);

EmailTemplateSchema.index({ type: 1 }, { unique: true, name: "idx_email_template_type" });

export type EmailTemplateDocument = InferSchemaType<typeof EmailTemplateSchema> & {
  _id: mongoose.Types.ObjectId;
};

export const EmailTemplate =
  (mongoose.models.EmailTemplate as mongoose.Model<EmailTemplateDocument> | undefined) ??
  mongoose.model<EmailTemplateDocument>("EmailTemplate", EmailTemplateSchema);

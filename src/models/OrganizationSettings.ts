import mongoose, { InferSchemaType } from "mongoose";

const OrganizationSettingsSchema = new mongoose.Schema(
  {
    key: { type: String, default: "default", unique: true },
    companyName: { type: String, default: "GDF" },
    companyTagline: { type: String, default: "Training & Hiring Program" },
    companyAddressLine1: { type: String, default: "" },
    companyAddressLine2: { type: String, default: "" },
    companyAddressLine3: { type: String, default: "" },
    companyAddressLine4: { type: String, default: "" },
    hrName: { type: String, default: "Human Resources" },
    hrDesignation: { type: String, default: "HR Manager" },
    hrEmail: { type: String, default: "" },
    hrPhone: { type: String, default: "" },
    companyLogoPath: { type: String, default: "/gdf-logo.svg" },
    loiTemplateUrl: { type: String, default: "" },
    updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
  },
  { timestamps: true }
);

export type OrganizationSettingsDocument = InferSchemaType<typeof OrganizationSettingsSchema> & {
  _id: mongoose.Types.ObjectId;
};

export const OrganizationSettings =
  (mongoose.models.OrganizationSettings as mongoose.Model<OrganizationSettingsDocument> | undefined) ??
  mongoose.model<OrganizationSettingsDocument>("OrganizationSettings", OrganizationSettingsSchema);

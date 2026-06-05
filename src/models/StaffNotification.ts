import mongoose, { InferSchemaType } from "mongoose";

const StaffNotificationSchema = new mongoose.Schema(
  {
    type: {
      type: String,
      enum: ["NEW_REGISTRATION"],
      required: true,
    },
    title: { type: String, required: true },
    message: { type: String, required: true },
    candidateId: { type: mongoose.Schema.Types.ObjectId, ref: "Candidate", required: true },
    registrationId: { type: String, default: "" },
    readBy: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],
    audienceRoles: {
      type: [String],
      default: ["ADMIN", "HR"],
    },
  },
  { timestamps: true }
);

StaffNotificationSchema.index({ createdAt: -1 }, { name: "idx_notification_created" });
StaffNotificationSchema.index({ candidateId: 1 }, { name: "idx_notification_candidate" });

export type StaffNotificationDocument = InferSchemaType<typeof StaffNotificationSchema> & {
  _id: mongoose.Types.ObjectId;
};

export const StaffNotification =
  (mongoose.models.StaffNotification as mongoose.Model<StaffNotificationDocument> | undefined) ??
  mongoose.model<StaffNotificationDocument>("StaffNotification", StaffNotificationSchema);

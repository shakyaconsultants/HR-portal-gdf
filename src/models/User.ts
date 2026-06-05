import mongoose, { InferSchemaType, Model } from "mongoose";
import bcrypt from "bcryptjs";
import { USER_ROLES } from "@/lib/constants";

const UserSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    passwordHash: { type: String, required: true, select: false },
    role: { type: String, enum: USER_ROLES, required: true },
  },
  { timestamps: true }
);

UserSchema.index({ email: 1 }, { unique: true, name: "idx_user_email_unique" });

export type UserDocument = InferSchemaType<typeof UserSchema> & {
  _id: mongoose.Types.ObjectId;
};

export interface UserModel extends Model<UserDocument> {
  createWithPassword(input: {
    name: string;
    email: string;
    password: string;
    role: (typeof USER_ROLES)[number];
  }): Promise<UserDocument>;
}

UserSchema.static("createWithPassword", async function createWithPassword(input) {
  const passwordHash = await bcrypt.hash(input.password, 10);
  return this.create({
    name: input.name,
    email: input.email,
    role: input.role,
    passwordHash,
  });
});

export const User =
  (mongoose.models.User as UserModel | undefined) ??
  mongoose.model<UserDocument, UserModel>("User", UserSchema);

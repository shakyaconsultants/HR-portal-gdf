import mongoose, { InferSchemaType } from "mongoose";

const EmployeeSchema = new mongoose.Schema(
  {
    candidateId: { type: mongoose.Schema.Types.ObjectId, ref: "Candidate", required: true, unique: true },
    employeeCode: { type: String, required: true, unique: true },
    fullName: { type: String, required: true },
    email: { type: String, required: true },
    phone: { type: String, required: true },
    city: { type: String, required: true },
    joinedAt: { type: Date, required: true },
    source: { type: String, default: "TRAINEE_PORTAL" },
  },
  { timestamps: true }
);

EmployeeSchema.index({ employeeCode: 1 }, { unique: true, name: "idx_employee_code_unique" });
EmployeeSchema.index({ joinedAt: -1 }, { name: "idx_employee_joined_desc" });

export type EmployeeDocument = InferSchemaType<typeof EmployeeSchema> & {
  _id: mongoose.Types.ObjectId;
};

export const Employee =
  (mongoose.models.Employee as mongoose.Model<EmployeeDocument> | undefined) ??
  mongoose.model<EmployeeDocument>("Employee", EmployeeSchema);

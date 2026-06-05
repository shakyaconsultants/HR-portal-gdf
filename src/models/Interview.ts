import mongoose, { InferSchemaType } from "mongoose";
import {
  INTERVIEW_MODES,
  INTERVIEW_OUTCOMES,
  INTERVIEW_STATUSES,
} from "@/lib/constants";

const InterviewSchema = new mongoose.Schema(
  {
    leadId: { type: mongoose.Schema.Types.ObjectId, ref: "Lead", default: null },
    candidateId: { type: mongoose.Schema.Types.ObjectId, ref: "Candidate", default: null },
    interviewDate: { type: Date, required: true },
    interviewTime: { type: String, required: true, trim: true },
    interviewer: { type: String, required: true, trim: true },
    mode: { type: String, enum: INTERVIEW_MODES, required: true },
    instructions: { type: String, default: "" },
    status: { type: String, enum: INTERVIEW_STATUSES, default: "SCHEDULED" },
    outcome: { type: String, enum: INTERVIEW_OUTCOMES, default: null },
    outcomeRemarks: { type: String, default: "" },
    invitationSubject: { type: String, default: "" },
    invitationBody: { type: String, default: "" },
    invitationSentAt: { type: Date, default: null },
    invitationStatus: { type: String, default: "SENT" },
    scheduledBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    scheduledByName: { type: String, required: true },
    outcomeRecordedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
    outcomeRecordedByName: { type: String, default: "" },
    completedAt: { type: Date, default: null },
  },
  { timestamps: true }
);

InterviewSchema.index({ leadId: 1, createdAt: -1 }, { name: "idx_interview_lead" });
InterviewSchema.index({ candidateId: 1, createdAt: -1 }, { name: "idx_interview_candidate" });
InterviewSchema.index({ status: 1, interviewDate: 1 }, { name: "idx_interview_status_date" });

export type InterviewDocument = InferSchemaType<typeof InterviewSchema> & {
  _id: mongoose.Types.ObjectId;
};

export const Interview =
  (mongoose.models.Interview as mongoose.Model<InterviewDocument> | undefined) ??
  mongoose.model<InterviewDocument>("Interview", InterviewSchema);

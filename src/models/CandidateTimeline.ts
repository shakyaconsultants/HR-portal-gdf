import mongoose, { InferSchemaType } from "mongoose";

const CandidateTimelineSchema = new mongoose.Schema(
  {
    candidateId: { type: mongoose.Schema.Types.ObjectId, ref: "Candidate", required: true },
    action: { type: String, required: true },
    remarks: { type: String, default: "" },
    actorRole: { type: String, required: true },
    actorName: { type: String, required: true },
  },
  { timestamps: true }
);

CandidateTimelineSchema.index({ candidateId: 1, createdAt: -1 }, { name: "idx_timeline_candidate_created" });

export type CandidateTimelineDocument = InferSchemaType<typeof CandidateTimelineSchema> & {
  _id: mongoose.Types.ObjectId;
};

export const CandidateTimeline =
  (mongoose.models.CandidateTimeline as mongoose.Model<CandidateTimelineDocument> | undefined) ??
  mongoose.model<CandidateTimelineDocument>("CandidateTimeline", CandidateTimelineSchema);

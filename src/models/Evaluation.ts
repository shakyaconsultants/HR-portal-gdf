import mongoose, { InferSchemaType } from "mongoose";

const EvaluationSchema = new mongoose.Schema(
  {
    candidateId: { type: mongoose.Schema.Types.ObjectId, ref: "Candidate", required: true, unique: true },
    trainerId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    communicationSkills: { type: Number, required: true },
    confidenceLevel: { type: Number, required: true },
    productUnderstanding: { type: Number, required: true },
    salesPitch: { type: Number, required: true },
    objectionHandling: { type: Number, required: true },
    finalScore: { type: Number, required: true },
    remarks: { type: String, default: "" },
    evaluatorName: { type: String, required: true, trim: true },
    evaluatedAt: { type: Date, required: true },
  },
  { timestamps: true }
);

EvaluationSchema.index({ candidateId: 1 }, { unique: true, name: "idx_eval_candidate_unique" });
EvaluationSchema.index({ trainerId: 1, createdAt: -1 }, { name: "idx_eval_trainer_created" });
EvaluationSchema.index({ finalScore: -1 }, { name: "idx_eval_score_desc" });

export type EvaluationDocument = InferSchemaType<typeof EvaluationSchema> & {
  _id: mongoose.Types.ObjectId;
};

export const Evaluation =
  (mongoose.models.Evaluation as mongoose.Model<EvaluationDocument> | undefined) ??
  mongoose.model<EvaluationDocument>("Evaluation", EvaluationSchema);

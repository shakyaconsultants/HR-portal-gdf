import { Types } from "mongoose";
import { NextRequest } from "next/server";
import { connectDb } from "@/lib/db";
import { apiError, apiOk, requireAuth } from "@/lib/api";
import { updateDecisionSchema } from "@/lib/validators";
import { Candidate } from "@/models/Candidate";
import { Batch } from "@/models/Batch";
import { CandidateTimeline } from "@/models/CandidateTimeline";
import { DecisionRecord } from "@/models/DecisionRecord";
import { BatchTransfer } from "@/models/BatchTransfer";

type Params = { params: Promise<{ id: string }> };

export async function GET(request: NextRequest, { params }: Params) {
  const auth = await requireAuth(request, ["ADMIN", "HR"]);
  if (auth.error) return auth.error;

  const { id } = await params;
  if (!Types.ObjectId.isValid(id)) return apiError("Invalid candidate id", 422);

  await connectDb();

  const candidate = await Candidate.findById(id)
    .select("fullName lifecycleStage decision decisionRemarks finalScore evaluationStatus batchId")
    .populate({ path: "batchId", select: "name" })
    .lean();
  if (!candidate) return apiError("Candidate not found", 404);

  const history = await DecisionRecord.find({ candidateId: id }).sort({ createdAt: -1 }).limit(30).lean();

  return apiOk({
    candidate: {
      id,
      fullName: candidate.fullName,
      lifecycleStage: candidate.lifecycleStage,
      status: candidate.lifecycleStage,
      decision: candidate.decision,
      decisionRemarks: candidate.decisionRemarks,
      finalScore: candidate.finalScore,
      evaluationStatus: candidate.evaluationStatus,
    },
    history: history.map((h) => ({
      id: h._id.toString(),
      previousDecision: h.previousDecision,
      decision: h.decision,
      remarks: h.remarks,
      reassignBatchName: h.reassignBatchName,
      actorName: h.actorName,
      actorRole: h.actorRole,
      createdAt: h.createdAt,
    })),
  });
}

export async function PATCH(request: NextRequest, { params }: Params) {
  const auth = await requireAuth(request, ["ADMIN", "HR"]);
  if (auth.error || !auth.user) return auth.error;

  const { id } = await params;
  if (!Types.ObjectId.isValid(id)) return apiError("Invalid candidate id", 422);

  await connectDb();
  const body = await request.json();
  const parsed = updateDecisionSchema.safeParse({ ...body, candidateId: id });
  if (!parsed.success) {
    return apiError(parsed.error.issues[0]?.message ?? "Invalid payload", 422);
  }

  const { decision, remarks, reassignBatchId } = parsed.data;

  const existing = await Candidate.findById(id).select("fullName decision batchId evaluationStatus lifecycleStage");
  if (!existing) return apiError("Candidate not found", 404);

  if (existing.evaluationStatus !== "EVALUATED" && existing.lifecycleStage !== "HIRING_DECISION") {
    return apiError("Candidate must complete mock call evaluation before hiring decision.", 409);
  }

  if (decision === "HOLD" && reassignBatchId) {
    if (!Types.ObjectId.isValid(reassignBatchId)) return apiError("Invalid batch id", 422);
    const batch = await Batch.findById(reassignBatchId).select("name");
    if (!batch) return apiError("Reassignment batch not found", 404);
  }

  const update: Record<string, unknown> = {
    decision,
    decisionRemarks: remarks,
  };

  let reassignBatchName = "";
  const timelineRemarks = [`Decision: ${decision}`, remarks].filter(Boolean).join(" — ");

  if (decision === "SELECTED") {
    update.lifecycleStage = "OFFER_LETTER";
  } else if (decision === "REJECTED") {
    update.lifecycleStage = "HIRING_DECISION";
  } else if (decision === "HOLD" && reassignBatchId) {
    const batch = await Batch.findById(reassignBatchId).select("name");
    reassignBatchName = batch!.name;
    const fromBatchId = existing.batchId;

    update.batchId = reassignBatchId;
    update.lifecycleStage = "TRAINING";
    update.trainingStatus = "IN_PROGRESS";
    update.evaluationStatus = "NOT_EVALUATED";
    update.finalScore = null;

    if (fromBatchId && fromBatchId.toString() !== reassignBatchId) {
      await BatchTransfer.create({
        candidateId: id,
        fromBatchId,
        toBatchId: reassignBatchId,
        reason: `Hold reassignment: ${remarks}`,
        transferredBy: auth.user.userId,
      });
    }
  } else if (decision === "HOLD") {
    update.lifecycleStage = "HIRING_DECISION";
  }

  const candidate = await Candidate.findByIdAndUpdate(id, { $set: update }, { new: true })
    .select("fullName lifecycleStage decision decisionRemarks batchId")
    .lean();

  await Promise.all([
    DecisionRecord.create({
      candidateId: id,
      previousDecision: existing.decision,
      decision,
      remarks,
      reassignBatchId: reassignBatchId && Types.ObjectId.isValid(reassignBatchId) ? reassignBatchId : null,
      reassignBatchName,
      actorRole: auth.user.role,
      actorName: auth.user.name,
    }),
    CandidateTimeline.create({
      candidateId: id,
      action: "HIRING_DECISION_UPDATED",
      actorRole: auth.user.role,
      actorName: auth.user.name,
      remarks:
        decision === "HOLD" && reassignBatchName
          ? `${timelineRemarks}. Reassigned to batch ${reassignBatchName} for future training.`
          : timelineRemarks,
    }),
  ]);

  return apiOk({
    id: candidate!._id.toString(),
    fullName: candidate!.fullName,
    lifecycleStage: candidate!.lifecycleStage,
    status: candidate!.lifecycleStage,
    decision: candidate!.decision,
    reassigned: decision === "HOLD" && Boolean(reassignBatchId),
  });
}

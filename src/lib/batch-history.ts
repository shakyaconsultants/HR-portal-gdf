import { Types } from "mongoose";
import { BatchHistory, type BatchHistoryAction } from "@/models/BatchHistory";

export async function recordBatchHistory(input: {
  candidateId: string | Types.ObjectId;
  action: BatchHistoryAction;
  fromBatchId?: string | Types.ObjectId | null;
  toBatchId?: string | Types.ObjectId | null;
  reason?: string;
  performedBy: string;
  performedByName: string;
  performedByRole: string;
}) {
  return BatchHistory.create({
    candidateId: input.candidateId,
    action: input.action,
    fromBatchId: input.fromBatchId ?? null,
    toBatchId: input.toBatchId ?? null,
    reason: input.reason?.trim() ?? "",
    performedBy: input.performedBy,
    performedByName: input.performedByName,
    performedByRole: input.performedByRole,
  });
}

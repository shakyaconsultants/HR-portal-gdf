import { VERIFICATION_STAGES, VerificationStage } from "@/lib/constants";
import type { LifecycleStage } from "@/lib/lifecycle";

export function getStageIndex(stage: VerificationStage): number {
  return VERIFICATION_STAGES.indexOf(stage);
}

export function getNextStage(stage: VerificationStage): VerificationStage | null {
  const idx = getStageIndex(stage);
  if (idx < 0 || idx >= VERIFICATION_STAGES.length - 1) return null;
  return VERIFICATION_STAGES[idx + 1];
}

export function canSetStage(current: VerificationStage, target: VerificationStage): boolean {
  const currentIdx = getStageIndex(current);
  const targetIdx = getStageIndex(target);
  if (currentIdx < 0 || targetIdx < 0) return false;
  return targetIdx === currentIdx || targetIdx === currentIdx + 1;
}

export function stageToLifecycleStage(stage: VerificationStage): LifecycleStage {
  if (stage === "FINAL_APPROVED") return "BATCH_ASSIGNMENT";
  return "VERIFICATION";
}

export const PENDING_VERIFICATION_LIFECYCLE = "VERIFICATION" as const;

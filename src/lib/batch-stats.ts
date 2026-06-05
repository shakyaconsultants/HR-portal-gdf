type CandidateStatRow = {
  lifecycleStage?: string;
  status?: string;
  evaluationStatus?: string;
  finalScore?: number | null;
  decision?: string | null;
};

export type BatchStats = {
  total: number;
  evaluated: number;
  selected: number;
  hold: number;
  rejected: number;
};

export function computeBatchStats(candidates: CandidateStatRow[]): BatchStats {
  return {
    total: candidates.length,
    evaluated: candidates.filter(
      (c) =>
        c.lifecycleStage === "HIRING_DECISION" ||
        c.evaluationStatus === "EVALUATED" ||
        c.finalScore != null
    ).length,
    selected: candidates.filter((c) => c.decision === "SELECTED").length,
    hold: candidates.filter((c) => c.decision === "HOLD").length,
    rejected: candidates.filter((c) => c.decision === "REJECTED").length,
  };
}

export const emptyBatchStats: BatchStats = {
  total: 0,
  evaluated: 0,
  selected: 0,
  hold: 0,
  rejected: 0,
};

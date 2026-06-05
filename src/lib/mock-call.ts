export const MOCK_CALL_SECTION_MAX = 20;
export const MOCK_CALL_TOTAL_MAX = 100;

export const MOCK_CALL_CRITERIA = [
  { key: "communicationSkills", label: "Communication", max: MOCK_CALL_SECTION_MAX },
  { key: "confidenceLevel", label: "Confidence", max: MOCK_CALL_SECTION_MAX },
  { key: "productUnderstanding", label: "Product Knowledge", max: MOCK_CALL_SECTION_MAX },
  { key: "salesPitch", label: "Sales Pitch", max: MOCK_CALL_SECTION_MAX },
  { key: "objectionHandling", label: "Objection Handling", max: MOCK_CALL_SECTION_MAX },
] as const;

export type MockCallScoreKey = (typeof MOCK_CALL_CRITERIA)[number]["key"];

export type MockCallScores = Record<MockCallScoreKey, number>;

import type { LifecycleStage } from "@/lib/lifecycle";

export const MOCK_CALL_ELIGIBLE_STAGES = ["TRAINING", "FINAL_MOCK_CALL"] as const satisfies readonly LifecycleStage[];

export const MOCK_CALL_ELIGIBILITY_FILTER = {
  lifecycleStage: { $in: MOCK_CALL_ELIGIBLE_STAGES },
  evaluationStatus: "NOT_EVALUATED" as const,
  batchId: { $ne: null },
};

export function computeMockCallScore(scores: MockCallScores) {
  return MOCK_CALL_CRITERIA.reduce((sum, criterion) => sum + (scores[criterion.key] ?? 0), 0);
}

export function buildMockCallBreakdown(scores: MockCallScores) {
  const sections = MOCK_CALL_CRITERIA.map((criterion) => ({
    key: criterion.key,
    label: criterion.label,
    score: scores[criterion.key] ?? 0,
    max: criterion.max,
  }));
  return {
    sections,
    finalScore: computeMockCallScore(scores),
    maxScore: MOCK_CALL_TOTAL_MAX,
  };
}

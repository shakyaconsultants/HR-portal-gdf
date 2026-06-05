import type { LifecycleStage } from "@/lib/lifecycle";

export type PipelineColumn = {
  id: string;
  label: string;
  shortLabel: string;
  stages: LifecycleStage[];
  color: string;
};

/** Post-registration candidate pipeline only — no lead/interview/LOI stages. */
export const PIPELINE_COLUMNS: PipelineColumn[] = [
  {
    id: "verification",
    label: "Verification",
    shortLabel: "Verify",
    stages: ["REGISTRATION_SUBMITTED", "VERIFICATION"],
    color: "#c084fc",
  },
  {
    id: "training",
    label: "Training",
    shortLabel: "Train",
    stages: ["BATCH_ASSIGNMENT", "TRAINING"],
    color: "#6366f1",
  },
  { id: "mock", label: "Mock Call", shortLabel: "Mock", stages: ["FINAL_MOCK_CALL"], color: "#4f46e5" },
  { id: "hiring", label: "Hiring", shortLabel: "Hire", stages: ["HIRING_DECISION"], color: "#7c3aed" },
  {
    id: "offer",
    label: "Offer",
    shortLabel: "Offer",
    stages: ["OFFER_LETTER", "JOINING_INSTRUCTIONS"],
    color: "#8b5cf6",
  },
  { id: "employee", label: "Employee", shortLabel: "Emp", stages: ["EMPLOYEE"], color: "#10b981" },
];

export function pipelineColumnForStage(stage: string) {
  return PIPELINE_COLUMNS.find((col) => col.stages.includes(stage as LifecycleStage)) ?? PIPELINE_COLUMNS[0];
}

export function pipelineColumnById(id: string) {
  return PIPELINE_COLUMNS.find((c) => c.id === id) ?? null;
}

/** Dashboard candidate funnel — post-registration stages only. */
export const DASHBOARD_CANDIDATE_STAGES = [
  { id: "verification", label: "Verification", stages: ["REGISTRATION_SUBMITTED", "VERIFICATION"] as LifecycleStage[], color: "#c084fc" },
  { id: "training", label: "Training", stages: ["BATCH_ASSIGNMENT", "TRAINING"] as LifecycleStage[], color: "#6366f1" },
  { id: "mock", label: "Mock Call", stages: ["FINAL_MOCK_CALL"] as LifecycleStage[], color: "#4f46e5" },
  { id: "hiring", label: "Hiring", stages: ["HIRING_DECISION"] as LifecycleStage[], color: "#7c3aed" },
  { id: "offer", label: "Offer", stages: ["OFFER_LETTER", "JOINING_INSTRUCTIONS"] as LifecycleStage[], color: "#8b5cf6" },
  { id: "employee", label: "Employee", stages: ["EMPLOYEE"] as LifecycleStage[], color: "#10b981" },
] as const;

export function countForStages(counts: Record<string, number>, stages: LifecycleStage[]) {
  return stages.reduce((sum, s) => sum + (counts[s] ?? 0), 0);
}

/** @deprecated Use DASHBOARD_CANDIDATE_STAGES for candidate metrics */
export const DASHBOARD_PIPELINE_STAGES = DASHBOARD_CANDIDATE_STAGES;

import type { LifecycleStage } from "@/lib/lifecycle";
import { LIFECYCLE_STAGES } from "@/lib/lifecycle";

export type WorkflowMetricKey =
  | "totalLeads"
  | "interviewsScheduled"
  | "interviewSelected"
  | "loiSent"
  | "awaitingRegistration"
  | "underVerification"
  | "readyForBatch"
  | "inTraining"
  | "mockCallPending"
  | "hiringDecisionPending"
  | "selected"
  | "hold"
  | "rejected"
  | "offerLettersSent"
  | "onboardingPending"
  | "employeesCreated";

export type WorkflowMetric = {
  key: WorkflowMetricKey;
  label: string;
  href: string;
  accent: string;
  branch?: boolean;
};

export const HR_WORKFLOW_METRICS: WorkflowMetric[] = [
  { key: "totalLeads", label: "Total Leads", href: "/leads", accent: "accent-indigo" },
  { key: "interviewsScheduled", label: "Interviews Scheduled", href: "/interviews?tab=scheduled", accent: "accent-sky" },
  { key: "interviewSelected", label: "Interview Selected", href: "/interviews?tab=completed", accent: "accent-emerald" },
  { key: "loiSent", label: "LOI Sent", href: "/letter-of-intent?tab=sent", accent: "accent-violet" },
  { key: "awaitingRegistration", label: "Awaiting Registration", href: "/letter-of-intent?tab=pending", accent: "accent-amber" },
  { key: "underVerification", label: "Under Verification", href: "/verification?tab=pending", accent: "accent-sky" },
  { key: "readyForBatch", label: "Ready For Batch", href: "/batches?tab=assignment", accent: "accent-indigo" },
  { key: "inTraining", label: "In Training", href: "/batches?tab=training", accent: "accent-violet" },
  { key: "mockCallPending", label: "Mock Call Pending", href: "/evaluations?tab=pending", accent: "accent-amber" },
  { key: "hiringDecisionPending", label: "Hiring Decision Pending", href: "/hiring-decisions?tab=pending", accent: "accent-sky" },
  { key: "selected", label: "Selected", href: "/hiring-decisions?tab=selected", accent: "accent-emerald" },
  { key: "hold", label: "Hold", href: "/hiring-decisions?tab=hold", accent: "accent-amber", branch: true },
  { key: "rejected", label: "Rejected", href: "/hiring-decisions?tab=rejected", accent: "accent-rose", branch: true },
  { key: "offerLettersSent", label: "Offer Letters Sent", href: "/communications?tab=offer", accent: "accent-emerald" },
  { key: "onboardingPending", label: "Onboarding Pending", href: "/onboarding?tab=in_progress", accent: "accent-indigo" },
  { key: "employeesCreated", label: "Employees Created", href: "/employees", accent: "accent-emerald" },
];

/** Lifecycle stage used for cumulative “reached this step” funnel math */
const CUMULATIVE_STAGE: Partial<Record<WorkflowMetricKey, LifecycleStage>> = {
  totalLeads: "LEAD",
  interviewsScheduled: "INTERVIEW_SCHEDULED",
  interviewSelected: "INTERVIEW_SELECTED",
  loiSent: "LETTER_OF_INTENT_SENT",
  awaitingRegistration: "AWAITING_REGISTRATION",
  underVerification: "REGISTRATION_SUBMITTED",
  readyForBatch: "BATCH_ASSIGNMENT",
  inTraining: "TRAINING",
  mockCallPending: "FINAL_MOCK_CALL",
  hiringDecisionPending: "HIRING_DECISION",
  offerLettersSent: "OFFER_LETTER",
  onboardingPending: "JOINING_INSTRUCTIONS",
  employeesCreated: "EMPLOYEE",
};

const LINEAR_FUNNEL_KEYS: WorkflowMetricKey[] = [
  "totalLeads",
  "interviewsScheduled",
  "interviewSelected",
  "loiSent",
  "awaitingRegistration",
  "underVerification",
  "readyForBatch",
  "inTraining",
  "mockCallPending",
  "hiringDecisionPending",
  "selected",
  "offerLettersSent",
  "onboardingPending",
  "employeesCreated",
];

export function cumulativeLifecycleCount(
  lifecycleCounts: Record<string, number>,
  minStage: LifecycleStage
) {
  const idx = LIFECYCLE_STAGES.indexOf(minStage);
  if (idx < 0) return 0;
  return LIFECYCLE_STAGES.slice(idx).reduce((sum, stage) => sum + (lifecycleCounts[stage] ?? 0), 0);
}

export function buildWorkflowCounts(input: {
  lifecycleCounts: Record<string, number>;
  totalLeads: number;
  mockCallPending: number;
  hiringDecisionPending: number;
  selected: number;
  hold: number;
  rejected: number;
  offerLettersSent: number;
  onboardingPending: number;
}) {
  const lc = input.lifecycleCounts;

  return {
    totalLeads: input.totalLeads,
    interviewsScheduled: lc.INTERVIEW_SCHEDULED ?? 0,
    interviewSelected: lc.INTERVIEW_SELECTED ?? 0,
    loiSent: lc.LETTER_OF_INTENT_SENT ?? 0,
    awaitingRegistration: lc.AWAITING_REGISTRATION ?? 0,
    underVerification: (lc.REGISTRATION_SUBMITTED ?? 0) + (lc.VERIFICATION ?? 0),
    readyForBatch: lc.BATCH_ASSIGNMENT ?? 0,
    inTraining: lc.TRAINING ?? 0,
    mockCallPending: input.mockCallPending,
    hiringDecisionPending: input.hiringDecisionPending,
    selected: input.selected,
    hold: input.hold,
    rejected: input.rejected,
    offerLettersSent: input.offerLettersSent,
    onboardingPending: input.onboardingPending,
    employeesCreated: lc.EMPLOYEE ?? 0,
  } satisfies Record<WorkflowMetricKey, number>;
}

function cumulativeForMetric(
  key: WorkflowMetricKey,
  workflow: Record<WorkflowMetricKey, number>,
  lifecycleCounts: Record<string, number>
) {
  if (key === "selected") return workflow.selected;
  if (key === "hold") return workflow.hold;
  if (key === "rejected") return workflow.rejected;
  if (key === "mockCallPending") {
    return cumulativeLifecycleCount(lifecycleCounts, "FINAL_MOCK_CALL");
  }
  if (key === "underVerification") {
    return cumulativeLifecycleCount(lifecycleCounts, "REGISTRATION_SUBMITTED");
  }
  if (key === "totalLeads") {
    return Math.max(workflow.totalLeads, cumulativeLifecycleCount(lifecycleCounts, "LEAD"));
  }

  const stage = CUMULATIVE_STAGE[key];
  if (!stage) return workflow[key];
  return cumulativeLifecycleCount(lifecycleCounts, stage);
}

export type FunnelConversion = {
  from: WorkflowMetricKey;
  to: WorkflowMetricKey;
  fromLabel: string;
  toLabel: string;
  fromCount: number;
  toCount: number;
  rate: number | null;
};

export function buildFunnelConversions(
  workflow: Record<WorkflowMetricKey, number>,
  lifecycleCounts: Record<string, number>
): FunnelConversion[] {
  const labelByKey = Object.fromEntries(HR_WORKFLOW_METRICS.map((m) => [m.key, m.label])) as Record<
    WorkflowMetricKey,
    string
  >;

  const conversions: FunnelConversion[] = [];

  for (let i = 0; i < LINEAR_FUNNEL_KEYS.length - 1; i += 1) {
    const from = LINEAR_FUNNEL_KEYS[i];
    const to = LINEAR_FUNNEL_KEYS[i + 1];
    const fromCount = cumulativeForMetric(from, workflow, lifecycleCounts);
    const toCount = cumulativeForMetric(to, workflow, lifecycleCounts);
    const rate = fromCount > 0 ? Math.round((toCount / fromCount) * 100) : null;

    conversions.push({
      from,
      to,
      fromLabel: labelByKey[from],
      toLabel: labelByKey[to],
      fromCount,
      toCount,
      rate,
    });
  }

  return conversions;
}

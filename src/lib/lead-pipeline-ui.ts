import type { LeadStatus } from "@/lib/constants";

export type LeadPipelineColumn = {
  id: string;
  label: string;
  statuses: LeadStatus[];
  color: string;
};

export const LEAD_PIPELINE_COLUMNS: LeadPipelineColumn[] = [
  { id: "new", label: "New Lead", statuses: ["NEW_LEAD"], color: "#64748b" },
  { id: "interview", label: "Interview", statuses: ["INTERVIEW_SCHEDULED", "INTERVIEW_COMPLETED"], color: "#38bdf8" },
  { id: "selected", label: "Selected", statuses: ["SELECTED"], color: "#10b981" },
  { id: "loi", label: "LOI", statuses: ["LOI_SENT", "AWAITING_REGISTRATION"], color: "#818cf8" },
  { id: "hold", label: "Hold", statuses: ["HOLD"], color: "#f59e0b" },
  { id: "rejected", label: "Rejected", statuses: ["REJECTED"], color: "#ef4444" },
];

export function leadColumnForStatus(status: string) {
  return LEAD_PIPELINE_COLUMNS.find((col) => col.statuses.includes(status as LeadStatus)) ?? LEAD_PIPELINE_COLUMNS[0];
}

/** Dashboard lead funnel — pre-registration recruitment only. */
export const DASHBOARD_LEAD_STAGES = [
  { id: "new", label: "New Lead", statuses: ["NEW_LEAD"] as LeadStatus[], color: "#64748b" },
  {
    id: "interview",
    label: "Interview Scheduled",
    statuses: ["INTERVIEW_SCHEDULED", "INTERVIEW_COMPLETED"] as LeadStatus[],
    color: "#38bdf8",
  },
  { id: "selected", label: "Selected", statuses: ["SELECTED"] as LeadStatus[], color: "#10b981" },
  { id: "rejected", label: "Rejected", statuses: ["REJECTED"] as LeadStatus[], color: "#ef4444" },
  {
    id: "awaiting",
    label: "Awaiting Registration",
    statuses: ["LOI_SENT", "AWAITING_REGISTRATION"] as LeadStatus[],
    color: "#818cf8",
  },
] as const;

export function countForLeadStatuses(counts: Record<string, number>, statuses: LeadStatus[]) {
  return statuses.reduce((sum, s) => sum + (counts[s] ?? 0), 0);
}

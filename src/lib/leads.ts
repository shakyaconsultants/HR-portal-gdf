import type { LeadStatus } from "@/lib/constants";

export const LEAD_STATUS_LABELS: Record<LeadStatus, string> = {
  NEW_LEAD: "New Lead",
  INTERVIEW_SCHEDULED: "Interview Scheduled",
  INTERVIEW_COMPLETED: "Interview Completed",
  SELECTED: "Selected",
  REJECTED: "Rejected",
  HOLD: "Hold",
  LOI_SENT: "LOI Sent",
  AWAITING_REGISTRATION: "Awaiting Registration",
};

export const REFERENCE_SOURCE_LABELS: Record<string, string> = {
  LINKEDIN: "LinkedIn",
  NAUKRI: "Naukri",
  WALK_IN: "Walk In",
  REFERRAL: "Referral",
  INDEED: "Indeed",
  WEBSITE_APPLICATION: "Website Application",
  OTHER: "Other",
};

export function formatReferenceSource(source: string) {
  return REFERENCE_SOURCE_LABELS[source] ?? source;
}

export function formatLeadStatus(status: string) {
  return LEAD_STATUS_LABELS[status as LeadStatus] ?? status;
}

/** Active leads have not been converted to candidates yet. */
export function isActiveLead(lead: { convertedAt?: Date | null }) {
  return !lead.convertedAt;
}

export function leadStatusFromInterviewOutcome(outcome: string): LeadStatus {
  switch (outcome) {
    case "SELECTED":
      return "SELECTED";
    case "REJECTED":
      return "REJECTED";
    case "HOLD":
      return "HOLD";
    default:
      return "INTERVIEW_COMPLETED";
  }
}

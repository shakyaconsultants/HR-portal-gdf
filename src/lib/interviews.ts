import "server-only";
import { sendWorkflowEmail } from "@/lib/communications";
import { formatInterviewMode, formatInterviewTime } from "@/lib/interview-display";

export { formatInterviewMode, formatInterviewTime } from "@/lib/interview-display";

export async function sendInterviewInvitation(params: {
  leadId: string;
  to: string;
  sentBy: { userId: string; name: string };
  interviewId: string;
}) {
  const result = await sendWorkflowEmail({
    leadId: params.leadId,
    type: "INTERVIEW_INVITATION",
    to: params.to,
    sentBy: params.sentBy,
    relatedId: params.interviewId,
    relatedModel: "Interview",
    extras: { interviewId: params.interviewId },
  });
  return result.status;
}

export function parseInterviewDate(dateStr: string): Date | null {
  const date = new Date(dateStr);
  if (Number.isNaN(date.getTime())) return null;
  date.setHours(12, 0, 0, 0);
  return date;
}

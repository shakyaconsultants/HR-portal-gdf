import type { InterviewMode } from "@/lib/constants";

export const INTERVIEW_MODE_LABELS: Record<InterviewMode, string> = {
  OFFICE: "Office",
  GOOGLE_MEET: "Google Meet",
  PHONE_CALL: "Phone Call",
};

export function formatInterviewMode(mode: string) {
  return INTERVIEW_MODE_LABELS[mode as InterviewMode] ?? mode;
}

export function formatInterviewTime(time: string) {
  const match = /^(\d{1,2}):(\d{2})$/.exec(time.trim());
  if (!match) return time;
  const hours = Number(match[1]);
  const minutes = match[2];
  const period = hours >= 12 ? "PM" : "AM";
  const hour12 = hours % 12 === 0 ? 12 : hours % 12;
  return `${hour12}:${minutes} ${period}`;
}

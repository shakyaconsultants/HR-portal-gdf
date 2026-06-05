import type { CommunicationType } from "@/lib/constants";

/** Communications that must be sent as responsive HTML only — never attach PDFs. */
export const HTML_ONLY_EMAIL_TYPES: CommunicationType[] = [
  "INTERVIEW_INVITATION",
  "LETTER_OF_INTENT",
  "JOINING_INSTRUCTIONS",
  "ONBOARDING_INVITATION",
];

export function isHtmlOnlyEmailType(type: string) {
  return (HTML_ONLY_EMAIL_TYPES as string[]).includes(type);
}

export function isPdfEmailType(type: string) {
  return type === "OFFER_LETTER";
}

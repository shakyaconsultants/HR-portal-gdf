/** Variables available in all email templates */
export const EMAIL_VARIABLE_KEYS = [
  "candidateName",
  "candidateEmail",
  "registrationLink",
  "registrationExpiryDate",
  "onboardingLink",
  "joiningFormLink",
  "idCardFormLink",
  "joiningDate",
  "interviewDate",
  "interviewTime",
  "interviewMode",
  "designation",
  "department",
  "ctc",
  "reportingManager",
  "offerDate",
  "companyName",
  "companyAddress",
  "companyTagline",
  "hrName",
  "hrDesignation",
  "hrEmail",
  "hrPhone",
] as const;

export type EmailVariableKey = (typeof EMAIL_VARIABLE_KEYS)[number];

export type EmailVariableContext = Partial<Record<EmailVariableKey, string>>;

const VARIABLE_PATTERN = /\{\{\s*([a-zA-Z][a-zA-Z0-9]*)\s*\}\}/g;

export function substituteEmailVariables(template: string, context: EmailVariableContext) {
  return template.replace(VARIABLE_PATTERN, (_, key: string) => {
    const value = context[key as EmailVariableKey];
    return value ?? "";
  });
}

export function extractVariablesFromText(text: string) {
  const found = new Set<string>();
  for (const match of text.matchAll(VARIABLE_PATTERN)) {
    found.add(match[1]);
  }
  return [...found];
}

export function formatCompanyAddress(org: {
  companyAddressLine1?: string;
  companyAddressLine2?: string;
  companyAddressLine3?: string;
  companyAddressLine4?: string;
}) {
  return [org.companyAddressLine1, org.companyAddressLine2, org.companyAddressLine3, org.companyAddressLine4]
    .filter(Boolean)
    .join(", ");
}

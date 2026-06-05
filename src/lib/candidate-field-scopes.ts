/**
 * Field ownership by lifecycle phase. Central Candidate storage holds all values,
 * but each form may only read/write fields for its phase.
 */

/** Collected at LOI registration — never shown or written on onboarding forms as editable. */
export const REGISTRATION_CANDIDATE_FIELDS = [
  "fullName",
  "email",
  "phone",
  "dateOfBirth",
  "candidateType",
  "qualification",
  "education",
  "experienceYears",
  "previousOrganization",
  "previousCtc",
  "preferredRole",
  "city",
  "state",
  "pincode",
  "referenceSource",
  "referenceName",
  "leadComments",
  "notes",
] as const;

/** Set when offer letter is generated/sent — read-only in onboarding forms. */
export const OFFER_CANDIDATE_FIELDS = ["designation", "department", "joiningDate"] as const;

/** Collected only via onboarding forms after offer letter — never on registration. */
export const ONBOARDING_CANDIDATE_FIELDS = [
  "gender",
  "maritalStatus",
  "fatherName",
  "fatherPhone",
  "motherName",
  "motherPhone",
  "currentAddress",
  "permanentAddress",
  "monthOfJoining",
  "employeeId",
  "aadharPanNumber",
  "professionalPhotoPath",
  "aadharPanPhotoPath",
  "joiningDeclarationAccepted",
  "policyComplianceAccepted",
] as const;

export type RegistrationField = (typeof REGISTRATION_CANDIDATE_FIELDS)[number];
export type OfferField = (typeof OFFER_CANDIDATE_FIELDS)[number];
export type OnboardingField = (typeof ONBOARDING_CANDIDATE_FIELDS)[number];

const REGISTRATION_SET = new Set<string>(REGISTRATION_CANDIDATE_FIELDS);
const OFFER_SET = new Set<string>(OFFER_CANDIDATE_FIELDS);
const ONBOARDING_SET = new Set<string>(ONBOARDING_CANDIDATE_FIELDS);

export function isRegistrationField(key: string): key is RegistrationField {
  return REGISTRATION_SET.has(key);
}

export function isOfferField(key: string): key is OfferField {
  return OFFER_SET.has(key);
}

export function isOnboardingField(key: string): key is OnboardingField {
  return ONBOARDING_SET.has(key);
}

/** Strip unknown keys — registration API must never persist onboarding/offer fields. */
export function pickRegistrationUpdate(
  data: Record<string, unknown>
): Partial<Record<RegistrationField, unknown>> {
  const out: Partial<Record<RegistrationField, unknown>> = {};
  for (const key of REGISTRATION_CANDIDATE_FIELDS) {
    if (key in data && data[key] !== undefined) {
      (out as Record<string, unknown>)[key] = data[key];
    }
  }
  return out;
}

export function pickOfferUpdate(data: Record<string, unknown>): Partial<Record<OfferField, unknown>> {
  const out: Partial<Record<OfferField, unknown>> = {};
  for (const key of OFFER_CANDIDATE_FIELDS) {
    if (key in data && data[key] !== undefined) {
      (out as Record<string, unknown>)[key] = data[key];
    }
  }
  return out;
}

export function pickOnboardingUpdate(
  data: Record<string, unknown>
): Partial<Record<OnboardingField, unknown>> & { address?: string } {
  const out: Partial<Record<OnboardingField, unknown>> & { address?: string } = {};
  for (const key of ONBOARDING_CANDIDATE_FIELDS) {
    if (key in data && data[key] !== undefined) {
      (out as Record<string, unknown>)[key] = data[key];
    }
  }
  if (typeof data.currentAddress === "string") {
    out.address = data.currentAddress;
  }
  return out;
}

export function isPostOfferLifecycle(stage: string | undefined | null): boolean {
  if (!stage) return false;
  return ["OFFER_LETTER", "JOINING_INSTRUCTIONS", "EMPLOYEE"].includes(stage);
}

export function hasOnboardingProfileData(candidate: Record<string, unknown>): boolean {
  return ONBOARDING_CANDIDATE_FIELDS.some((key) => {
    const value = candidate[key];
    if (typeof value === "boolean") return value;
    return value !== null && value !== undefined && String(value).trim() !== "";
  });
}

/** Build Candidate $set payload from validated registration form only. */
export function buildRegistrationCandidateUpdate(parsed: {
  fullName: string;
  phone: string;
  candidateType: string;
  qualification: string;
  dateOfBirth: string;
  experienceYears?: number;
  previousOrganization?: string;
  previousCtc?: number | null;
}): Record<string, unknown> {
  const isExperienced = parsed.candidateType === "EXPERIENCED";
  return {
    fullName: parsed.fullName,
    phone: parsed.phone,
    candidateType: parsed.candidateType,
    qualification: parsed.qualification,
    education: parsed.qualification,
    experienceYears: isExperienced ? (parsed.experienceYears ?? 0) : 0,
    previousOrganization: isExperienced ? (parsed.previousOrganization ?? "") : "",
    previousCtc: isExperienced ? (parsed.previousCtc ?? null) : null,
    dateOfBirth: new Date(parsed.dateOfBirth),
  };
}

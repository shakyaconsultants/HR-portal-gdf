import "server-only";
import { Types } from "mongoose";
import { connectDb } from "@/lib/db";
import {
  ONBOARDING_CANDIDATE_FIELDS,
  REGISTRATION_CANDIDATE_FIELDS,
} from "@/lib/candidate-field-scopes";
import { Candidate } from "@/models/Candidate";
import { Lead } from "@/models/Lead";
import { OfferLetter } from "@/models/OfferLetter";
import { formatReferenceSource } from "@/lib/leads";

export type RegistrationPrefillSnapshot = {
  fullName: string;
  email: string;
  phone: string;
  referenceSource: string;
  referenceName: string;
};

export type CandidateProfileSnapshot = {
  fullName: string;
  email: string;
  phone: string;
  dateOfBirth: string;
  qualification: string;
  candidateType: string;
  experienceYears: string;
  previousOrganization: string;
  referenceSource: string;
  referenceName: string;
  gender: string;
  maritalStatus: string;
  fatherName: string;
  fatherPhone: string;
  motherName: string;
  motherPhone: string;
  currentAddress: string;
  permanentAddress: string;
  address: string;
  joiningDate: string;
  monthOfJoining: string;
  designation: string;
  department: string;
  employeeId: string;
  aadharPanNumber: string;
  professionalPhotoPath: string;
  aadharPanPhotoPath: string;
  joiningDeclarationAccepted: string;
  policyComplianceAccepted: string;
};

function formatDate(value: Date | string | null | undefined) {
  if (!value) return "";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "";
  return d.toISOString().slice(0, 10);
}

/** Registration link prefill — identity only, never onboarding/offer fields. */
export async function loadRegistrationPrefill(
  candidateId: string | Types.ObjectId
): Promise<RegistrationPrefillSnapshot | null> {
  await connectDb();
  const candidate = await Candidate.findById(candidateId)
    .select([...REGISTRATION_CANDIDATE_FIELDS, "leadId"].join(" "))
    .lean();
  if (!candidate) return null;

  const lead = candidate.leadId
    ? await Lead.findById(candidate.leadId).select("referenceSource referenceName").lean()
    : null;

  return {
    fullName: candidate.fullName ?? "",
    email: candidate.email ?? "",
    phone: candidate.phone ?? "",
    referenceSource: lead?.referenceSource ? formatReferenceSource(lead.referenceSource) : "",
    referenceName: lead?.referenceName ?? candidate.referenceName ?? "",
  };
}

/** Full snapshot for onboarding forms and admin profile (all phases). */
export async function loadOnboardingProfileSnapshot(
  candidateId: string | Types.ObjectId
): Promise<CandidateProfileSnapshot | null> {
  await connectDb();
  const candidate = await Candidate.findById(candidateId).lean();
  if (!candidate) return null;

  const [lead, offer] = await Promise.all([
    candidate.leadId ? Lead.findById(candidate.leadId).select("referenceSource referenceName").lean() : null,
    OfferLetter.findOne({ candidateId: candidate._id }).sort({ sentAt: -1 }).lean(),
  ]);

  const joiningDate = candidate.joiningDate ?? offer?.joiningDate ?? null;

  return {
    fullName: candidate.fullName ?? "",
    email: candidate.email ?? "",
    phone: candidate.phone ?? "",
    dateOfBirth: formatDate(candidate.dateOfBirth),
    qualification: candidate.qualification ?? "",
    candidateType: candidate.candidateType ?? "",
    experienceYears: candidate.experienceYears != null ? String(candidate.experienceYears) : "",
    previousOrganization: candidate.previousOrganization ?? "",
    referenceSource: lead?.referenceSource ? formatReferenceSource(lead.referenceSource) : "",
    referenceName: lead?.referenceName ?? candidate.referenceName ?? "",
    gender: candidate.gender ?? "",
    maritalStatus: candidate.maritalStatus ?? "",
    fatherName: candidate.fatherName ?? "",
    fatherPhone: candidate.fatherPhone ?? "",
    motherName: candidate.motherName ?? "",
    motherPhone: candidate.motherPhone ?? "",
    currentAddress: candidate.currentAddress ?? "",
    permanentAddress: candidate.permanentAddress ?? "",
    address: candidate.address ?? candidate.currentAddress ?? "",
    joiningDate: formatDate(joiningDate),
    monthOfJoining: candidate.monthOfJoining ?? "",
    designation: candidate.designation ?? offer?.designation ?? "",
    department: candidate.department ?? offer?.department ?? "",
    employeeId: candidate.employeeId ?? "",
    aadharPanNumber: candidate.aadharPanNumber ?? "",
    professionalPhotoPath: candidate.professionalPhotoPath ?? "",
    aadharPanPhotoPath: candidate.aadharPanPhotoPath ?? "",
    joiningDeclarationAccepted: candidate.joiningDeclarationAccepted ? "true" : "",
    policyComplianceAccepted: candidate.policyComplianceAccepted ? "true" : "",
  };
}

/** @deprecated Use loadOnboardingProfileSnapshot */
export async function loadCandidateProfileSnapshot(
  candidateId: string | Types.ObjectId
): Promise<CandidateProfileSnapshot | null> {
  return loadOnboardingProfileSnapshot(candidateId);
}

export function pickProfileFields(
  profile: CandidateProfileSnapshot,
  keys: Array<keyof CandidateProfileSnapshot>
): Record<string, string> {
  const out: Record<string, string> = {};
  for (const key of keys) {
    out[key] = profile[key] ?? "";
  }
  return out;
}

export { REGISTRATION_CANDIDATE_FIELDS, ONBOARDING_CANDIDATE_FIELDS };

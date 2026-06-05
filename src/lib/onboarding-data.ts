import type { OnboardingSection } from "@/lib/constants";
import { isOnboardingField } from "@/lib/candidate-field-scopes";
import { DESIGNATION_OPTIONS, JOINING_MONTHS } from "@/lib/designations";
import type { CandidateProfileSnapshot } from "@/lib/candidate-profile-prefill";

export type OnboardingFieldDef = {
  name: string;
  label: string;
  type?: "text" | "email" | "tel" | "date" | "textarea" | "select" | "file" | "checkbox";
  required?: boolean;
  readOnly?: boolean;
  options?: Array<{ value: string; label: string }>;
  accept?: string;
  hint?: string;
  profileKey?: keyof CandidateProfileSnapshot;
};

const designationOptions = DESIGNATION_OPTIONS.map((d) => ({ value: d, label: d }));
const monthOptions = JOINING_MONTHS.map((m) => ({ value: m, label: m }));

export const ONBOARDING_FIELD_LABELS: Record<string, string> = {
  fullName: "Full Name",
  phone: "Mobile Number",
  email: "Email ID",
  joiningDate: "Date of Joining",
  monthOfJoining: "Month of Joining",
  gender: "Gender",
  currentAddress: "Current Address",
  permanentAddress: "Permanent Address",
  fatherName: "Father's Name",
  fatherPhone: "Father's Phone Number",
  motherName: "Mother's Name",
  motherPhone: "Mother's Phone Number",
  designation: "Designation",
  maritalStatus: "Marital Status",
  professionalPhotoPath: "Professional Photo",
  aadharPanNumber: "Aadhar / PAN Card Number",
  aadharPanPhotoPath: "Aadhar / PAN Card Picture",
  employeeId: "Employee ID",
  address: "Address",
  joiningDeclarationAccepted: "Declaration",
  policyComplianceAccepted: "Policy Compliance Declaration",
};

export const JOINING_FORM_FIELDS: OnboardingFieldDef[] = [
  { name: "fullName", label: "Full Name", required: true, readOnly: true, profileKey: "fullName" },
  { name: "phone", label: "Mobile Number", type: "tel", required: true, readOnly: true, profileKey: "phone" },
  { name: "email", label: "Email ID", type: "email", required: true, readOnly: true, profileKey: "email" },
  { name: "joiningDate", label: "Date of Joining", type: "date", required: true, readOnly: true, profileKey: "joiningDate" },
  {
    name: "monthOfJoining",
    label: "Month of Joining",
    type: "select",
    required: true,
    options: monthOptions,
    profileKey: "monthOfJoining",
  },
  {
    name: "gender",
    label: "Gender",
    type: "select",
    required: true,
    options: [
      { value: "Male", label: "Male" },
      { value: "Female", label: "Female" },
      { value: "Other", label: "Other" },
    ],
    profileKey: "gender",
  },
  { name: "currentAddress", label: "Current Address", type: "textarea", required: true, profileKey: "currentAddress" },
  { name: "permanentAddress", label: "Permanent Address", type: "textarea", required: true, profileKey: "permanentAddress" },
  { name: "fatherName", label: "Father's Name", required: true, profileKey: "fatherName" },
  { name: "fatherPhone", label: "Father's Phone Number", type: "tel", required: true, profileKey: "fatherPhone" },
  { name: "motherName", label: "Mother's Name", required: true, profileKey: "motherName" },
  { name: "motherPhone", label: "Mother's Phone Number", type: "tel", required: true, profileKey: "motherPhone" },
  {
    name: "designation",
    label: "Designation",
    type: "select",
    required: true,
    readOnly: true,
    options: designationOptions,
    profileKey: "designation",
  },
  {
    name: "maritalStatus",
    label: "Marital Status",
    type: "select",
    required: true,
    options: [
      { value: "Married", label: "Married" },
      { value: "Un-Married", label: "Un-Married" },
      { value: "Does Not Wish To Specify", label: "Does Not Wish To Specify" },
    ],
    profileKey: "maritalStatus",
  },
  {
    name: "professionalPhotoPath",
    label: "Professional Photo",
    type: "file",
    required: true,
    accept: "image/*",
    hint: "A very professional photograph is required. Max 10 MB.",
    profileKey: "professionalPhotoPath",
  },
  { name: "aadharPanNumber", label: "Aadhar / PAN Card Number", required: true, profileKey: "aadharPanNumber" },
  {
    name: "aadharPanPhotoPath",
    label: "Aadhar / PAN Card Picture",
    type: "file",
    required: true,
    accept: "image/*,.pdf",
    profileKey: "aadharPanPhotoPath",
  },
  {
    name: "joiningDeclarationAccepted",
    label: "Declaration",
    type: "checkbox",
    required: true,
    hint: "I hereby declare that all documents and information submitted are true, complete, and correct to the best of my knowledge.",
  },
  {
    name: "policyComplianceAccepted",
    label: "Policy Compliance Declaration",
    type: "checkbox",
    required: true,
    hint: "I confirm that I shall abide by all rules, regulations, policies, and procedures of the Company during my employment or training period.",
  },
];

export const ID_CARD_FIELDS: OnboardingFieldDef[] = [
  {
    name: "gender",
    label: "Gender",
    type: "select",
    required: true,
    readOnly: true,
    options: [
      { value: "Ms.", label: "Ms." },
      { value: "Mr.", label: "Mr." },
    ],
    profileKey: "gender",
  },
  { name: "fullName", label: "Full Name", required: true, readOnly: true, profileKey: "fullName" },
  { name: "phone", label: "Mobile Number", type: "tel", required: true, readOnly: true, profileKey: "phone" },
  { name: "address", label: "Address", type: "textarea", readOnly: true, profileKey: "currentAddress" },
  { name: "email", label: "Email ID", type: "email", required: true, readOnly: true, profileKey: "email" },
  { name: "joiningDate", label: "Date of Joining", type: "date", required: true, readOnly: true, profileKey: "joiningDate" },
  {
    name: "employeeId",
    label: "Employee ID (put N/A if you do not know your ID)",
    required: true,
    profileKey: "employeeId",
  },
  {
    name: "designation",
    label: "Designation",
    type: "select",
    required: true,
    readOnly: true,
    options: designationOptions,
    profileKey: "designation",
  },
  {
    name: "professionalPhotoPath",
    label: "Professional Photo",
    type: "file",
    required: true,
    accept: "image/*",
    hint: "A very professional photograph is required. Max 10 MB.",
    profileKey: "professionalPhotoPath",
  },
];

export function fieldsForSection(section: OnboardingSection): OnboardingFieldDef[] {
  switch (section) {
    case "JOINING_FORM":
      return JOINING_FORM_FIELDS;
    case "ID_CARD":
      return ID_CARD_FIELDS;
  }
}

export function mapSectionFormData(
  profile: CandidateProfileSnapshot,
  section: OnboardingSection,
  sectionStatus: string
): Record<string, string> {
  const fields = fieldsForSection(section);
  const data: Record<string, string> = {};
  const sectionStarted = sectionStatus !== "NOT_STARTED";

  for (const field of fields) {
    const key = field.profileKey ?? (field.name as keyof CandidateProfileSnapshot);
    const isEditableOnboarding =
      !field.readOnly && (isOnboardingField(field.name) || field.type === "checkbox");

    if (isEditableOnboarding && !sectionStarted) {
      data[field.name] = "";
      continue;
    }

    if (field.type === "checkbox") {
      data[field.name] = String(profile[field.name as keyof CandidateProfileSnapshot] ?? "");
      continue;
    }

    let value = String(profile[key] ?? "");
    if (section === "ID_CARD" && field.name === "gender" && value) {
      if (value === "Female") value = "Ms.";
      else if (value === "Male") value = "Mr.";
    }
    data[field.name] = value;
  }
  return data;
}

export function isFileFieldKey(key: string) {
  return key.endsWith("Path") || key.endsWith("PhotoPath");
}

export type OnboardingRecordShape = {
  joiningFormStatus?: string;
  joiningFormCorrections?: string;
  idCardInfoStatus?: string;
  idCardInfoCorrections?: string;
  personalInfoStatus?: string;
  bankDetailsStatus?: string;
};

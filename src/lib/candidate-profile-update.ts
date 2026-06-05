import type { OnboardingSection } from "@/lib/constants";
import { pickOnboardingUpdate } from "@/lib/candidate-field-scopes";

export function buildCandidateUpdateFromOnboarding(
  section: OnboardingSection,
  data: Record<string, string>
): Record<string, unknown> {
  if (section === "JOINING_FORM") {
    return pickOnboardingUpdate({
      gender: data.gender ?? "",
      monthOfJoining: data.monthOfJoining ?? "",
      currentAddress: data.currentAddress ?? "",
      permanentAddress: data.permanentAddress ?? "",
      fatherName: data.fatherName ?? "",
      fatherPhone: data.fatherPhone ?? "",
      motherName: data.motherName ?? "",
      motherPhone: data.motherPhone ?? "",
      maritalStatus: data.maritalStatus ?? "",
      aadharPanNumber: data.aadharPanNumber ?? "",
      professionalPhotoPath: data.professionalPhotoPath ?? "",
      aadharPanPhotoPath: data.aadharPanPhotoPath ?? "",
      joiningDeclarationAccepted: data.joiningDeclarationAccepted === "true",
      policyComplianceAccepted: data.policyComplianceAccepted === "true",
    });
  }

  return pickOnboardingUpdate({
    employeeId: data.employeeId ?? "",
    professionalPhotoPath: data.professionalPhotoPath ?? "",
  });
}

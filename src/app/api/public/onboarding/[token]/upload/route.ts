import { NextRequest } from "next/server";
import { connectDb } from "@/lib/db";
import { apiError, apiOk } from "@/lib/api";
import { assertOnboardingAccess } from "@/lib/communication-prerequisites";
import { isOnboardingTokenExpired } from "@/lib/onboarding";
import { storeUploadedFile } from "@/lib/file-storage";
import type { OnboardingSection } from "@/lib/constants";
import { Onboarding } from "@/models/Onboarding";
import { Candidate } from "@/models/Candidate";

type Params = { params: Promise<{ token: string }> };

const ALLOWED_FIELDS: Record<OnboardingSection, string[]> = {
  JOINING_FORM: ["professionalPhotoPath", "aadharPanPhotoPath"],
  ID_CARD: ["professionalPhotoPath"],
};

export async function POST(request: NextRequest, { params }: Params) {
  const { token } = await params;
  if (!token || token.length < 16) return apiError("Invalid onboarding link", 422);

  await connectDb();
  const onboarding = await Onboarding.findOne({ accessToken: token }).lean();
  if (!onboarding) return apiError("Onboarding link not found", 404);
  if (isOnboardingTokenExpired(onboarding.tokenGeneratedAt)) {
    return apiError("This onboarding link has expired.", 410);
  }

  const candidate = await Candidate.findById(onboarding.candidateId).select("decision").lean();
  if (!candidate || candidate.decision !== "SELECTED") {
    return apiError("This onboarding link is no longer active.", 403);
  }

  const access = await assertOnboardingAccess(String(onboarding.candidateId));
  if (!access.ok) return apiError(access.message, 403);

  const formData = await request.formData();
  const section = String(formData.get("section") ?? "") as OnboardingSection;
  const field = String(formData.get("field") ?? "");
  const file = formData.get("file");

  if (!section || !ALLOWED_FIELDS[section]?.includes(field)) {
    return apiError("Invalid upload field", 422);
  }
  if (!(file instanceof File) || file.size === 0) {
    return apiError("No file uploaded", 422);
  }
  if (file.size > 10 * 1024 * 1024) {
    return apiError("File must be 10 MB or smaller", 422);
  }

  const candidateId = onboarding.candidateId.toString();
  const stored = await storeUploadedFile(file, `onboarding/${candidateId}`, field);
  await Candidate.updateOne({ _id: onboarding.candidateId }, { $set: { [field]: stored.url } });

  return apiOk({ path: stored.url, field });
}

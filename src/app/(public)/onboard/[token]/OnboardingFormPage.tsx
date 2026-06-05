import { OnboardingFormClient } from "@/components/onboarding/OnboardingFormClient";
import { PublicRegistrationShell } from "@/components/public/PublicRegistrationShell";
import { loadOnboardingProfileSnapshot } from "@/lib/candidate-profile-prefill";
import { connectDb } from "@/lib/db";
import { fieldsForSection, mapSectionFormData } from "@/lib/onboarding-data";
import {
  getSectionCorrections,
  getSectionStatus,
  isOnboardingTokenExpired,
  sectionCanEdit,
  sectionLabel,
} from "@/lib/onboarding";
import type { OnboardingSection } from "@/lib/constants";
import { Onboarding } from "@/models/Onboarding";
import { Candidate } from "@/models/Candidate";

export async function OnboardingFormPage({
  token,
  section,
}: {
  token: string;
  section: OnboardingSection;
  slug: string;
  title?: string;
}) {
  await connectDb();
  const onboarding = await Onboarding.findOne({ accessToken: token }).lean();
  if (!onboarding) {
    return (
      <PublicRegistrationShell>
        <div className="pub-form-panel pub-success-panel">
          <h2 className="pub-success-title">Link unavailable</h2>
          <p className="pub-success-text">This onboarding link is invalid or no longer active.</p>
        </div>
      </PublicRegistrationShell>
    );
  }

  if (isOnboardingTokenExpired(onboarding.tokenGeneratedAt)) {
    return (
      <PublicRegistrationShell>
        <div className="pub-form-panel pub-success-panel">
          <h2 className="pub-success-title">Link expired</h2>
          <p className="pub-success-text">This onboarding link has expired. Please contact HR for a new link.</p>
        </div>
      </PublicRegistrationShell>
    );
  }

  const candidate = await Candidate.findById(onboarding.candidateId).select("decision").lean();
  if (!candidate || candidate.decision !== "SELECTED") {
    return (
      <PublicRegistrationShell>
        <div className="pub-form-panel pub-success-panel">
          <h2 className="pub-success-title">Link unavailable</h2>
          <p className="pub-success-text">This onboarding link is no longer active.</p>
        </div>
      </PublicRegistrationShell>
    );
  }

  const profile = await loadOnboardingProfileSnapshot(onboarding.candidateId);
  if (!profile) {
    return (
      <PublicRegistrationShell>
        <div className="pub-form-panel pub-success-panel">
          <h2 className="pub-success-title">Profile not found</h2>
          <p className="pub-success-text">Unable to load your candidate profile.</p>
        </div>
      </PublicRegistrationShell>
    );
  }

  const status = getSectionStatus(onboarding, section);
  const corrections = getSectionCorrections(onboarding, section);

  return (
    <OnboardingFormClient
      token={token}
      section={section}
      title={sectionLabel(section)}
      fields={fieldsForSection(section)}
      initialData={mapSectionFormData(profile, section, status)}
      corrections={corrections}
      canEdit={sectionCanEdit(status)}
      sectionStatus={status as "NOT_STARTED" | "UNDER_REVIEW" | "APPROVED" | "CORRECTIONS_REQUESTED"}
      hubHref={`/onboard/${token}`}
    />
  );
}

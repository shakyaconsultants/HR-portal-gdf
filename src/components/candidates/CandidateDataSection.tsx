"use client";

import { Badge } from "@/components/ui/Badge";
import { PageSection } from "@/components/ui/PageSection";
import { hasOnboardingProfileData, isPostOfferLifecycle } from "@/lib/candidate-field-scopes";
import { formatStatusLabel, statusToVariant } from "@/lib/status-ui";

type CandidateData = Record<string, unknown>;

function display(value: unknown) {
  if (value === null || value === undefined || value === "") return "—";
  if (typeof value === "boolean") return value ? "Yes" : "No";
  if (value instanceof Date) return value.toLocaleDateString("en-IN");
  if (typeof value === "string" && /^\d{4}-\d{2}-\d{2}/.test(value)) {
    const d = new Date(value);
    if (!Number.isNaN(d.getTime())) return d.toLocaleDateString("en-IN");
  }
  return String(value);
}

function ProfileDataTable({
  title,
  rows,
}: {
  title: string;
  rows: Array<{ label: string; value: unknown; cell?: React.ReactNode }>;
}) {
  const visible = rows.filter((r) => r.cell !== undefined || display(r.value) !== "—");
  if (visible.length === 0) return null;

  return (
    <div className="profile-data-section">
      <h4 className="section-subtitle">{title}</h4>
      <div className="data-table-wrap profile-data-table-wrap">
        <table className="data-table profile-data-table">
          <thead>
            <tr>
              <th>Field</th>
              <th>Value</th>
            </tr>
          </thead>
          <tbody>
            {visible.map((row) => (
              <tr key={row.label}>
                <td className="profile-field-label">{row.label}</td>
                <td>{row.cell ?? display(row.value)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function FileLink({ path, label = "View file" }: { path: string; label?: string }) {
  if (!path) return <>—</>;
  return (
    <a href={path} target="_blank" rel="noreferrer" className="profile-link">
      {label}
    </a>
  );
}

function ProfilePhoto({ path, name }: { path: string; name: string }) {
  const initials = name
    .split(" ")
    .map((p) => p[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  if (path) {
    return (
      <div className="profile-data-photo-frame">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={path} alt={`${name} — professional photo`} className="profile-data-photo-img" />
      </div>
    );
  }

  return (
    <div className="profile-data-photo-frame profile-data-photo-placeholder" aria-hidden>
      {initials}
    </div>
  );
}

export function CandidateDataSection({ candidate }: { candidate: CandidateData }) {
  const lifecycleStage = String(candidate.lifecycleStage ?? candidate.status ?? "");
  const showOffer = isPostOfferLifecycle(lifecycleStage);
  const showOnboarding = showOffer && hasOnboardingProfileData(candidate);
  const fullName = String(candidate.fullName ?? "");
  const photoPath = String(candidate.professionalPhotoPath ?? "");
  const batch = candidate.batch as { name?: string; trainerName?: string } | null | undefined;

  return (
    <PageSection
      title="Profile data"
      description="Complete candidate record — registration, offer, and onboarding details in one view."
    >
      <div className="profile-data-hero">
        <ProfilePhoto path={photoPath} name={fullName} />
        <div className="profile-data-identity">
          <h3 className="profile-data-name">{fullName}</h3>
          <p className="profile-data-contact">
            {display(candidate.email)} · {display(candidate.phone)}
          </p>
          <div className="profile-data-badges">
            <Badge variant={statusToVariant(lifecycleStage)}>{formatStatusLabel(lifecycleStage)}</Badge>
            {candidate.registrationId ? (
              <span className="profile-data-meta">Reg ID: {String(candidate.registrationId)}</span>
            ) : null}
            {batch?.name ? <span className="batch-pill">{batch.name}</span> : null}
          </div>
        </div>
      </div>

      <ProfileDataTable
        title="Registration (LOI)"
        rows={[
          { label: "Full name", value: candidate.fullName },
          { label: "Email", value: candidate.email },
          { label: "Phone", value: candidate.phone },
          { label: "Date of birth", value: candidate.dateOfBirth },
          { label: "Candidate type", value: formatStatusLabel(String(candidate.candidateType ?? "")) },
          { label: "City", value: candidate.city },
          { label: "State", value: candidate.state },
          { label: "Pincode", value: candidate.pincode },
          { label: "Address", value: candidate.address },
        ]}
      />

      <ProfileDataTable
        title="Education & experience"
        rows={[
          { label: "Qualification", value: candidate.qualification },
          { label: "Education", value: candidate.education },
          { label: "Experience (years)", value: candidate.experienceYears },
          { label: "Previous organization", value: candidate.previousOrganization },
          { label: "Previous CTC", value: candidate.previousCtc },
          { label: "Preferred role", value: candidate.preferredRole },
        ]}
      />

      <ProfileDataTable
        title="Reference & lead"
        rows={[
          { label: "Reference source", value: formatStatusLabel(String(candidate.referenceSource ?? "")) },
          { label: "Reference name", value: candidate.referenceName },
          { label: "Lead comments", value: candidate.leadComments },
          { label: "Notes", value: candidate.notes },
        ]}
      />

      {showOffer ? (
        <ProfileDataTable
          title="Offer letter"
          rows={[
            { label: "Designation", value: candidate.designation },
            { label: "Department", value: candidate.department },
            { label: "Joining date", value: candidate.joiningDate },
            { label: "Salary slab", value: candidate.salarySlab },
            { label: "Proposed CTC", value: candidate.proposedCtc },
            { label: "Final CTC", value: candidate.finalCtc },
            { label: "Salary remarks", value: candidate.salaryRemarks },
          ]}
        />
      ) : (
        <p className="muted profile-data-note">Offer details appear here after the offer letter is sent.</p>
      )}

      {candidate.idCardPdfPath ? (
        <ProfileDataTable
          title="Employee ID card"
          rows={[
            {
              label: "ID card PDF",
              value: candidate.idCardPdfPath,
              cell: <FileLink path={String(candidate.idCardPdfPath)} label="Download / preview PDF" />,
            },
            { label: "Generated", value: candidate.idCardGeneratedAt },
            {
              label: "Email status",
              value: candidate.idCardEmailStatus,
              cell: candidate.idCardEmailStatus
                ? formatStatusLabel(String(candidate.idCardEmailStatus))
                : undefined,
            },
          ]}
        />
      ) : null}

      {showOnboarding ? (
        <>
          <ProfileDataTable
            title="Onboarding (post-offer)"
            rows={[
              { label: "Gender", value: candidate.gender },
              { label: "Marital status", value: candidate.maritalStatus },
              { label: "Father's name", value: candidate.fatherName },
              { label: "Father's phone", value: candidate.fatherPhone },
              { label: "Mother's name", value: candidate.motherName },
              { label: "Mother's phone", value: candidate.motherPhone },
              { label: "Current address", value: candidate.currentAddress },
              { label: "Permanent address", value: candidate.permanentAddress },
              { label: "Month of joining", value: candidate.monthOfJoining },
              { label: "Employee ID", value: candidate.employeeId },
              { label: "Aadhar / PAN number", value: candidate.aadharPanNumber },
              { label: "Joining declaration accepted", value: candidate.joiningDeclarationAccepted },
              { label: "Policy compliance accepted", value: candidate.policyComplianceAccepted },
            ]}
          />
          <ProfileDataTable
            title="Documents & photos"
            rows={[
              {
                label: "Professional photo",
                value: candidate.professionalPhotoPath,
                cell: photoPath ? (
                  <div className="profile-data-photo-inline">
                    <ProfilePhoto path={photoPath} name={fullName} />
                    <FileLink path={photoPath} label="Open full size" />
                  </div>
                ) : (
                  "—"
                ),
              },
              {
                label: "Aadhar / PAN photo",
                value: candidate.aadharPanPhotoPath,
                cell: candidate.aadharPanPhotoPath ? (
                  <div className="profile-data-photo-inline">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={String(candidate.aadharPanPhotoPath)}
                      alt="Aadhar / PAN"
                      className="profile-data-photo-thumb"
                    />
                    <FileLink path={String(candidate.aadharPanPhotoPath)} label="Open full size" />
                  </div>
                ) : (
                  "—"
                ),
              },
            ]}
          />
        </>
      ) : showOffer ? (
        <p className="muted profile-data-note">
          Onboarding details appear here after the candidate completes post-offer forms.
        </p>
      ) : null}
    </PageSection>
  );
}

"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { DocumentUploadField } from "@/components/public/DocumentUploadField";
import { PublicRegistrationShell } from "@/components/public/PublicRegistrationShell";
import { RegistrationStepper } from "@/components/public/RegistrationStepper";
import { REGISTRATION_DOCUMENT_TYPES } from "@/lib/constants";
import { formatStatusLabel } from "@/lib/status-ui";

const DOC_LABELS: Record<(typeof REGISTRATION_DOCUMENT_TYPES)[number], string> = {
  AADHAR: "Aadhar card",
  PAN: "PAN card",
  TENTH: "10th marksheet / certificate",
  TWELFTH: "12th marksheet / certificate",
  GRADUATION: "Graduation certificate",
};

type DetailsForm = {
  fullName: string;
  phone: string;
  email: string;
  candidateType: "FRESHER" | "EXPERIENCED";
  experienceYears: string;
  previousOrganization: string;
  previousCtc: string;
  qualification: string;
  dateOfBirth: string;
};

const initialDetails: DetailsForm = {
  fullName: "",
  phone: "",
  email: "",
  candidateType: "FRESHER",
  experienceYears: "",
  previousOrganization: "",
  previousCtc: "",
  qualification: "",
  dateOfBirth: "",
};

export function PublicRegisterForm({
  token,
  prefill,
  leadMeta,
  expiresAtLabel,
}: {
  token: string;
  prefill?: Partial<DetailsForm>;
  leadMeta?: { referenceSource?: string; referenceName?: string };
  expiresAtLabel?: string;
}) {
  const router = useRouter();
  const [stage, setStage] = useState<1 | 2>(1);
  const [details, setDetails] = useState<DetailsForm>({ ...initialDetails, ...prefill });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  function updateDetail<K extends keyof DetailsForm>(key: K, value: DetailsForm[K]) {
    setDetails((prev) => ({ ...prev, [key]: value }));
  }

  function validateStage1(): string | null {
    if (!details.fullName.trim()) return "Name is required.";
    if (!details.phone.trim()) return "Mobile number is required.";
    if (!details.email.trim()) return "Email is required.";
    if (!details.qualification.trim()) return "Qualification is required.";
    if (!details.dateOfBirth) return "Date of birth is required.";
    if (details.candidateType === "EXPERIENCED") {
      if (!details.experienceYears || Number(details.experienceYears) <= 0) {
        return "Years of experience is required.";
      }
      if (!details.previousOrganization.trim()) return "Previous organization name is required.";
      if (!details.previousCtc.trim() || Number(details.previousCtc) < 0) {
        return "Previous salary (CTC) is required.";
      }
    }
    return null;
  }

  function goToDocuments() {
    const err = validateStage1();
    if (err) {
      setError(err);
      return;
    }
    setError("");
    setStage(2);
    window.scrollTo(0, 0);
  }

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const stage1Error = validateStage1();
    if (stage1Error) {
      setError(stage1Error);
      setStage(1);
      return;
    }

    setLoading(true);
    setError("");

    const form = e.currentTarget;
    const formData = new FormData(form);

    formData.set("fullName", details.fullName.trim());
    formData.set("phone", details.phone.trim());
    formData.set("email", details.email.trim());
    formData.set("candidateType", details.candidateType);
    formData.set("qualification", details.qualification.trim());
    formData.set("dateOfBirth", details.dateOfBirth);
    formData.set(
      "experienceYears",
      details.candidateType === "EXPERIENCED" ? details.experienceYears : "0"
    );
    formData.set(
      "previousOrganization",
      details.candidateType === "EXPERIENCED" ? details.previousOrganization.trim() : ""
    );
    formData.set(
      "previousCtc",
      details.candidateType === "EXPERIENCED" ? details.previousCtc : ""
    );

    for (const docType of REGISTRATION_DOCUMENT_TYPES) {
      const file = formData.get(`file_${docType}`);
      if (!(file instanceof File) || file.size === 0) {
        setError(`Please upload ${DOC_LABELS[docType]}.`);
        setLoading(false);
        return;
      }
    }

    try {
      const res = await fetch(`/api/public/register/${token}`, { method: "POST", body: formData });
      const json = await res.json();
      if (!res.ok || !json.ok) {
        setError(json.message ?? "Registration failed. Please try again.");
        return;
      }

      const params = new URLSearchParams({
        id: json.data.registrationId,
        name: details.fullName,
      });
      router.push(`/apply/success?${params.toString()}`);
    } catch {
      setError("Network error. Check your connection and try again.");
    } finally {
      setLoading(false);
    }
  }

  const isExperienced = details.candidateType === "EXPERIENCED";

  return (
    <PublicRegistrationShell sidebar={<RegistrationStepper stage={stage} />}>
      <div className="pub-form-panel">
        {expiresAtLabel ? (
          <div className="pub-expiry-notice" role="status">
            <strong>Secure link expires:</strong> {expiresAtLabel}. Complete registration within 3 days of receiving
            your Letter of Intent.
          </div>
        ) : null}
        {stage === 1 ? (
          <div>
            <header className="pub-panel-head">
              <div>
                <p className="pub-panel-eyebrow">Step 1 of 2</p>
                <h2>Personal & professional details</h2>
                <p className="pub-panel-sub">
                  Complete your registration using the link from your Letter of Intent. All fields marked * are
                  mandatory.
                </p>
              </div>
            </header>

            <div className="pub-form-body">
              {leadMeta ? (
                <div className="pub-field-group">
                  <h3 className="pub-group-title">From your lead profile</h3>
                  <p className="pub-panel-sub">These details were captured when you were added as a lead and are already on file.</p>
                  <div className="pub-fields-grid">
                    {leadMeta.referenceSource ? (
                      <div className="pub-field">
                        <label>Source</label>
                        <input value={leadMeta.referenceSource} readOnly className="pub-input-readonly" />
                      </div>
                    ) : null}
                    {leadMeta.referenceName ? (
                      <div className="pub-field">
                        <label>Reference</label>
                        <input value={leadMeta.referenceName} readOnly className="pub-input-readonly" />
                      </div>
                    ) : null}
                  </div>
                </div>
              ) : null}

              <div className="pub-field-group">
                <h3 className="pub-group-title">Contact information</h3>
                <div className="pub-fields-grid">
                  <div className="pub-field">
                    <label htmlFor="fullName">
                      Full name <span className="pub-required">*</span>
                    </label>
                    <input
                      id="fullName"
                      value={details.fullName}
                      onChange={(e) => updateDetail("fullName", e.target.value)}
                      placeholder="As per official documents"
                      required
                      readOnly={Boolean(prefill?.fullName)}
                      className={prefill?.fullName ? "pub-input-readonly" : ""}
                      autoComplete="name"
                    />
                  </div>
                  <div className="pub-field">
                    <label htmlFor="phone">
                      Mobile number <span className="pub-required">*</span>
                    </label>
                    <input
                      id="phone"
                      type="tel"
                      value={details.phone}
                      onChange={(e) => updateDetail("phone", e.target.value)}
                      placeholder="10-digit mobile"
                      required
                      readOnly={Boolean(prefill?.phone)}
                      className={prefill?.phone ? "pub-input-readonly" : ""}
                      autoComplete="tel"
                      inputMode="tel"
                    />
                  </div>
                  <div className="pub-field pub-field-full">
                    <label htmlFor="email">
                      Email address <span className="pub-required">*</span>
                    </label>
                    <input
                      id="email"
                      type="email"
                      value={details.email}
                      onChange={(e) => updateDetail("email", e.target.value)}
                      placeholder="you@email.com"
                      required
                      readOnly
                      autoComplete="email"
                      inputMode="email"
                      className="pub-input-readonly"
                    />
                    <span className="pub-field-hint">Must match the email that received your Letter of Intent.</span>
                  </div>
                </div>
              </div>

              <div className="pub-field-group">
                <h3 className="pub-group-title">Background</h3>
                <div className="pub-fields-grid">
                  <div className="pub-field pub-field-full">
                    <span className="pub-field-label">I am a</span>
                    <div className="pub-segment" role="radiogroup" aria-label="Candidate type">
                      <button
                        type="button"
                        className={`pub-segment-btn ${details.candidateType === "FRESHER" ? "active" : ""}`}
                        onClick={() => updateDetail("candidateType", "FRESHER")}
                      >
                        Fresher
                      </button>
                      <button
                        type="button"
                        className={`pub-segment-btn ${details.candidateType === "EXPERIENCED" ? "active" : ""}`}
                        onClick={() => updateDetail("candidateType", "EXPERIENCED")}
                      >
                        Experienced
                      </button>
                    </div>
                    <input type="hidden" name="candidateType" value={details.candidateType} />
                  </div>

                  {isExperienced ? (
                    <div className="pub-experience-block pub-field-full">
                      <p className="pub-experience-note">Work history (required for experienced candidates)</p>
                      <div className="pub-fields-grid">
                        <div className="pub-field">
                          <label htmlFor="experienceYears">
                            Years of experience <span className="pub-required">*</span>
                          </label>
                          <input
                            id="experienceYears"
                            type="number"
                            min={1}
                            max={50}
                            value={details.experienceYears}
                            onChange={(e) => updateDetail("experienceYears", e.target.value)}
                            placeholder="e.g. 2"
                            inputMode="numeric"
                          />
                        </div>
                        <div className="pub-field">
                          <label htmlFor="previousCtc">
                            Previous CTC (₹/year) <span className="pub-required">*</span>
                          </label>
                          <input
                            id="previousCtc"
                            type="number"
                            min={0}
                            value={details.previousCtc}
                            onChange={(e) => updateDetail("previousCtc", e.target.value)}
                            placeholder="Annual package"
                            inputMode="numeric"
                          />
                        </div>
                        <div className="pub-field pub-field-full">
                          <label htmlFor="previousOrganization">
                            Previous organization <span className="pub-required">*</span>
                          </label>
                          <input
                            id="previousOrganization"
                            value={details.previousOrganization}
                            onChange={(e) => updateDetail("previousOrganization", e.target.value)}
                            placeholder="Company name"
                          />
                        </div>
                      </div>
                    </div>
                  ) : null}

                  <div className="pub-field">
                    <label htmlFor="qualification">
                      Highest qualification <span className="pub-required">*</span>
                    </label>
                    <input
                      id="qualification"
                      value={details.qualification}
                      onChange={(e) => updateDetail("qualification", e.target.value)}
                      placeholder="e.g. B.Com, MBA"
                      required
                    />
                  </div>
                  <div className="pub-field">
                    <label htmlFor="dateOfBirth">
                      Date of birth <span className="pub-required">*</span>
                    </label>
                    <input
                      id="dateOfBirth"
                      type="date"
                      value={details.dateOfBirth}
                      onChange={(e) => updateDetail("dateOfBirth", e.target.value)}
                      required
                    />
                  </div>
                </div>
              </div>
            </div>

            {error ? (
              <div className="pub-alert pub-alert-error" role="alert">
                {error}
              </div>
            ) : null}

            <footer className="pub-panel-footer">
              <button type="button" className="pub-btn pub-btn-primary" onClick={goToDocuments}>
                Continue to documents
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
                  <path d="M5 12h14M13 6l6 6-6 6" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </button>
            </footer>
          </div>
        ) : (
          <form onSubmit={handleSubmit}>
            <header className="pub-panel-head">
              <div>
                <p className="pub-panel-eyebrow">Step 2 of 2</p>
                <h2>Upload documents</h2>
                <p className="pub-panel-sub">Clear scans or photos. All five documents are required.</p>
              </div>
            </header>

            <div className="pub-form-body">
              <div className="pub-upload-grid">
                {REGISTRATION_DOCUMENT_TYPES.map((type) => (
                  <DocumentUploadField
                    key={type}
                    id={`file_${type}`}
                    name={`file_${type}`}
                    label={DOC_LABELS[type]}
                    required
                  />
                ))}
              </div>

              <div className="pub-summary">
                <span className="pub-summary-label">Review before submit</span>
                <div className="pub-summary-row">
                  <span>{details.fullName}</span>
                  <span>{details.phone}</span>
                  <span>{details.email}</span>
                </div>
                <p className="pub-summary-meta">
                  {formatStatusLabel(details.candidateType)} · {details.qualification}
                  {isExperienced ? ` · ${details.experienceYears} yrs experience` : ""}
                </p>
              </div>
            </div>

            {error ? (
              <div className="pub-alert pub-alert-error" role="alert">
                {error}
              </div>
            ) : null}

            <footer className="pub-panel-footer pub-panel-footer-split">
              <button
                type="button"
                className="pub-btn pub-btn-ghost"
                disabled={loading}
                onClick={() => {
                  setStage(1);
                  setError("");
                  window.scrollTo(0, 0);
                }}
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
                  <path d="M19 12H5M11 18l-6-6 6-6" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
                Back
              </button>
              <button type="submit" className="pub-btn pub-btn-primary" disabled={loading}>
                {loading ? "Submitting…" : "Submit application"}
              </button>
            </footer>
          </form>
        )}
      </div>
    </PublicRegistrationShell>
  );
}

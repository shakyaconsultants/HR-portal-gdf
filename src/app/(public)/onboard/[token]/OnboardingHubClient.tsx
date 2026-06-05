"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { PublicRegistrationShell } from "@/components/public/PublicRegistrationShell";
import { Badge } from "@/components/ui/Badge";
import { formatStatusLabel, sectionStatusToVariant } from "@/lib/status-ui";

type HubData = {
  companyName: string;
  programName: string;
  candidateName: string;
  progress: {
    completionPercent: number;
    submissionPercent: number;
    submittedCount: number;
    approvedCount: number;
    totalSections: number;
  };
  sections: Array<{ section: string; label: string; status: string; corrections: string }>;
};

const SECTION_PATH: Record<string, string> = {
  JOINING_FORM: "joining-form",
  ID_CARD: "id-card",
};

export function OnboardingHubClient({ token }: { token: string }) {
  const [data, setData] = useState<HubData | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    void fetch(`/api/public/onboarding/${token}`, { cache: "no-store" })
      .then((r) => r.json())
      .then((j) => {
        if (j.ok) setData(j.data);
        else setError(j.message ?? "Unable to load onboarding.");
      });
  }, [token]);

  if (error) {
    return (
      <PublicRegistrationShell>
        <div className="pub-form-panel pub-success-panel">
          <h2 className="pub-success-title">Onboarding unavailable</h2>
          <p className="pub-success-text">{error}</p>
        </div>
      </PublicRegistrationShell>
    );
  }

  if (!data) {
    return (
      <PublicRegistrationShell>
        <div className="hub-loading">
          <div className="loading-line" />
        </div>
      </PublicRegistrationShell>
    );
  }

  const total = data.progress.totalSections ?? 2;

  return (
    <PublicRegistrationShell>
      <div className="pub-form-panel">
        <header className="pub-panel-head">
          <div>
            <p className="pub-panel-eyebrow">
              {data.companyName} · {data.programName}
            </p>
            <h2>Welcome, {data.candidateName}</h2>
            <p className="pub-panel-sub">
              Complete both onboarding forms below. Your lead and registration details are already on file — you only
              need to fill in the remaining fields.
            </p>
          </div>
        </header>

        <div className="pub-form-body">
          <div className="pub-progress-summary">
            <span>
              Approved: <strong>{data.progress.approvedCount}</strong> / {total}
            </span>
            <span>
              Submitted: <strong>{data.progress.submittedCount}</strong> / {total}
            </span>
            <span>
              Progress: <strong>{data.progress.completionPercent}%</strong>
            </span>
          </div>

          <div className="pub-onboard-cards">
            {data.sections.map((s) => (
              <article key={s.section} className="pub-onboard-card">
                <div className="pub-onboard-card-head">
                  <strong>{s.label}</strong>
                  <Badge variant={sectionStatusToVariant(s.status)}>{formatStatusLabel(s.status)}</Badge>
                </div>
                {s.corrections ? <p className="pub-field-hint">{s.corrections}</p> : null}
                <Link href={`/onboard/${token}/${SECTION_PATH[s.section]}`} className="pub-text-link">
                  {s.status === "APPROVED"
                    ? "View approved submission →"
                    : s.status === "UNDER_REVIEW" || s.status === "SUBMITTED"
                      ? "View submission →"
                      : s.status === "CORRECTIONS_REQUESTED"
                        ? "Update form →"
                        : "Open form →"}
                </Link>
              </article>
            ))}
          </div>
        </div>
      </div>
    </PublicRegistrationShell>
  );
}

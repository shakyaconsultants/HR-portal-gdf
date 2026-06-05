"use client";

import { useState } from "react";
import { Field } from "@/components/ui/Field";
import { Badge } from "@/components/ui/Badge";
import { ONBOARDING_FIELD_LABELS, isFileFieldKey } from "@/lib/onboarding-data";
import { formatStatusLabel, sectionStatusToVariant } from "@/lib/status-ui";

type SectionData = {
  section: string;
  label: string;
  status: string;
  corrections: string;
  submittedAt?: string | null;
  data: Record<string, unknown>;
};

function DataValue({ fieldKey, value }: { fieldKey: string; value: unknown }) {
  if (!value) return <dd>—</dd>;
  const str = String(value);
  if (isFileFieldKey(fieldKey)) {
    const isImage = /\.(jpe?g|png|gif|webp)$/i.test(str);
    return (
      <dd>
        <a href={str} target="_blank" rel="noopener noreferrer">
          View file
        </a>
        {isImage ? <img src={str} alt={fieldKey} className="onboarding-upload-preview" /> : null}
      </dd>
    );
  }
  return <dd>{str}</dd>;
}

export function OnboardingReviewPanel({
  candidateId,
  sections,
  submitting,
  onReviewed,
}: {
  candidateId: string;
  sections: SectionData[];
  submitting: boolean;
  onReviewed: () => Promise<void>;
}) {
  const [remarks, setRemarks] = useState<Record<string, string>>({});
  const [actingSection, setActingSection] = useState<string | null>(null);

  async function review(section: string, action: "approve" | "request_corrections") {
    const note = remarks[section]?.trim() ?? "";
    if (action === "request_corrections" && note.length < 3) return;
    setActingSection(section);
    const res = await fetch(`/api/onboarding/${candidateId}/review`, {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        section,
        action,
        remarks: action === "approve" ? note || "Approved" : note,
      }),
    });
    if (res.ok) {
      setRemarks((prev) => ({ ...prev, [section]: "" }));
      await onReviewed();
    }
    setActingSection(null);
  }

  function isUnderReview(status: string) {
    return status === "UNDER_REVIEW" || status === "SUBMITTED";
  }

  return (
    <div className="onboarding-review-grid">
      {sections.map((s) => (
        <article key={s.section} className="onboarding-review-card">
          <div className="onboarding-review-header">
            <strong>{s.label}</strong>
            <Badge variant={sectionStatusToVariant(s.status)}>{formatStatusLabel(s.status)}</Badge>
          </div>

          {s.submittedAt ? (
            <p className="muted">Submitted {new Date(String(s.submittedAt)).toLocaleString()}</p>
          ) : null}

          {s.corrections ? (
            <p className="onboarding-corrections-note">Corrections requested: {s.corrections}</p>
          ) : null}

          <dl className="onboarding-data-preview">
            {Object.entries(s.data).map(([key, value]) => (
              <div key={key}>
                <dt>{ONBOARDING_FIELD_LABELS[key] ?? key}</dt>
                <DataValue fieldKey={key} value={value} />
              </div>
            ))}
          </dl>

          {isUnderReview(s.status) ? (
            <div className="onboarding-review-actions">
              <Field label="HR remarks">
                <textarea
                  rows={2}
                  value={remarks[s.section] ?? ""}
                  onChange={(e) => setRemarks((prev) => ({ ...prev, [s.section]: e.target.value }))}
                  placeholder="Required when requesting corrections…"
                />
              </Field>
              <div className="row">
                <button
                  type="button"
                  disabled={submitting || actingSection === s.section}
                  onClick={() => void review(s.section, "approve")}
                >
                  {actingSection === s.section ? "Saving…" : "Approve"}
                </button>
                <button
                  type="button"
                  className="btn-secondary"
                  disabled={submitting || actingSection === s.section || (remarks[s.section]?.trim().length ?? 0) < 3}
                  onClick={() => void review(s.section, "request_corrections")}
                >
                  Request corrections
                </button>
              </div>
            </div>
          ) : null}
        </article>
      ))}
    </div>
  );
}

"use client";

import Link from "next/link";
import { useState } from "react";
import { PublicRegistrationShell } from "@/components/public/PublicRegistrationShell";
import { useToast } from "@/components/ToastProvider";
import { Badge } from "@/components/ui/Badge";
import { getFriendlyApiMessage, parseApiResponse } from "@/lib/client-api";
import type { OnboardingFieldDef } from "@/lib/onboarding-data";
import { isFileFieldKey } from "@/lib/onboarding-data";
import type { OnboardingSection } from "@/lib/constants";
import { formatStatusLabel, sectionStatusToVariant } from "@/lib/status-ui";

type SectionStatus = "NOT_STARTED" | "UNDER_REVIEW" | "APPROVED" | "CORRECTIONS_REQUESTED";

export function OnboardingFormClient({
  token,
  section,
  title,
  fields,
  initialData,
  corrections,
  canEdit,
  sectionStatus,
  hubHref,
}: {
  token: string;
  section: OnboardingSection;
  title: string;
  fields: OnboardingFieldDef[];
  initialData: Record<string, string>;
  corrections: string;
  canEdit: boolean;
  sectionStatus: SectionStatus;
  hubHref: string;
}) {
  const toast = useToast();
  const [form, setForm] = useState(initialData);
  const [submitting, setSubmitting] = useState(false);
  const [uploadingField, setUploadingField] = useState<string | null>(null);
  const [status, setStatus] = useState<SectionStatus>(sectionStatus);

  const isLocked = status === "UNDER_REVIEW" || status === "APPROVED";

  async function uploadFile(fieldName: string, file: File) {
    setUploadingField(fieldName);
    const body = new FormData();
    body.set("section", section);
    body.set("field", fieldName);
    body.set("file", file);
    const res = await fetch(`/api/public/onboarding/${token}/upload`, { method: "POST", body });
    const json = await parseApiResponse(res);
    if (res.ok && json.ok) {
      const payload = json.data as { path?: string };
      setForm((prev) => ({ ...prev, [fieldName]: payload.path ?? "" }));
      toast.success("File uploaded.");
    } else {
      toast.error(getFriendlyApiMessage(json, "Unable to upload file."));
    }
    setUploadingField(null);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!canEdit || isLocked) return;
    setSubmitting(true);
    const res = await fetch(`/api/public/onboarding/${token}/submit`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ section, data: form }),
    });
    const json = await parseApiResponse(res);
    if (res.ok && json.ok) {
      toast.success("Form submitted for HR review.");
      setStatus("UNDER_REVIEW");
    } else {
      toast.error(getFriendlyApiMessage(json, "Unable to submit form."));
    }
    setSubmitting(false);
  }

  function renderField(f: OnboardingFieldDef) {
    const value = form[f.name] ?? "";
    const locked = f.readOnly || isLocked;

    if (f.type === "checkbox") {
      return (
        <label className="pub-checkbox-row">
          <input
            type="checkbox"
            checked={value === "true"}
            disabled={locked}
            onChange={(e) => setForm((prev) => ({ ...prev, [f.name]: e.target.checked ? "true" : "" }))}
          />
          <span>{f.hint}</span>
        </label>
      );
    }

    if (f.type === "textarea") {
      return (
        <textarea
          name={f.name}
          required={(f.required ?? true) && !locked}
          rows={3}
          value={value}
          readOnly={locked}
          className={locked ? "pub-input-readonly" : ""}
          onChange={(e) => setForm((prev) => ({ ...prev, [f.name]: e.target.value }))}
        />
      );
    }

    if (f.type === "select" && f.options) {
      return (
        <select
          name={f.name}
          required={(f.required ?? true) && !locked}
          value={value}
          disabled={locked}
          className={locked ? "pub-input-readonly" : ""}
          onChange={(e) => setForm((prev) => ({ ...prev, [f.name]: e.target.value }))}
        >
          <option value="">Select…</option>
          {f.options.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
      );
    }

    if (f.type === "file") {
      const currentPath = value;
      if (locked && currentPath) {
        return (
          <a href={currentPath} target="_blank" rel="noopener noreferrer" className="pub-field-hint">
            View uploaded file
          </a>
        );
      }
      return (
        <div className="pub-file-field">
          <input
            type="file"
            accept={f.accept}
            required={(f.required ?? true) && !currentPath}
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) void uploadFile(f.name, file);
            }}
          />
          {uploadingField === f.name ? <span className="pub-field-hint">Uploading…</span> : null}
          {currentPath ? (
            <a href={currentPath} target="_blank" rel="noopener noreferrer" className="pub-field-hint">
              Current file uploaded
            </a>
          ) : null}
        </div>
      );
    }

    return (
      <input
        type={f.type ?? "text"}
        name={f.name}
        required={(f.required ?? true) && !locked}
        value={value}
        readOnly={locked}
        className={locked ? "pub-input-readonly" : ""}
        onChange={(e) => setForm((prev) => ({ ...prev, [f.name]: e.target.value }))}
      />
    );
  }

  const readonlyFields = fields.filter((f) => f.readOnly);
  const editableFields = fields.filter((f) => !f.readOnly);

  return (
    <PublicRegistrationShell>
      <div className="pub-form-panel">
        <header className="pub-panel-head">
          <div>
            <Link href={hubHref} className="pub-back-link">
              ← Back to onboarding
            </Link>
            <h2>{title}</h2>
            <p className="pub-panel-sub">
              Information already on file from your lead profile and registration is shown below and does not need to be
              re-entered.
            </p>
          </div>
          <Badge variant={sectionStatusToVariant(status)}>{formatStatusLabel(status)}</Badge>
        </header>

        {corrections ? (
          <div className="pub-expiry-notice" role="alert">
            <strong>Corrections requested:</strong> {corrections}
          </div>
        ) : null}

        {status === "APPROVED" || status === "UNDER_REVIEW" ? (
          <div className="pub-form-body">
            <p className="pub-panel-sub">
              {status === "APPROVED"
                ? "This form has been approved by HR."
                : "Your submission is awaiting HR review."}
            </p>
            <dl className="pub-readonly-grid">
              {fields.map((f) => (
                <div key={f.name}>
                  <dt>{f.label}</dt>
                  <dd>
                    {f.type === "file" || isFileFieldKey(f.name) ? (
                      form[f.name] ? (
                        <a href={form[f.name]} target="_blank" rel="noopener noreferrer">
                          View file
                        </a>
                      ) : (
                        "—"
                      )
                    ) : f.type === "checkbox" ? (
                      form[f.name] === "true" ? "Accepted" : "—"
                    ) : (
                      form[f.name] || "—"
                    )}
                  </dd>
                </div>
              ))}
            </dl>
          </div>
        ) : (
          <form className="pub-form-body" onSubmit={(e) => void handleSubmit(e)}>
            {readonlyFields.length > 0 ? (
              <div className="pub-field-group">
                <h3 className="pub-group-title">Already on file</h3>
                <div className="pub-fields-grid">
                  {readonlyFields.map((f) => (
                    <div key={f.name} className={`pub-field ${f.type === "textarea" ? "pub-field-full" : ""}`}>
                      <label htmlFor={f.name}>{f.label}</label>
                      {renderField(f)}
                      {f.hint ? <span className="pub-field-hint">{f.hint}</span> : null}
                    </div>
                  ))}
                </div>
              </div>
            ) : null}

            {editableFields.length > 0 ? (
              <div className="pub-field-group">
                <h3 className="pub-group-title">Complete the following</h3>
                <div className="pub-fields-grid">
                  {editableFields.map((f) => (
                    <div
                      key={f.name}
                      className={`pub-field ${f.type === "textarea" || f.type === "checkbox" || f.type === "file" ? "pub-field-full" : ""}`}
                    >
                      {f.type !== "checkbox" ? (
                        <label htmlFor={f.name}>
                          {f.label}
                          {f.required !== false ? <span className="pub-required"> *</span> : null}
                        </label>
                      ) : null}
                      {renderField(f)}
                      {f.hint && f.type !== "checkbox" ? <span className="pub-field-hint">{f.hint}</span> : null}
                    </div>
                  ))}
                </div>
              </div>
            ) : null}

            <div className="pub-form-actions">
              <button type="submit" disabled={submitting || !canEdit || uploadingField !== null}>
                {submitting ? "Submitting…" : "Submit for HR review"}
              </button>
            </div>
          </form>
        )}
      </div>
    </PublicRegistrationShell>
  );
}

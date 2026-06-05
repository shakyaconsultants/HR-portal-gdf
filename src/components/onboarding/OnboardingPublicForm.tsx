"use client";

import { useState } from "react";
import Link from "next/link";
import { useToast } from "@/components/ToastProvider";
import { Badge } from "@/components/ui/Badge";
import { getFriendlyApiMessage, parseApiResponse } from "@/lib/client-api";
import type { OnboardingFieldDef } from "@/lib/onboarding-data";
import { isFileFieldKey } from "@/lib/onboarding-data";
import { formatStatusLabel, sectionStatusToVariant } from "@/lib/status-ui";

type SectionStatus = "NOT_STARTED" | "UNDER_REVIEW" | "APPROVED" | "CORRECTIONS_REQUESTED";

function candidateStatusLabel(status: SectionStatus) {
  if (status === "UNDER_REVIEW") return "Submitted";
  return formatStatusLabel(status);
}

function FieldPreview({ field, value }: { field: OnboardingFieldDef; value: string }) {
  if (!value) return <dd>—</dd>;
  if (field.type === "file" || isFileFieldKey(field.name)) {
    const isImage = /\.(jpe?g|png|gif|webp)$/i.test(value);
    return (
      <dd>
        <a href={value} target="_blank" rel="noopener noreferrer">
          View uploaded file
        </a>
        {isImage ? (
          <img src={value} alt={field.label} className="onboarding-upload-preview" />
        ) : null}
      </dd>
    );
  }
  return <dd>{value}</dd>;
}

export function OnboardingPublicForm({
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
  section: "PERSONAL_INFO" | "BANK_DETAILS" | "ID_CARD";
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
    if (f.type === "textarea") {
      return (
        <textarea
          name={f.name}
          required={f.required ?? true}
          rows={3}
          value={form[f.name] ?? ""}
          onChange={(e) => setForm((prev) => ({ ...prev, [f.name]: e.target.value }))}
        />
      );
    }
    if (f.type === "select" && f.options) {
      return (
        <select
          name={f.name}
          required={f.required ?? true}
          value={form[f.name] ?? ""}
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
      const currentPath = form[f.name] ?? "";
      return (
        <div className="onboarding-file-field">
          <input
            type="file"
            accept={f.accept}
            required={(f.required ?? true) && !currentPath}
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) void uploadFile(f.name, file);
            }}
          />
          {uploadingField === f.name ? <span className="muted">Uploading…</span> : null}
          {currentPath ? (
            <a href={currentPath} target="_blank" rel="noopener noreferrer" className="onboarding-upload-link">
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
        required={f.required ?? true}
        value={form[f.name] ?? ""}
        onChange={(e) => setForm((prev) => ({ ...prev, [f.name]: e.target.value }))}
      />
    );
  }

  return (
    <div className="public-onboard-form-wrap">
      <Link href={hubHref} className="back-link">
        ← Back to onboarding hub
      </Link>
      <div className="onboarding-review-header">
        <h1>{title}</h1>
        <Badge variant={sectionStatusToVariant(status)}>{candidateStatusLabel(status)}</Badge>
      </div>

      {corrections ? (
        <div className="onboarding-corrections-banner">
          <strong>Corrections requested by HR:</strong>
          <p>{corrections}</p>
        </div>
      ) : null}

      {status === "APPROVED" ? (
        <div className="public-onboard-readonly">
          <p className="public-success-msg">This form has been approved by HR.</p>
          <dl className="onboarding-data-preview">
            {fields.map((f) => (
              <div key={f.name}>
                <dt>{f.label}</dt>
                <FieldPreview field={f} value={form[f.name] ?? ""} />
              </div>
            ))}
          </dl>
        </div>
      ) : status === "UNDER_REVIEW" ? (
        <div className="public-onboard-readonly">
          <p className="public-info-msg">Your submission is awaiting HR review. You cannot edit until HR responds.</p>
          <dl className="onboarding-data-preview">
            {fields.map((f) => (
              <div key={f.name}>
                <dt>{f.label}</dt>
                <FieldPreview field={f} value={form[f.name] ?? ""} />
              </div>
            ))}
          </dl>
        </div>
      ) : (
        <form className="public-onboard-form" onSubmit={(e) => void handleSubmit(e)}>
          {fields.map((f) => (
            <label key={f.name} className="public-field">
              <span>{f.label}</span>
              {renderField(f)}
            </label>
          ))}
          <button type="submit" disabled={submitting || !canEdit || uploadingField !== null}>
            {submitting ? "Submitting…" : "Submit for review"}
          </button>
        </form>
      )}
    </div>
  );
}

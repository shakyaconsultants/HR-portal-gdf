"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useToast } from "@/components/ToastProvider";
import { Field } from "@/components/ui/Field";
import { PageSection } from "@/components/ui/PageSection";
import { getFriendlyApiMessage, parseApiResponse } from "@/lib/client-api";

type Settings = {
  companyName: string;
  companyTagline: string;
  companyAddressLine1: string;
  companyAddressLine2: string;
  companyAddressLine3: string;
  companyAddressLine4: string;
  hrName: string;
  hrDesignation: string;
  hrEmail: string;
  hrPhone: string;
  companyLogoPath: string;
};

export function OrganizationSettingsClient() {
  const toast = useToast();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [smtpConfigured, setSmtpConfigured] = useState(false);
  const [form, setForm] = useState<Settings>({
    companyName: "",
    companyTagline: "",
    companyAddressLine1: "",
    companyAddressLine2: "",
    companyAddressLine3: "",
    companyAddressLine4: "",
    hrName: "",
    hrDesignation: "",
    hrEmail: "",
    hrPhone: "",
    companyLogoPath: "/gdf-logo.svg",
  });

  useEffect(() => {
    void fetch("/api/organization-settings", { cache: "no-store" })
      .then((r) => r.json())
      .then((json) => {
        if (json.ok) {
          setForm(json.data.settings);
          setSmtpConfigured(json.data.smtpConfigured);
        }
        setLoading(false);
      });
  }, []);

  async function save() {
    setSaving(true);
    const res = await fetch("/api/organization-settings", {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(form),
    });
    const json = await parseApiResponse(res);
    if (res.ok && json.ok) {
      toast.success("Organization settings saved.");
      setForm((json.data as { settings: Settings }).settings);
    } else {
      toast.error(getFriendlyApiMessage(json, "Unable to save settings."));
    }
    setSaving(false);
  }

  if (loading) return <div className="loading-line" />;

  return (
    <div className="stack-lg">
      <p>
        <Link href="/email" className="profile-link">
          ← Back to Email Management
        </Link>
      </p>

      <PageSection
        title="Organization settings"
        description="Branding and HR contact details used in all email templates. SMTP credentials are configured via environment variables."
      >
        <div className={`smtp-status-banner ${smtpConfigured ? "ok" : "warn"}`}>
          SMTP: {smtpConfigured ? "Configured" : "Not configured — set SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS, SMTP_FROM in .env.local"}
        </div>

        <div className="org-settings-form">
          <Field label="Company name">
            <input value={form.companyName} onChange={(e) => setForm({ ...form, companyName: e.target.value })} />
          </Field>
          <Field label="Company tagline">
            <input value={form.companyTagline} onChange={(e) => setForm({ ...form, companyTagline: e.target.value })} />
          </Field>
          <Field label="Address line 1">
            <input
              value={form.companyAddressLine1}
              onChange={(e) => setForm({ ...form, companyAddressLine1: e.target.value })}
            />
          </Field>
          <Field label="Address line 2">
            <input
              value={form.companyAddressLine2}
              onChange={(e) => setForm({ ...form, companyAddressLine2: e.target.value })}
            />
          </Field>
          <Field label="Address line 3">
            <input
              value={form.companyAddressLine3}
              onChange={(e) => setForm({ ...form, companyAddressLine3: e.target.value })}
            />
          </Field>
          <Field label="Address line 4">
            <input
              value={form.companyAddressLine4}
              onChange={(e) => setForm({ ...form, companyAddressLine4: e.target.value })}
            />
          </Field>
          <Field label="HR name">
            <input value={form.hrName} onChange={(e) => setForm({ ...form, hrName: e.target.value })} />
          </Field>
          <Field label="HR designation">
            <input value={form.hrDesignation} onChange={(e) => setForm({ ...form, hrDesignation: e.target.value })} />
          </Field>
          <Field label="HR email">
            <input type="email" value={form.hrEmail} onChange={(e) => setForm({ ...form, hrEmail: e.target.value })} />
          </Field>
          <Field label="HR phone">
            <input value={form.hrPhone} onChange={(e) => setForm({ ...form, hrPhone: e.target.value })} />
          </Field>
          <Field label="Company logo path (public folder)">
            <input
              value={form.companyLogoPath}
              onChange={(e) => setForm({ ...form, companyLogoPath: e.target.value })}
              placeholder="/gdf-logo.svg"
            />
          </Field>
          {form.companyLogoPath ? (
            <div className="org-logo-preview">
              <img src={form.companyLogoPath} alt="Company logo preview" />
            </div>
          ) : null}
          <button type="button" disabled={saving} onClick={() => void save()}>
            {saving ? "Saving…" : "Save organization settings"}
          </button>
        </div>
      </PageSection>
    </div>
  );
}

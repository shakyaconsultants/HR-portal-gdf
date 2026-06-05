"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { useToast } from "@/components/ToastProvider";
import { EmailLogDetailModal } from "@/components/communications/EmailLogDetailModal";
import { Badge } from "@/components/ui/Badge";
import { EmptyState } from "@/components/ui/EmptyState";
import { Field } from "@/components/ui/Field";
import { PageSection } from "@/components/ui/PageSection";
import { communicationTypeLabel } from "@/lib/email-templates";
import { deliveryToVariant, formatStatusLabel } from "@/lib/status-ui";
import { getFriendlyApiMessage, isApiSuccess, parseApiResponse } from "@/lib/client-api";
import { sanitizeDeliveryError } from "@/lib/delivery-errors";

type Tab = "templates" | "logs";

type EmailTemplateRow = {
  id: string;
  type: string;
  name: string;
  subject: string;
  htmlBody: string;
  textBody: string;
  showLogo: boolean;
  actionButton: { enabled: boolean; label: string; url: string };
  attachments: Array<{ fileName: string; mimeType: string; storagePath: string }>;
  isActive: boolean;
};

type LogRow = {
  id: string;
  candidateName: string;
  type: string;
  subject: string;
  sentToEmail: string;
  status: string;
  sentByName: string;
  sentAt: string;
  errorMessage: string;
  retryCount: number;
};

export function EmailManagementClient() {
  const toast = useToast();
  const searchParams = useSearchParams();
  const tabParam = searchParams.get("tab");
  const initialTab: Tab = tabParam === "logs" ? "logs" : "templates";

  const [tab, setTab] = useState<Tab>(initialTab);
  const [variables, setVariables] = useState<string[]>([]);
  const [templates, setTemplates] = useState<EmailTemplateRow[]>([]);
  const [logs, setLogs] = useState<LogRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingType, setEditingType] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<EmailTemplateRow | null>(null);
  const [previewHtml, setPreviewHtml] = useState("");
  const [saving, setSaving] = useState(false);
  const [detailLogId, setDetailLogId] = useState<string | null>(null);
  const [retryingId, setRetryingId] = useState<string | null>(null);

  const loadTemplates = useCallback(async () => {
    const res = await fetch("/api/email/templates", { cache: "no-store" });
    const json = await res.json();
    if (res.ok && json.ok) {
      setVariables(json.data.variables ?? []);
      setTemplates(json.data.templates ?? []);
    }
  }, []);

  const loadLogs = useCallback(async () => {
    const res = await fetch("/api/communications", { cache: "no-store" });
    const json = await res.json();
    if (res.ok && json.ok) setLogs(json.data.items ?? []);
  }, []);

  const load = useCallback(async () => {
    setLoading(true);
    if (tab === "templates") await loadTemplates();
    else await loadLogs();
    setLoading(false);
  }, [tab, loadTemplates, loadLogs]);

  useEffect(() => {
    void load();
  }, [load]);

  async function openEditor(template: EmailTemplateRow) {
    setEditingType(template.type);
    setEditForm({ ...template });
    setPreviewHtml("");
    const res = await fetch("/api/email/preview", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        type: template.type,
        subject: template.subject,
        htmlBody: template.htmlBody,
        textBody: template.textBody,
        showLogo: template.showLogo,
        actionButton: template.actionButton,
      }),
    });
    const json = await res.json();
    if (res.ok && json.ok) setPreviewHtml(json.data.htmlBody);
  }

  async function refreshPreview() {
    if (!editForm) return;
    const res = await fetch("/api/email/preview", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        type: editForm.type,
        subject: editForm.subject,
        htmlBody: editForm.htmlBody,
        textBody: editForm.textBody,
        showLogo: editForm.showLogo,
        actionButton: editForm.actionButton,
      }),
    });
    const json = await res.json();
    if (res.ok && json.ok) setPreviewHtml(json.data.htmlBody);
  }

  async function saveTemplate() {
    if (!editForm) return;
    setSaving(true);
    const res = await fetch(`/api/email/templates/${editForm.type}`, {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        name: editForm.name,
        subject: editForm.subject,
        htmlBody: editForm.htmlBody,
        textBody: editForm.textBody,
        showLogo: editForm.showLogo,
        actionButton: editForm.actionButton,
        attachments: editForm.attachments,
        isActive: editForm.isActive,
      }),
    });
    const json = await parseApiResponse(res);
    if (res.ok && json.ok) {
      toast.success("Template saved.");
      setEditingType(null);
      setEditForm(null);
      await loadTemplates();
    } else {
      toast.error(getFriendlyApiMessage(json, "Unable to save template."));
    }
    setSaving(false);
  }

  async function retryLog(logId: string) {
    setRetryingId(logId);
    const res = await fetch(`/api/communications/logs/${logId}/retry`, { method: "POST" });
    const json = await parseApiResponse(res);
    if (isApiSuccess(json)) {
      const data = json.data as { status?: string; errorMessage?: string };
      if (data.status === "SENT") {
        toast.success("Email sent successfully.");
      } else {
        toast.error(
          data.errorMessage
            ? sanitizeDeliveryError(data.errorMessage)
            : "Retry failed. Check SMTP settings and try again."
        );
      }
      await loadLogs();
    } else {
      toast.error(getFriendlyApiMessage(json, "Retry failed."));
    }
    setRetryingId(null);
  }

  return (
    <div className="stack-lg">
      <div className="email-mgmt-tabs">
        <button type="button" className={tab === "templates" ? "active" : ""} onClick={() => setTab("templates")}>
          Email Templates
        </button>
        <button type="button" className={tab === "logs" ? "active" : ""} onClick={() => setTab("logs")}>
          Email Logs
        </button>
        <Link href="/email/organization" className="btn-secondary btn-sm">
          Organization Settings →
        </Link>
        <Link href="/communications" className="btn-secondary btn-sm">
          Send Workflow →
        </Link>
      </div>

      {tab === "templates" ? (
        <PageSection
          title="Email templates"
          description="Centralized responsive HTML templates with logo, header, footer, action buttons, and HR signature. Only Offer Letter emails include a generated PDF attachment."
        >
          <div className="email-variables-box">
            <strong>Available variables:</strong>
            <div className="email-variables-list">
              {variables.map((v) => (
                <code key={v}>{`{{${v}}}`}</code>
              ))}
            </div>
          </div>

          {loading ? (
            <div className="loading-line" />
          ) : templates.length === 0 ? (
            <EmptyState title="No templates" description="Templates will seed on first load." />
          ) : (
            <div className="email-template-list">
              {templates.map((t) => (
                <article key={t.type} className="email-template-card">
                  <div className="email-template-card-head">
                    <div>
                      <h3>{t.name}</h3>
                      <p className="muted">{communicationTypeLabel(t.type)}</p>
                    </div>
                    <Badge variant={t.isActive ? "success" : "neutral"}>{t.isActive ? "Active" : "Inactive"}</Badge>
                  </div>
                  <p>
                    <strong>Subject:</strong> {t.subject}
                  </p>
                  <p className="muted">
                    Logo: {t.showLogo ? "Yes" : "No"} · Button: {t.actionButton?.enabled ? t.actionButton.label : "None"} ·
                    Attachments: {t.attachments.length}
                  </p>
                  <button type="button" className="btn-secondary btn-sm" onClick={() => void openEditor(t)}>
                    Edit template
                  </button>
                </article>
              ))}
            </div>
          )}

          {editingType && editForm ? (
            <div className="email-editor-panel">
              <h3>Edit — {editForm.name}</h3>
              <div className="email-editor-grid">
                <div className="stack-md">
                  <Field label="Template name">
                    <input value={editForm.name} onChange={(e) => setEditForm({ ...editForm, name: e.target.value })} />
                  </Field>
                  <Field label="Subject">
                    <input
                      value={editForm.subject}
                      onChange={(e) => setEditForm({ ...editForm, subject: e.target.value })}
                    />
                  </Field>
                  <Field label="Plain text body">
                    <textarea
                      rows={6}
                      value={editForm.textBody}
                      onChange={(e) => setEditForm({ ...editForm, textBody: e.target.value })}
                    />
                  </Field>
                  <Field label="HTML body (inner content)">
                    <textarea
                      rows={10}
                      value={editForm.htmlBody}
                      onChange={(e) => setEditForm({ ...editForm, htmlBody: e.target.value })}
                    />
                  </Field>
                  <label className="checkbox-field">
                    <input
                      type="checkbox"
                      checked={editForm.showLogo}
                      onChange={(e) => setEditForm({ ...editForm, showLogo: e.target.checked })}
                    />
                    Show company logo
                  </label>
                  <label className="checkbox-field">
                    <input
                      type="checkbox"
                      checked={editForm.actionButton.enabled}
                      onChange={(e) =>
                        setEditForm({
                          ...editForm,
                          actionButton: { ...editForm.actionButton, enabled: e.target.checked },
                        })
                      }
                    />
                    Enable action button
                  </label>
                  {editForm.actionButton.enabled ? (
                    <>
                      <Field label="Button label">
                        <input
                          value={editForm.actionButton.label}
                          onChange={(e) =>
                            setEditForm({
                              ...editForm,
                              actionButton: { ...editForm.actionButton, label: e.target.value },
                            })
                          }
                        />
                      </Field>
                      <Field label="Button URL">
                        <input
                          value={editForm.actionButton.url}
                          onChange={(e) =>
                            setEditForm({
                              ...editForm,
                              actionButton: { ...editForm.actionButton, url: e.target.value },
                            })
                          }
                        />
                      </Field>
                    </>
                  ) : null}
                  <div className="toolbar">
                    <button type="button" onClick={() => void refreshPreview()}>
                      Refresh preview
                    </button>
                    <button type="button" disabled={saving} onClick={() => void saveTemplate()}>
                      {saving ? "Saving…" : "Save template"}
                    </button>
                    <button
                      type="button"
                      className="btn-secondary"
                      onClick={() => {
                        setEditingType(null);
                        setEditForm(null);
                      }}
                    >
                      Cancel
                    </button>
                  </div>
                </div>
                <div>
                  <p className="stat-section-label">Live preview</p>
                  {previewHtml ? (
                    <iframe title="Template preview" className="email-html-preview" srcDoc={previewHtml} sandbox="" />
                  ) : (
                    <div className="loading-line" />
                  )}
                </div>
              </div>
            </div>
          ) : null}
        </PageSection>
      ) : (
        <PageSection title="Email logs" description="Full audit trail with retry for failed sends.">
          {loading ? (
            <div className="loading-line" />
          ) : logs.length === 0 ? (
            <EmptyState title="No emails logged yet" description="Sent emails will appear here with full audit details." />
          ) : (
            <div className="data-table-wrap">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Candidate</th>
                    <th>Type</th>
                    <th>Recipient</th>
                    <th>Status</th>
                    <th>Sent by</th>
                    <th>Date</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {logs.map((log) => (
                    <tr key={log.id}>
                      <td>{log.candidateName}</td>
                      <td>{communicationTypeLabel(log.type)}</td>
                      <td>{log.sentToEmail}</td>
                      <td>
                        <Badge variant={deliveryToVariant(log.status)}>{formatStatusLabel(log.status)}</Badge>
                        {log.errorMessage ? (
                          <div className="muted small comm-error-msg">{sanitizeDeliveryError(log.errorMessage)}</div>
                        ) : null}
                      </td>
                      <td>{log.sentByName}</td>
                      <td>{new Date(log.sentAt).toLocaleString()}</td>
                      <td>
                        <button type="button" className="btn-secondary btn-sm" onClick={() => setDetailLogId(log.id)}>
                          View
                        </button>
                        {log.status === "FAILED" ? (
                          <button
                            type="button"
                            className="btn-secondary btn-sm"
                            disabled={retryingId === log.id}
                            onClick={() => void retryLog(log.id)}
                          >
                            {retryingId === log.id ? "Retrying…" : `Retry (${log.retryCount}/3)`}
                          </button>
                        ) : null}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </PageSection>
      )}

      <EmailLogDetailModal
        logId={detailLogId}
        onClose={() => setDetailLogId(null)}
        onRetry={detailLogId ? () => void retryLog(detailLogId) : undefined}
      />
    </div>
  );
}

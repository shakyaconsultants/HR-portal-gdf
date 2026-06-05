"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { useToast } from "@/components/ToastProvider";
import { CommunicationSendForm } from "@/components/communications/CommunicationSendForm";
import { EmailLogDetailModal } from "@/components/communications/EmailLogDetailModal";
import { Badge } from "@/components/ui/Badge";
import { EmptyState } from "@/components/ui/EmptyState";
import { Field } from "@/components/ui/Field";
import { PageSection } from "@/components/ui/PageSection";
import { EMAIL_TEMPLATE_TYPES } from "@/lib/constants";
import { communicationTypeLabel } from "@/lib/email-templates";
import { deliveryToVariant, formatStatusLabel } from "@/lib/status-ui";
import { getFriendlyApiMessage, isApiSuccess, parseApiResponse } from "@/lib/client-api";
import { sanitizeDeliveryError } from "@/lib/delivery-errors";

const WORKFLOW_SEND_TYPES = ["OFFER_LETTER", "JOINING_INSTRUCTIONS"] as const;

type CommStatus = {
  sent: boolean;
  lastSentAt: string | null;
  status: string | null;
  sentByName: string | null;
  logId: string | null;
  errorMessage?: string | null;
};

type CandidateRow = {
  id: string;
  registrationId?: string | null;
  fullName: string;
  email: string;
  batchName: string | null;
  communications: Record<string, CommStatus>;
  sentCount: number;
  workflowComplete: boolean;
};

type HistoryRow = {
  id: string;
  candidateId: string;
  candidateName: string;
  registrationId?: string | null;
  type: string;
  subject: string;
  sentToEmail: string;
  status: string;
  sentByName: string;
  sentAt: string;
  attachmentCount: number;
  hasHtml: boolean;
  errorMessage: string;
};

type Tab = "workflow" | "offer" | "joining" | "history";

export function CommunicationWorkflowClient() {
  const toast = useToast();
  const searchParams = useSearchParams();
  const tabParam = searchParams.get("tab");
  const initialTab: Tab =
    tabParam === "offer" || tabParam === "joining" || tabParam === "history" ? tabParam : "workflow";

  const [tab, setTab] = useState<Tab>(initialTab);
  const [search, setSearch] = useState("");
  const [counts, setCounts] = useState({
    pending: 0,
    sent: 0,
    failed: 0,
    interviewInvitation: 0,
    letterOfIntent: 0,
    offerLetter: 0,
    joiningInstructions: 0,
    workflowPending: 0,
  });
  const [items, setItems] = useState<CandidateRow[]>([]);
  const [history, setHistory] = useState<HistoryRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [detailLogId, setDetailLogId] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    void fetch("/api/auth/me")
      .then((r) => r.json())
      .then((j) => setIsAdmin(j.data?.user?.role === "ADMIN"));
  }, []);

  const load = useCallback(async () => {
    setLoading(true);
    const query = new URLSearchParams({ tab: tab === "workflow" ? "workflow" : tab });
    if (search.trim()) query.set("search", search.trim());
    const res = await fetch(`/api/communications/queue?${query}`, { cache: "no-store" });
    const json = await res.json();
    if (res.ok && json.ok) {
      setCounts(json.data.counts);
      setItems(json.data.items ?? []);
      setHistory(json.data.history ?? []);
    }
    setLoading(false);
  }, [tab, search]);

  useEffect(() => {
    void load();
  }, [load]);

  async function sendCommunication(
    candidateId: string,
    type: string,
    payload?: { joiningDate?: string; offerDetails?: Record<string, string> },
    communications?: Record<string, CommStatus>
  ) {
    setSubmitting(true);
    try {
      const alreadySent = Boolean(communications?.[type]?.sent);
      const res = await fetch("/api/communications", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          candidateId,
          type,
          ...payload,
          ...(isAdmin && alreadySent ? { resend: true } : {}),
        }),
      });
      const json = await parseApiResponse<{ status?: string; errorMessage?: string }>(res);
      if (isApiSuccess(json)) {
        if (json.data?.status === "FAILED") {
          toast.error(
            json.data?.errorMessage
              ? sanitizeDeliveryError(json.data.errorMessage)
              : `${communicationTypeLabel(type)} could not be delivered. Check Email Management to retry.`
          );
        } else {
          toast.success(`${communicationTypeLabel(type)} sent successfully.`);
        }
        await load();
      } else {
        toast.error(getFriendlyApiMessage(json, "Unable to send email."));
      }
    } catch {
      toast.error("Network error while sending. Check your connection and try again.");
    } finally {
      setSubmitting(false);
    }
  }

  const tabTitle = {
    workflow: "Communication workflow",
    offer: "Offer letter queue",
    joining: "Joining instructions queue",
    history: "Email log history",
  }[tab];

  return (
    <div className="stack-lg">
      <div className="comm-template-grid">
        {EMAIL_TEMPLATE_TYPES.map((type) => (
          <div key={type} className="comm-template-card">
            <strong>{communicationTypeLabel(type)}</strong>
            <span className="muted">
              {type === "INTERVIEW_INVITATION" && "Sent when scheduling interviews"}
              {type === "LETTER_OF_INTENT" && "HTML email from Letter of Intent module (no PDF)"}
              {type === "OFFER_LETTER" && "Send to selected candidates at Offer Letter stage"}
              {type === "JOINING_INSTRUCTIONS" && "Send at Joining Instructions stage"}
            </span>
          </div>
        ))}
      </div>

      <div className="comm-funnel-stats">
        <button
          type="button"
          className={`verify-stat accent-amber ${tab === "workflow" ? "active" : ""}`}
          onClick={() => setTab("workflow")}
        >
          <span className="verify-stat-label">Workflow pending</span>
          <span className="verify-stat-value">{counts.workflowPending}</span>
        </button>
        <button
          type="button"
          className={`verify-stat ${counts.pending > 0 ? "accent-amber" : ""} ${tab === "history" ? "active" : ""}`}
          onClick={() => setTab("history")}
        >
          <span className="verify-stat-label">Email pending</span>
          <span className="verify-stat-value">{counts.pending}</span>
        </button>
        <button type="button" className="verify-stat accent-emerald" onClick={() => setTab("history")}>
          <span className="verify-stat-label">Sent</span>
          <span className="verify-stat-value">{counts.sent}</span>
        </button>
        <button type="button" className="verify-stat accent-rose" onClick={() => setTab("history")}>
          <span className="verify-stat-label">Failed</span>
          <span className="verify-stat-value">{counts.failed}</span>
        </button>
      </div>

      <div className="comm-funnel-summary">
        <div className="funnel-metric">
          <span className="funnel-metric-label">Interview invitations</span>
          <strong>{counts.interviewInvitation}</strong>
        </div>
        <div className="funnel-metric">
          <span className="funnel-metric-label">Letters of intent</span>
          <strong>{counts.letterOfIntent}</strong>
        </div>
        <div className="funnel-metric">
          <span className="funnel-metric-label">Offer letters</span>
          <strong>{counts.offerLetter}</strong>
        </div>
        <div className="funnel-metric">
          <span className="funnel-metric-label">Joining instructions</span>
          <strong>{counts.joiningInstructions}</strong>
        </div>
      </div>

      <PageSection
        title={tabTitle}
        description={
          tab === "history"
            ? "Full email log with HTML body and attachment history. Interview and LOI emails are logged automatically."
            : "Send offer letter (PDF attachment) and joining instructions (HTML only) via SMTP. All emails are logged with Pending → Sent/Failed status."
        }
        actions={
          <button type="button" onClick={() => void load()}>
            Refresh
          </button>
        }
      >
        <div className="toolbar toolbar-spaced">
          <Field label="Search">
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Name, email, subject"
              onKeyDown={(e) => e.key === "Enter" && void load()}
            />
          </Field>
          {tab !== "history" ? (
            <>
              <button type="button" className={tab === "offer" ? "active" : ""} onClick={() => setTab("offer")}>
                Offer queue
              </button>
              <button type="button" className={tab === "joining" ? "active" : ""} onClick={() => setTab("joining")}>
                Joining queue
              </button>
            </>
          ) : null}
          <button type="button" onClick={() => void load()}>
            Search
          </button>
        </div>

        {loading ? (
          <div className="loading-line" />
        ) : tab === "history" ? (
          history.length === 0 ? (
            <EmptyState title="No email logs yet" description="Emails appear here when workflow actions send messages." />
          ) : (
            <div className="data-table-wrap">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Candidate</th>
                    <th>Template</th>
                    <th>Subject</th>
                    <th>Sent</th>
                    <th>Status</th>
                    <th>Attachments</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {history.map((h) => (
                    <tr key={h.id}>
                      <td>
                        <Link href={`/candidates/${h.candidateId}`} className="profile-link">
                          {h.candidateName}
                        </Link>
                      </td>
                      <td>{communicationTypeLabel(h.type)}</td>
                      <td>{h.subject}</td>
                      <td>{new Date(h.sentAt).toLocaleString()}</td>
                      <td>
                        <Badge variant={deliveryToVariant(h.status)}>{formatStatusLabel(h.status)}</Badge>
                        {h.errorMessage ? (
                          <div className="cell-muted comm-error-msg">{sanitizeDeliveryError(h.errorMessage)}</div>
                        ) : null}
                      </td>
                      <td>{h.attachmentCount}</td>
                      <td>
                        <button type="button" className="btn-secondary btn-sm" onClick={() => setDetailLogId(h.id)}>
                          View
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )
        ) : items.length === 0 ? (
          <EmptyState title="No candidates in queue" description="Selected candidates at offer or joining stages appear here." />
        ) : (
          <div className="comm-list-cards">
            {items.map((c) => (
              <article key={c.id} className={`comm-card ${expandedId === c.id ? "expanded" : ""}`}>
                <div className="comm-card-header">
                  <div>
                    <div className="cell-name">{c.fullName}</div>
                    <div className="cell-muted">
                      {c.registrationId} · {c.email}
                      {c.batchName ? ` · ${c.batchName}` : ""}
                    </div>
                  </div>
                  <Badge variant={c.workflowComplete ? "success" : "warning"}>
                    {c.sentCount}/{WORKFLOW_SEND_TYPES.length} workflow emails
                  </Badge>
                </div>

                <div className="comm-status-row">
                  {WORKFLOW_SEND_TYPES.map((type) => {
                    const s = c.communications[type];
                    return (
                      <span key={type} className="comm-status-chip">
                        {communicationTypeLabel(type)}:{" "}
                        {s?.status ? (
                          <Badge variant={deliveryToVariant(s.status)}>{formatStatusLabel(s.status)}</Badge>
                        ) : (
                          <span className="muted">Not sent</span>
                        )}
                      </span>
                    );
                  })}
                </div>

                <div className="comm-card-actions">
                  <button type="button" className="btn-secondary btn-sm" onClick={() => setExpandedId(expandedId === c.id ? null : c.id)}>
                    {expandedId === c.id ? "Close" : "Send emails"}
                  </button>
                  <Link href={`/candidates/${c.id}`} className="profile-link">
                    Profile →
                  </Link>
                </div>

                {expandedId === c.id ? (
                  <div className="comm-panel">
                    <CommunicationSendForm
                      candidateName={c.fullName}
                      email={c.email}
                      communications={c.communications}
                      submitting={submitting}
                      allowedTypes={[...WORKFLOW_SEND_TYPES]}
                      onSend={(type, payload) => sendCommunication(c.id, type, payload, c.communications)}
                    />
                  </div>
                ) : null}
              </article>
            ))}
          </div>
        )}
      </PageSection>

      <EmailLogDetailModal logId={detailLogId} onClose={() => setDetailLogId(null)} />
    </div>
  );
}

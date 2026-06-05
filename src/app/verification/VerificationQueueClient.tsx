"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { useToast } from "@/components/ToastProvider";
import { Badge } from "@/components/ui/Badge";
import { EmptyState } from "@/components/ui/EmptyState";
import { Field } from "@/components/ui/Field";
import { PageSection } from "@/components/ui/PageSection";
import { VERIFICATION_STAGES } from "@/lib/constants";
import { formatStatusLabel, statusToVariant } from "@/lib/status-ui";
import { getFriendlyApiMessage, parseApiResponse } from "@/lib/client-api";

type CandidateRow = {
  id: string;
  registrationId?: string | null;
  fullName: string;
  email: string;
  phone: string;
  city: string;
  status: string;
  verificationStage: string;
  verificationRemarks: string;
  updatedAt: string;
};

type HistoryItem = {
  id: string;
  previousStage: string | null;
  stage: string;
  action: string;
  remarks: string;
  actorName: string;
  actorRole: string;
  createdAt: string;
};

type Tab = "pending" | "approved" | "rejected";

export function VerificationQueueClient() {
  const toast = useToast();
  const searchParams = useSearchParams();
  const initialTab = (searchParams.get("tab") as Tab | null) ?? "pending";
  const [tab, setTab] = useState<Tab>(
    initialTab === "approved" || initialTab === "rejected" ? initialTab : "pending"
  );
  const [search, setSearch] = useState("");
  const [counts, setCounts] = useState({ pending: 0, approved: 0, rejected: 0 });
  const [items, setItems] = useState<CandidateRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [history, setHistory] = useState<Record<string, HistoryItem[]>>({});
  const [remarks, setRemarks] = useState<Record<string, string>>({});
  const [acting, setActing] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    const query = new URLSearchParams({ tab });
    if (search.trim()) query.set("search", search.trim());
    const res = await fetch(`/api/verification/queue?${query}`, { cache: "no-store" });
    const json = await res.json();
    if (res.ok && json.ok) {
      setCounts(json.data.counts);
      const list =
        tab === "pending" ? json.data.pending : tab === "approved" ? json.data.approved : json.data.rejected;
      setItems(list ?? []);
    }
    setLoading(false);
  }, [tab, search]);

  useEffect(() => {
    void load();
  }, [load]);

  async function loadHistory(candidateId: string) {
    const res = await fetch(`/api/verification/${candidateId}/history`, { cache: "no-store" });
    const json = await res.json();
    if (res.ok && json.ok) {
      setHistory((prev) => ({ ...prev, [candidateId]: json.data.items ?? [] }));
    }
  }

  async function toggleExpand(candidateId: string) {
    if (expandedId === candidateId) {
      setExpandedId(null);
      return;
    }
    setExpandedId(candidateId);
    if (!history[candidateId]) {
      await loadHistory(candidateId);
    }
  }

  async function runAction(candidateId: string, action: "advance" | "reject") {
    setActing(candidateId);
    const res = await fetch(`/api/candidates/${candidateId}/verification`, {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ action, remarks: remarks[candidateId] ?? "" }),
    });
    const json = await parseApiResponse(res);
    if (res.ok && json.ok) {
      if (action === "advance" && (json.data as { eligibleForBatch?: boolean } | undefined)?.eligibleForBatch) {
        toast.success("Final approval complete — candidate is eligible for batch assignment.");
      } else if (action === "reject") {
        toast.success("Verification rejected.");
      } else {
        toast.success("Verification stage updated.");
      }
      setExpandedId(null);
      await load();
    } else {
      toast.error(getFriendlyApiMessage(json, "Verification update failed."));
    }
    setActing(null);
  }

  function stageIndex(stage: string) {
    return VERIFICATION_STAGES.indexOf(stage as (typeof VERIFICATION_STAGES)[number]);
  }

  return (
    <div className="stack-lg">
      <div className="verification-stats">
        <button type="button" className={`verify-stat ${tab === "pending" ? "active" : ""}`} onClick={() => setTab("pending")}>
          <span className="verify-stat-label">Pending verification</span>
          <span className="verify-stat-value">{counts.pending}</span>
        </button>
        <button type="button" className={`verify-stat accent-emerald ${tab === "approved" ? "active" : ""}`} onClick={() => setTab("approved")}>
          <span className="verify-stat-label">Approved verification</span>
          <span className="verify-stat-value">{counts.approved}</span>
        </button>
        <button type="button" className={`verify-stat accent-rose ${tab === "rejected" ? "active" : ""}`} onClick={() => setTab("rejected")}>
          <span className="verify-stat-label">Rejected verification</span>
          <span className="verify-stat-value">{counts.rejected}</span>
        </button>
      </div>

      <PageSection
        title={
          tab === "pending"
            ? "Pending verification"
            : tab === "approved"
              ? "Approved — eligible for batch"
              : "Rejected verification"
        }
        description={
          tab === "pending"
            ? "Multi-stage workflow: Documents → Identity → Address → Reference → Final approval."
            : tab === "approved"
              ? "These candidates can be assigned to a batch from Training Batches."
              : "Candidates rejected during verification with HR remarks on record."
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
              placeholder="Name, email, reg ID"
              onKeyDown={(e) => e.key === "Enter" && void load()}
            />
          </Field>
          <button type="button" onClick={() => void load()}>
            Search
          </button>
        </div>

        {loading ? (
          <div className="stack skeleton-stack">
            <div className="loading-line" />
            <div className="loading-line" />
          </div>
        ) : items.length === 0 ? (
          <EmptyState title="No candidates in this queue" description="Switch tabs or refresh to see other verification states." />
        ) : (
          <div className="verification-list">
            {items.map((c) => {
              const expanded = expandedId === c.id;
              const currentIdx = stageIndex(c.verificationStage);
              const isPending = tab === "pending";

              return (
                <article key={c.id} className={`verification-card ${expanded ? "expanded" : ""}`}>
                  <div className="verification-card-header">
                    <div>
                      <div className="cell-name">{c.fullName}</div>
                      <div className="cell-muted">
                        {c.registrationId} · {c.email} · {c.city}
                      </div>
                    </div>
                    <div className="verification-card-badges">
                      <Badge variant={statusToVariant(c.status)}>{formatStatusLabel(c.status)}</Badge>
                      <span className="batch-pill">{formatStatusLabel(c.verificationStage)}</span>
                    </div>
                  </div>

                  {c.verificationRemarks ? <p className="verify-remarks-preview">Latest remarks: {c.verificationRemarks}</p> : null}

                  <div className="verification-stepper" aria-label="Verification stages">
                    {VERIFICATION_STAGES.map((stage, idx) => {
                      const done = currentIdx > idx || c.status === "BATCH_ASSIGNMENT" || c.verificationStage === "FINAL_APPROVED";
                      const current = c.verificationStage === stage && c.status !== "BATCH_ASSIGNMENT";
                      return (
                        <div key={stage} className={`verify-step ${done ? "done" : ""} ${current ? "current" : ""}`}>
                          <span className="verify-step-dot">{done ? "✓" : idx + 1}</span>
                          <span className="verify-step-label">{formatStatusLabel(stage)}</span>
                        </div>
                      );
                    })}
                  </div>

                  <div className="verification-card-actions">
                    <button type="button" className="btn-secondary btn-sm" onClick={() => void toggleExpand(c.id)}>
                      {expanded ? "Hide details" : "Verify & history"}
                    </button>
                    <Link href={`/candidates/${c.id}`} className="profile-link">
                      Full profile →
                    </Link>
                    {tab === "approved" ? (
                      <Link href="/batches" className="profile-link">
                        Assign batch →
                      </Link>
                    ) : null}
                  </div>

                  {expanded ? (
                    <div className="verification-panel">
                      {isPending ? (
                        <div className="verification-workspace">
                          <Field label="HR remarks">
                            <textarea
                              rows={3}
                              value={remarks[c.id] ?? ""}
                              onChange={(e) => setRemarks((prev) => ({ ...prev, [c.id]: e.target.value }))}
                              placeholder="Notes for this verification step (required for rejection)"
                            />
                          </Field>
                          <div className="row">
                            <button
                              type="button"
                              disabled={acting === c.id}
                              onClick={() => void runAction(c.id, "advance")}
                            >
                              {acting === c.id
                                ? "Updating…"
                                : c.verificationStage === "REFERENCE_VERIFIED"
                                  ? "Final approve"
                                  : "Advance to next stage"}
                            </button>
                            <button
                              type="button"
                              className="btn-secondary"
                              disabled={acting === c.id}
                              onClick={() => void runAction(c.id, "reject")}
                            >
                              Reject verification
                            </button>
                          </div>
                        </div>
                      ) : null}

                      <h4 className="section-subtitle">Verification history</h4>
                      {(history[c.id] ?? []).length === 0 ? (
                        <p className="muted">No verification history yet.</p>
                      ) : (
                        <ul className="timeline-list verify-history">
                          {history[c.id].map((h) => (
                            <li key={h.id}>
                              <span className="timeline-date">{new Date(h.createdAt).toLocaleString()}</span>
                              <strong>
                                {formatStatusLabel(h.action)}
                                {h.previousStage ? ` · ${formatStatusLabel(h.previousStage)} → ` : " · "}
                                {formatStatusLabel(h.stage)}
                              </strong>
                              <p>{h.remarks}</p>
                              <span className="muted">
                                {h.actorName} ({h.actorRole})
                              </span>
                            </li>
                          ))}
                        </ul>
                      )}
                    </div>
                  ) : null}
                </article>
              );
            })}
          </div>
        )}
      </PageSection>
    </div>
  );
}

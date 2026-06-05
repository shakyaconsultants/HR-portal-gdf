"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { useToast } from "@/components/ToastProvider";
import { HiringDecisionForm } from "@/components/hiring/HiringDecisionForm";
import { Badge } from "@/components/ui/Badge";
import { EmptyState } from "@/components/ui/EmptyState";
import { Field } from "@/components/ui/Field";
import { PageSection } from "@/components/ui/PageSection";
import { formatStatusLabel, statusToVariant } from "@/lib/status-ui";
import { getFriendlyApiMessage, parseApiResponse } from "@/lib/client-api";

type CandidateRow = {
  id: string;
  registrationId?: string | null;
  fullName: string;
  email: string;
  finalScore: number | null;
  decision: string | null;
  decisionRemarks: string;
  batchName: string | null;
  status: string;
};

type HistoryItem = {
  id: string;
  previousDecision: string | null;
  decision: string;
  remarks: string;
  reassignBatchName: string;
  actorName: string;
  createdAt: string;
};

type BatchOption = { id: string; name: string; trainerName: string; status: string };

type Tab = "pending" | "selected" | "hold" | "rejected";

export function HiringDecisionCenterClient() {
  const toast = useToast();
  const searchParams = useSearchParams();
  const tabParam = searchParams.get("tab");
  const initialTab: Tab =
    tabParam === "selected" || tabParam === "hold" || tabParam === "rejected" ? tabParam : "pending";

  const [tab, setTab] = useState<Tab>(initialTab);
  const [search, setSearch] = useState("");
  const [counts, setCounts] = useState({ pending: 0, selected: 0, hold: 0, rejected: 0 });
  const [items, setItems] = useState<CandidateRow[]>([]);
  const [batches, setBatches] = useState<BatchOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [history, setHistory] = useState<Record<string, HistoryItem[]>>({});
  const [submitting, setSubmitting] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    const query = new URLSearchParams({ tab });
    if (search.trim()) query.set("search", search.trim());
    const res = await fetch(`/api/hiring/queue?${query}`, { cache: "no-store" });
    const json = await res.json();
    if (res.ok && json.ok) {
      setCounts(json.data.counts);
      const list =
        tab === "pending"
          ? json.data.pending
          : tab === "selected"
            ? json.data.selected
            : tab === "hold"
              ? json.data.hold
              : json.data.rejected;
      setItems(list ?? []);
      setBatches(json.data.batches ?? []);
    }
    setLoading(false);
  }, [tab, search]);

  useEffect(() => {
    void load();
  }, [load]);

  async function loadHistory(candidateId: string) {
    const res = await fetch(`/api/hiring/${candidateId}/history`, { cache: "no-store" });
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
    if (!history[candidateId]) await loadHistory(candidateId);
  }

  async function submitDecision(
    candidateId: string,
    payload: { decision: string; remarks: string; reassignBatchId?: string }
  ) {
    setSubmitting(true);
    const res = await fetch(`/api/candidates/${candidateId}/decision`, {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(payload),
    });
    const json = await parseApiResponse(res);
    if (res.ok && json.ok) {
      const reassigned = (json.data as { reassigned?: boolean } | undefined)?.reassigned;
      toast.success(
        reassigned ? "Hold recorded and candidate reassigned to future batch." : "Hiring decision saved."
      );
      setExpandedId(null);
      await load();
    } else {
      toast.error(getFriendlyApiMessage(json, "Unable to save decision."));
    }
    setSubmitting(false);
  }

  const tabTitle = {
    pending: "Pending hiring decisions",
    selected: "Selected candidates",
    hold: "On hold",
    rejected: "Rejected candidates",
  }[tab];

  return (
    <div className="stack-lg">
      <div className="hiring-funnel-stats">
        <button type="button" className={`verify-stat ${tab === "pending" ? "active" : ""}`} onClick={() => setTab("pending")}>
          <span className="verify-stat-label">Pending decision</span>
          <span className="verify-stat-value">{counts.pending}</span>
        </button>
        <button type="button" className={`verify-stat accent-emerald ${tab === "selected" ? "active" : ""}`} onClick={() => setTab("selected")}>
          <span className="verify-stat-label">Selected</span>
          <span className="verify-stat-value">{counts.selected}</span>
        </button>
        <button type="button" className={`verify-stat accent-amber ${tab === "hold" ? "active" : ""}`} onClick={() => setTab("hold")}>
          <span className="verify-stat-label">Hold</span>
          <span className="verify-stat-value">{counts.hold}</span>
        </button>
        <button type="button" className={`verify-stat accent-rose ${tab === "rejected" ? "active" : ""}`} onClick={() => setTab("rejected")}>
          <span className="verify-stat-label">Rejected</span>
          <span className="verify-stat-value">{counts.rejected}</span>
        </button>
      </div>

      <PageSection
        title={tabTitle}
        description={
          tab === "pending"
            ? "After mock call evaluation, HR marks each candidate Selected, Hold, or Rejected with required remarks."
            : "Complete decision history available per candidate."
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
          <div className="loading-line" />
        ) : items.length === 0 ? (
          <EmptyState title="No candidates in this queue" description="Try another tab or refresh." />
        ) : (
          <div className="hiring-list">
            {items.map((c) => (
              <article key={c.id} className={`hiring-card ${expandedId === c.id ? "expanded" : ""}`}>
                <div className="hiring-card-header">
                  <div>
                    <div className="cell-name">{c.fullName}</div>
                    <div className="cell-muted">
                      {c.registrationId} · {c.email}
                      {c.batchName ? ` · ${c.batchName}` : ""}
                    </div>
                  </div>
                  <div className="hiring-card-meta">
                    <span className="mock-eval-score-badge">{c.finalScore ?? "—"}/100</span>
                    {c.decision ? (
                      <Badge variant={statusToVariant(c.decision)}>{formatStatusLabel(c.decision)}</Badge>
                    ) : (
                      <Badge variant="warning">Pending</Badge>
                    )}
                  </div>
                </div>

                {c.decisionRemarks ? <p className="verify-remarks-preview">Remarks: {c.decisionRemarks}</p> : null}

                <div className="hiring-card-actions">
                  <button type="button" className="btn-secondary btn-sm" onClick={() => void toggleExpand(c.id)}>
                    {expandedId === c.id ? "Close" : tab === "pending" ? "Record decision" : "View history"}
                  </button>
                  <Link href={`/candidates/${c.id}`} className="profile-link">
                    Profile →
                  </Link>
                </div>

                {expandedId === c.id ? (
                  <div className="hiring-panel">
                    {tab === "pending" ? (
                      <HiringDecisionForm
                        candidateName={c.fullName}
                        finalScore={c.finalScore}
                        batches={batches}
                        submitting={submitting}
                        onSubmit={(payload) => submitDecision(c.id, payload)}
                      />
                    ) : null}

                    <h4 className="section-subtitle">Decision history</h4>
                    {(history[c.id] ?? []).length === 0 ? (
                      <p className="muted">No decision history yet.</p>
                    ) : (
                      <ul className="timeline-list verify-history">
                        {history[c.id].map((h) => (
                          <li key={h.id}>
                            <span className="timeline-date">{new Date(h.createdAt).toLocaleString()}</span>
                            <strong>
                              {h.previousDecision ? `${formatStatusLabel(h.previousDecision)} → ` : ""}
                              {formatStatusLabel(h.decision)}
                            </strong>
                            <p>{h.remarks}</p>
                            {h.reassignBatchName ? (
                              <p className="muted">Reassigned to: {h.reassignBatchName}</p>
                            ) : null}
                            <span className="muted">{h.actorName}</span>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                ) : null}
              </article>
            ))}
          </div>
        )}
      </PageSection>
    </div>
  );
}

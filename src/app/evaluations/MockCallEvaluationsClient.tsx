"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { useToast } from "@/components/ToastProvider";
import { MockCallEvaluationForm } from "@/components/evaluations/MockCallEvaluationForm";
import { MockCallEvaluationView } from "@/components/evaluations/MockCallEvaluationView";
import { Badge } from "@/components/ui/Badge";
import { EmptyState } from "@/components/ui/EmptyState";
import { Field } from "@/components/ui/Field";
import { PageSection } from "@/components/ui/PageSection";
import { formatStatusLabel } from "@/lib/status-ui";
import { getFriendlyApiMessage, parseApiResponse } from "@/lib/client-api";

type PendingRow = {
  id: string;
  registrationId?: string | null;
  fullName: string;
  email: string;
  phone: string;
  batchName: string | null;
  evaluationStatus: string;
};

type EvaluatedRow = {
  candidateId: string;
  registrationId?: string | null;
  fullName: string;
  email: string;
  batchName: string | null;
  evaluation: {
    finalScore: number;
    remarks: string;
    evaluatorName: string;
    evaluatedAt: string;
    communicationSkills: number;
    confidenceLevel: number;
    productUnderstanding: number;
    salesPitch: number;
    objectionHandling: number;
  };
};

type Tab = "pending" | "evaluated";

export function MockCallEvaluationsClient({ evaluatorName }: { evaluatorName: string }) {
  const toast = useToast();
  const searchParams = useSearchParams();
  const initialTab = searchParams.get("tab") === "evaluated" ? "evaluated" : "pending";
  const [tab, setTab] = useState<Tab>(initialTab);
  const [search, setSearch] = useState("");
  const [counts, setCounts] = useState({ pending: 0, evaluated: 0, hiringEligible: 0 });
  const [pending, setPending] = useState<PendingRow[]>([]);
  const [evaluated, setEvaluated] = useState<EvaluatedRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    const query = new URLSearchParams({ tab });
    if (search.trim()) query.set("search", search.trim());
    const res = await fetch(`/api/evaluations/queue?${query}`, { cache: "no-store" });
    const json = await res.json();
    if (res.ok && json.ok) {
      setCounts(json.data.counts);
      setPending(json.data.pending ?? []);
      setEvaluated(json.data.evaluated ?? []);
    }
    setLoading(false);
  }, [tab, search]);

  useEffect(() => {
    void load();
  }, [load]);

  async function submitEvaluation(payload: Record<string, string | number>) {
    setSubmitting(true);
    const res = await fetch("/api/evaluations", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(payload),
    });
    const json = await parseApiResponse(res);
    if (res.ok && json.ok) {
      toast.success(
        (json.data as { message?: string } | undefined)?.message ??
          "Final mock call saved. Candidate is eligible for hiring decision."
      );
      setExpandedId(null);
      setTab("evaluated");
      await load();
    } else {
      toast.error(getFriendlyApiMessage(json, "Unable to save evaluation."));
    }
    setSubmitting(false);
  }

  return (
    <div className="stack-lg">
      <div className="verification-stats">
        <button
          type="button"
          className={`verify-stat ${tab === "pending" ? "active" : ""}`}
          onClick={() => setTab("pending")}
        >
          <span className="verify-stat-label">Pending evaluation</span>
          <span className="verify-stat-value">{counts.pending}</span>
        </button>
        <button
          type="button"
          className={`verify-stat accent-emerald ${tab === "evaluated" ? "active" : ""}`}
          onClick={() => setTab("evaluated")}
        >
          <span className="verify-stat-label">Evaluated</span>
          <span className="verify-stat-value">{counts.evaluated}</span>
        </button>
        <Link href="/hiring-decisions" className="verify-stat accent-indigo">
          <span className="verify-stat-label">Hiring decision queue</span>
          <span className="verify-stat-value">{counts.hiringEligible}</span>
        </Link>
      </div>

      <PageSection
        title={tab === "pending" ? "Pending mock call evaluations" : "Completed evaluations"}
        description={
          tab === "pending"
            ? "Score Communication, Confidence, Product Knowledge, Sales Pitch, and Objection Handling (0–20 each)."
            : "One final mock call per candidate — eligible for hiring decision after evaluation."
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
          </div>
        ) : tab === "pending" ? (
          pending.length === 0 ? (
            <EmptyState
              title="No pending evaluations"
              description="Candidates in training with an assigned batch appear here."
            />
          ) : (
            <div className="mock-eval-list">
              {pending.map((c) => (
                <article key={c.id} className={`mock-eval-card ${expandedId === c.id ? "expanded" : ""}`}>
                  <div className="mock-eval-card-header">
                    <div>
                      <div className="cell-name">{c.fullName}</div>
                      <div className="cell-muted">
                        {c.registrationId} · {c.email}
                        {c.batchName ? ` · ${c.batchName}` : ""}
                      </div>
                    </div>
                    <Badge variant="warning">{formatStatusLabel("NOT_EVALUATED")}</Badge>
                  </div>
                  <div className="mock-eval-card-actions">
                    <button
                      type="button"
                      className="btn-secondary btn-sm"
                      onClick={() => setExpandedId(expandedId === c.id ? null : c.id)}
                    >
                      {expandedId === c.id ? "Close form" : "Evaluate mock call"}
                    </button>
                    <Link href={`/candidates/${c.id}`} className="profile-link">
                      Profile →
                    </Link>
                  </div>
                  {expandedId === c.id ? (
                    <MockCallEvaluationForm
                      candidateId={c.id}
                      candidateName={c.fullName}
                      defaultEvaluatorName={evaluatorName}
                      submitting={submitting}
                      onSubmit={submitEvaluation}
                    />
                  ) : null}
                </article>
              ))}
            </div>
          )
        ) : evaluated.length === 0 ? (
          <EmptyState title="No evaluations yet" description="Completed mock calls will appear here." />
        ) : (
          <div className="mock-eval-list">
            {evaluated.map((row) => (
              <article key={row.candidateId} className="mock-eval-card evaluated">
                <div className="mock-eval-card-header">
                  <div>
                    <div className="cell-name">{row.fullName}</div>
                    <div className="cell-muted">
                      {row.registrationId} · {row.batchName ?? "No batch"}
                    </div>
                  </div>
                  <div className="mock-eval-score-badge">{row.evaluation.finalScore}/100</div>
                </div>
                <MockCallEvaluationView evaluation={row.evaluation} />
                <Link href={`/candidates/${row.candidateId}`} className="profile-link">
                  View profile →
                </Link>
              </article>
            ))}
          </div>
        )}
      </PageSection>
    </div>
  );
}

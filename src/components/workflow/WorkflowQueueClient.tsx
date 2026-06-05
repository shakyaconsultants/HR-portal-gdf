"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { Badge } from "@/components/ui/Badge";
import { EmptyState } from "@/components/ui/EmptyState";
import { Field } from "@/components/ui/Field";
import { PageSection } from "@/components/ui/PageSection";
import { formatStatusLabel, statusToVariant } from "@/lib/status-ui";
import type { LifecycleStageSlug } from "@/lib/lifecycle";

type CandidateRow = {
  id: string;
  registrationId?: string | null;
  fullName: string;
  email: string;
  phone: string;
  city: string;
  lifecycleStage: string;
  status: string;
  verificationStage: string;
  verificationRejected?: boolean;
  batch: { id: string; name: string; trainerName: string } | null;
  trainingStatus?: string;
  evaluationStatus?: string;
  finalScore: number | null;
  decision?: string | null;
  updatedAt: string;
  createdAt: string;
};

export function WorkflowQueueClient({
  stage,
  title,
  description,
  actionHint,
  sectionActions,
  extra,
  tab,
}: {
  stage: LifecycleStageSlug;
  title: string;
  description: string;
  actionHint: string;
  sectionActions?: React.ReactNode;
  extra?: React.ReactNode;
  tab?: string;
}) {
  const [items, setItems] = useState<CandidateRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [total, setTotal] = useState(0);

  const load = useCallback(async () => {
    setLoading(true);
    const query = new URLSearchParams({
      page: "1",
      pageSize: "100",
      lifecycleSlug: stage,
    });
    if (search.trim()) query.set("search", search.trim());
    if (tab) query.set("tab", tab);

    const res = await fetch(`/api/candidates?${query}`, { cache: "no-store" });
    const json = await res.json();
    if (res.ok && json.ok) {
      setItems(json.data?.items ?? []);
      setTotal(json.data?.total ?? 0);
    }
    setLoading(false);
  }, [stage, search, tab]);

  useEffect(() => {
    void load();
  }, [load]);

  const showBatch = ["batch-assignment", "training", "final-mock-call"].includes(stage);
  const showScore = stage === "final-mock-call" || stage === "hiring-decision";
  const showVerification = stage === "registration-submitted" || stage === "verification";
  const showDecision = ["hiring-decision", "offer-letter", "joining-instructions", "onboarding"].includes(stage);
  const showAdvance = [
    "lead",
    "interview-scheduled",
    "interview-completed",
    "interview-selected",
    "letter-of-intent-sent",
    "training",
  ].includes(stage);

  async function advanceCandidate(id: string) {
    const res = await fetch(`/api/candidates/${id}/lifecycle`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "advance" }),
    });
    if (res.ok) void load();
  }

  return (
    <div className="stack-lg">
      <PageSection
        title={title}
        description={description}
        actions={
          <>
            {sectionActions}
            <button type="button" onClick={() => void load()}>
              Refresh
            </button>
          </>
        }
      >
        <p className="workflow-hint muted">{actionHint}</p>

        <div className="toolbar toolbar-spaced">
          <Field label="Search in this stage">
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Name, email, phone, reg ID"
              onKeyDown={(e) => {
                if (e.key === "Enter") void load();
              }}
            />
          </Field>
          <button type="button" onClick={() => void load()}>
            Search
          </button>
        </div>

        <p className="muted registry-count">
          {total} candidate{total === 1 ? "" : "s"} in this stage
        </p>

        {loading ? (
          <div className="stack skeleton-stack">
            <div className="loading-line" />
            <div className="loading-line" />
          </div>
        ) : items.length === 0 ? (
          <EmptyState title="Queue is clear" description="No candidates currently need action at this lifecycle stage." />
        ) : (
          <div className="data-table-wrap">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Reg. ID</th>
                  <th>Candidate</th>
                  {showVerification && <th>Verification</th>}
                  {showBatch && <th>Batch</th>}
                  <th>Lifecycle</th>
                  {showScore && <th>Mock score</th>}
                  {showDecision && <th>Decision</th>}
                  <th>Updated</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {items.map((c) => (
                  <tr key={c.id}>
                    <td>{c.registrationId ?? "—"}</td>
                    <td>
                      <div className="cell-name">{c.fullName}</div>
                      <div className="cell-muted">
                        {c.email} · {c.phone}
                      </div>
                    </td>
                    {showVerification && <td className="cell-muted">{formatStatusLabel(c.verificationStage)}</td>}
                    {showBatch && (
                      <td>{c.batch ? <span className="batch-pill">{c.batch.name}</span> : <span className="muted">Unassigned</span>}</td>
                    )}
                    <td>
                      <Badge variant={statusToVariant(c.lifecycleStage)}>{formatStatusLabel(c.lifecycleStage)}</Badge>
                    </td>
                    {showScore && <td>{c.finalScore ?? "—"}</td>}
                    {showDecision && <td>{c.decision ? formatStatusLabel(c.decision) : "—"}</td>}
                    <td className="cell-muted">{new Date(c.updatedAt).toLocaleDateString()}</td>
                    <td className="cell-actions">
                      {showAdvance && (
                        <button type="button" className="btn-inline" onClick={() => void advanceCandidate(c.id)}>
                          Advance →
                        </button>
                      )}
                      <Link href={`/candidates/${c.id}`} className="profile-link">
                        Profile →
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </PageSection>
      {extra}
    </div>
  );
}

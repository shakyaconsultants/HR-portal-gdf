"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useToast } from "@/components/ToastProvider";
import { HiringDecisionForm } from "@/components/hiring/HiringDecisionForm";
import { Badge } from "@/components/ui/Badge";
import { PageSection } from "@/components/ui/PageSection";
import { formatStatusLabel, statusToVariant } from "@/lib/status-ui";
import { getFriendlyApiMessage, parseApiResponse } from "@/lib/client-api";

type HistoryItem = {
  id: string;
  previousDecision: string | null;
  decision: string;
  remarks: string;
  reassignBatchName: string;
  actorName: string;
  createdAt: string;
};

export function HiringProfileSection({
  candidateId,
  fullName,
  finalScore,
  decision,
  decisionRemarks,
  evaluationStatus,
  onUpdated,
}: {
  candidateId: string;
  fullName: string;
  finalScore: number | null;
  decision: string | null;
  decisionRemarks: string;
  evaluationStatus: string;
  onUpdated: () => Promise<void>;
}) {
  const toast = useToast();
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [batches, setBatches] = useState<Array<{ id: string; name: string; trainerName: string; status: string }>>([]);
  const [submitting, setSubmitting] = useState(false);
  const canDecide = evaluationStatus === "EVALUATED" && !decision;

  useEffect(() => {
    void Promise.all([
      fetch(`/api/candidates/${candidateId}/decision`, { cache: "no-store" }).then((r) => r.json()),
      fetch("/api/batches", { cache: "no-store" }).then((r) => r.json()),
    ]).then(([decJson, batchJson]) => {
      if (decJson.ok) setHistory(decJson.data?.history ?? []);
      if (batchJson.ok) setBatches(batchJson.data?.items ?? []);
    });
  }, [candidateId, decision]);

  async function submitDecision(payload: { decision: string; remarks: string; reassignBatchId?: string }) {
    setSubmitting(true);
    const res = await fetch(`/api/candidates/${candidateId}/decision`, {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(payload),
    });
    const json = await parseApiResponse(res);
    if (res.ok && json.ok) {
      toast.success("Hiring decision saved.");
      await onUpdated();
      const histRes = await fetch(`/api/candidates/${candidateId}/decision`, { cache: "no-store" });
      const histJson = await histRes.json();
      if (histRes.ok) setHistory(histJson.data?.history ?? []);
    } else {
      toast.error(getFriendlyApiMessage(json, "Unable to save decision."));
    }
    setSubmitting(false);
  }

  return (
    <PageSection
      title="Hiring decision"
      description="Record Selected, Hold, or Rejected after mock call. Remarks are required."
    >
      <p className="muted" style={{ marginBottom: "1rem" }}>
        <Link href="/hiring-decisions" className="profile-link">
          Open Hiring Decision Center →
        </Link>
      </p>

      <p>
        Status:{" "}
        {decision ? (
          <Badge variant={statusToVariant(decision)}>{formatStatusLabel(decision)}</Badge>
        ) : (
          <Badge variant="warning">Pending decision</Badge>
        )}
      </p>
      {decisionRemarks ? <p className="verify-remarks-preview">Latest remarks: {decisionRemarks}</p> : null}

      {canDecide ? (
        <HiringDecisionForm
          candidateName={fullName}
          finalScore={finalScore}
          batches={batches}
          submitting={submitting}
          onSubmit={submitDecision}
        />
      ) : !decision && evaluationStatus !== "EVALUATED" ? (
        <p className="muted">Complete mock call evaluation before recording a hiring decision.</p>
      ) : null}

      <h4 className="section-subtitle">Decision history</h4>
      {history.length === 0 ? (
        <p className="muted">No decision history yet.</p>
      ) : (
        <ul className="timeline-list verify-history">
          {history.map((h) => (
            <li key={h.id}>
              <span className="timeline-date">{new Date(h.createdAt).toLocaleString()}</span>
              <strong>
                {h.previousDecision ? `${formatStatusLabel(h.previousDecision)} → ` : ""}
                {formatStatusLabel(h.decision)}
              </strong>
              <p>{h.remarks}</p>
              {h.reassignBatchName ? <p className="muted">Reassigned to: {h.reassignBatchName}</p> : null}
              <span className="muted">{h.actorName}</span>
            </li>
          ))}
        </ul>
      )}
    </PageSection>
  );
}

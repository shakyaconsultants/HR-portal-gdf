"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useToast } from "@/components/ToastProvider";
import { MockCallEvaluationModal } from "@/components/evaluations/MockCallEvaluationModal";
import { Badge } from "@/components/ui/Badge";
import { PageSection } from "@/components/ui/PageSection";
import { MOCK_CALL_TOTAL_MAX } from "@/lib/mock-call";
import { formatStatusLabel, statusToVariant } from "@/lib/status-ui";
import { getFriendlyApiMessage, parseApiResponse } from "@/lib/client-api";

type EvaluationRecord = {
  communicationSkills: number;
  confidenceLevel: number;
  productUnderstanding: number;
  salesPitch: number;
  objectionHandling: number;
  finalScore: number;
  remarks: string;
  evaluatorName: string;
  evaluatedAt: string;
};

export function MockCallProfileSection({
  candidateId,
  candidateName,
  evaluationStatus,
  evaluation,
  onUpdated,
}: {
  candidateId: string;
  candidateName: string;
  evaluationStatus: string;
  evaluation: Record<string, unknown> | null;
  onUpdated: () => Promise<void>;
}) {
  const toast = useToast();
  const [modalOpen, setModalOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [evaluatorName, setEvaluatorName] = useState("Trainer");

  const hasEvaluation = Boolean(evaluation);
  const status = hasEvaluation ? "EVALUATED" : evaluationStatus;

  const evaluationData: EvaluationRecord | null = evaluation
    ? {
        communicationSkills: Number(evaluation.communicationSkills),
        confidenceLevel: Number(evaluation.confidenceLevel),
        productUnderstanding: Number(evaluation.productUnderstanding),
        salesPitch: Number(evaluation.salesPitch),
        objectionHandling: Number(evaluation.objectionHandling),
        finalScore: Number(evaluation.finalScore),
        remarks: String(evaluation.remarks ?? ""),
        evaluatorName: String(evaluation.evaluatorName ?? ""),
        evaluatedAt: String(evaluation.evaluatedAt ?? evaluation.createdAt),
      }
    : null;

  useEffect(() => {
    void fetch("/api/auth/me")
      .then((r) => r.json())
      .then((j) => setEvaluatorName(j.data?.user?.name ?? "Trainer"));
  }, []);

  async function submitEvaluation(payload: Record<string, string | number>) {
    setSubmitting(true);
    try {
      const res = await fetch("/api/evaluations", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(payload),
      });
      const json = await parseApiResponse(res);
      if (res.ok && json.ok) {
        toast.success("Mock call evaluation saved.");
        setModalOpen(false);
        await onUpdated();
      } else {
        toast.error(getFriendlyApiMessage(json, "Evaluation failed."));
      }
    } catch {
      toast.error("Network error while saving evaluation.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <PageSection
      title="Final mock call"
      description="One evaluation per candidate. Total score auto-calculated out of 100."
    >
      <div className="comm-section-toolbar">
        <Link href="/evaluations" className="profile-link">
          Open Mock Call Evaluations module →
        </Link>
        <button type="button" className="btn-secondary btn-sm" onClick={() => setModalOpen(true)}>
          {hasEvaluation
            ? `View evaluation (${evaluationData?.finalScore ?? "—"}/${MOCK_CALL_TOTAL_MAX})`
            : "Evaluate mock call"}
        </button>
      </div>

      <p>
        Status:{" "}
        <Badge variant={statusToVariant(status)}>{formatStatusLabel(status)}</Badge>
      </p>

      {hasEvaluation && evaluationData ? (
        <dl className="detail-grid mock-eval-summary">
          <div>
            <dt>Final score</dt>
            <dd>
              <strong>
                {evaluationData.finalScore} / {MOCK_CALL_TOTAL_MAX}
              </strong>
            </dd>
          </div>
          <div>
            <dt>Evaluator</dt>
            <dd>{evaluationData.evaluatorName}</dd>
          </div>
          <div>
            <dt>Evaluation date</dt>
            <dd>{new Date(evaluationData.evaluatedAt).toLocaleDateString()}</dd>
          </div>
          {evaluationData.remarks ? (
            <div className="span-3">
              <dt>Remarks</dt>
              <dd>{evaluationData.remarks}</dd>
            </div>
          ) : null}
        </dl>
      ) : (
        <p className="muted">
          No mock call evaluation recorded yet. Use <strong>Evaluate mock call</strong> to score this
          candidate.
        </p>
      )}

      <MockCallEvaluationModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        mode={hasEvaluation ? "view" : "form"}
        candidateId={candidateId}
        candidateName={candidateName}
        defaultEvaluatorName={evaluatorName}
        evaluation={evaluationData}
        submitting={submitting}
        onSubmit={submitEvaluation}
      />
    </PageSection>
  );
}

"use client";

import { Modal } from "@/components/ui/Modal";
import { MockCallEvaluationForm } from "@/components/evaluations/MockCallEvaluationForm";
import { MockCallEvaluationView } from "@/components/evaluations/MockCallEvaluationView";

type EvaluationData = {
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

export function MockCallEvaluationModal({
  open,
  onClose,
  mode,
  candidateId,
  candidateName,
  defaultEvaluatorName,
  evaluation,
  submitting,
  onSubmit,
}: {
  open: boolean;
  onClose: () => void;
  mode: "form" | "view";
  candidateId: string;
  candidateName: string;
  defaultEvaluatorName: string;
  evaluation: EvaluationData | null;
  submitting: boolean;
  onSubmit: (payload: Record<string, string | number>) => Promise<void>;
}) {
  const isForm = mode === "form";

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Final mock call"
      description={
        isForm
          ? "One evaluation per candidate. Total score auto-calculates out of 100."
          : "Completed mock call evaluation for this candidate."
      }
      size="lg"
      footer={
        <div className="modal-actions">
          <button type="button" className="btn-secondary" onClick={onClose}>
            Close
          </button>
        </div>
      }
    >
      {isForm ? (
        <MockCallEvaluationForm
          candidateId={candidateId}
          candidateName={candidateName}
          defaultEvaluatorName={defaultEvaluatorName}
          submitting={submitting}
          onSubmit={onSubmit}
        />
      ) : evaluation ? (
        <MockCallEvaluationView evaluation={evaluation} />
      ) : (
        <p className="muted">No evaluation data available.</p>
      )}
    </Modal>
  );
}

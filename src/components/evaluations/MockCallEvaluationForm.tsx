"use client";

import { FormEvent, useMemo, useState } from "react";
import { Field } from "@/components/ui/Field";
import {
  MOCK_CALL_CRITERIA,
  MOCK_CALL_TOTAL_MAX,
  computeMockCallScore,
  type MockCallScoreKey,
} from "@/lib/mock-call";

const defaultScores: Record<MockCallScoreKey, number> = {
  communicationSkills: 10,
  confidenceLevel: 10,
  productUnderstanding: 10,
  salesPitch: 10,
  objectionHandling: 10,
};

export function MockCallEvaluationForm({
  candidateId,
  candidateName,
  defaultEvaluatorName,
  onSubmit,
  submitting,
}: {
  candidateId: string;
  candidateName: string;
  defaultEvaluatorName: string;
  onSubmit: (payload: Record<string, string | number>) => Promise<void>;
  submitting: boolean;
}) {
  const [scores, setScores] = useState(defaultScores);
  const [remarks, setRemarks] = useState("");
  const [evaluatorName, setEvaluatorName] = useState(defaultEvaluatorName);
  const [evaluatedAt, setEvaluatedAt] = useState(() => new Date().toISOString().slice(0, 10));

  const totalScore = useMemo(() => computeMockCallScore(scores), [scores]);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    await onSubmit({
      candidateId,
      ...scores,
      remarks,
      evaluatorName,
      evaluatedAt,
    });
  }

  return (
    <form className="mock-eval-form" onSubmit={(e) => void handleSubmit(e)}>
      <p className="muted mock-eval-candidate">
        Final mock call for <strong>{candidateName}</strong> — one evaluation only. Score each section
        0–20; total auto-calculates out of {MOCK_CALL_TOTAL_MAX}.
      </p>

      <div className="mock-eval-scores">
        {MOCK_CALL_CRITERIA.map((criterion) => {
          const key = criterion.key;
          const value = scores[key];
          const pct = Math.round((value / criterion.max) * 100);
          return (
            <div key={key} className="mock-eval-score-row">
              <Field label={`${criterion.label} (0–${criterion.max})`}>
                <input
                  type="number"
                  min={0}
                  max={criterion.max}
                  value={value}
                  onChange={(e) =>
                    setScores((s) => ({
                      ...s,
                      [key]: Math.min(criterion.max, Math.max(0, Number(e.target.value) || 0)),
                    }))
                  }
                  required
                />
              </Field>
              <div className="mock-eval-score-bar" aria-hidden>
                <span className="mock-eval-score-bar-fill" style={{ width: `${pct}%` }} />
              </div>
              <span className="mock-eval-score-mini">
                {value}/{criterion.max}
              </span>
            </div>
          );
        })}
      </div>

      <div className="mock-eval-total" aria-live="polite">
        <span>Total score (auto-calculated)</span>
        <strong>
          {totalScore} / {MOCK_CALL_TOTAL_MAX}
        </strong>
      </div>

      <div className="grid grid-3">
        <Field label="Remarks">
          <textarea
            rows={3}
            value={remarks}
            onChange={(e) => setRemarks(e.target.value)}
            placeholder="Observations, strengths, areas to improve…"
          />
        </Field>
        <Field label="Evaluation date">
          <input type="date" value={evaluatedAt} onChange={(e) => setEvaluatedAt(e.target.value)} required />
        </Field>
        <Field label="Evaluator name">
          <input value={evaluatorName} onChange={(e) => setEvaluatorName(e.target.value)} required />
        </Field>
      </div>

      <button type="submit" disabled={submitting}>
        {submitting ? "Saving evaluation…" : "Submit final mock call"}
      </button>
      <p className="muted mock-eval-footnote">
        After submission the candidate moves to <strong>Hiring Decision</strong>.
      </p>
    </form>
  );
}

"use client";

import { useState } from "react";
import { Field } from "@/components/ui/Field";
import { HIRING_DECISIONS } from "@/lib/constants";
import { formatStatusLabel } from "@/lib/status-ui";

type BatchOption = { id: string; name: string; trainerName: string; status: string };

export function HiringDecisionForm({
  candidateName,
  finalScore,
  batches,
  onSubmit,
  submitting,
}: {
  candidateName: string;
  finalScore: number | null;
  batches: BatchOption[];
  onSubmit: (payload: { decision: string; remarks: string; reassignBatchId?: string }) => Promise<void>;
  submitting: boolean;
}) {
  const [decision, setDecision] = useState<string>("");
  const [remarks, setRemarks] = useState("");
  const [reassignBatchId, setReassignBatchId] = useState("");

  async function handleSubmit() {
    if (!decision) return;
    await onSubmit({
      decision,
      remarks,
      ...(decision === "HOLD" && reassignBatchId ? { reassignBatchId } : {}),
    });
  }

  return (
    <div className="hiring-decision-form">
      <p className="muted">
        Mock call score for <strong>{candidateName}</strong>: <strong>{finalScore ?? "—"}/100</strong>
      </p>

      <div className="hiring-decision-options">
        {HIRING_DECISIONS.map((d) => (
          <button
            key={d}
            type="button"
            className={`hiring-option ${decision === d ? `active decision-${d.toLowerCase()}` : ""}`}
            onClick={() => setDecision(d)}
          >
            {formatStatusLabel(d)}
          </button>
        ))}
      </div>

      <Field label="HR remarks (required)">
        <textarea
          rows={3}
          value={remarks}
          onChange={(e) => setRemarks(e.target.value)}
          placeholder="Reason for this hiring decision…"
          required
          minLength={3}
        />
      </Field>

      {decision === "HOLD" ? (
        <Field label="Reassign to future batch (optional)">
          <select value={reassignBatchId} onChange={(e) => setReassignBatchId(e.target.value)}>
            <option value="">No reassignment — hold only</option>
            {batches.map((b) => (
              <option key={b.id} value={b.id}>
                {b.name} — {b.trainerName} ({formatStatusLabel(b.status)})
              </option>
            ))}
          </select>
          <span className="pub-file-hint">
            Reassignment resets evaluation so the candidate can re-train and take another mock call.
          </span>
        </Field>
      ) : null}

      <button
        type="button"
        disabled={submitting || !decision || remarks.trim().length < 3}
        onClick={() => void handleSubmit()}
      >
        {submitting ? "Saving decision…" : `Confirm ${decision ? formatStatusLabel(decision) : "decision"}`}
      </button>
    </div>
  );
}

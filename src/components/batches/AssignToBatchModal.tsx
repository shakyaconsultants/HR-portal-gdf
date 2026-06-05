"use client";

import { useEffect, useState } from "react";
import { Field } from "@/components/ui/Field";
import { getFriendlyApiMessage, parseApiResponse } from "@/lib/client-api";

type BatchOption = {
  id: string;
  name: string;
  capacity: number;
  assignedCount: number;
  remainingSeats: number;
};

export function AssignToBatchModal({
  open,
  selectedCount,
  batches,
  onClose,
  onConfirm,
}: {
  open: boolean;
  selectedCount: number;
  batches: BatchOption[];
  onClose: () => void;
  onConfirm: (batchId: string) => Promise<{ ok: boolean; message?: string }>;
}) {
  const [batchId, setBatchId] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!open) {
      setBatchId("");
      setError("");
      setSubmitting(false);
    }
  }, [open]);

  if (!open) return null;

  const selectedBatch = batches.find((b) => b.id === batchId);
  const overCapacity = selectedBatch ? selectedCount > selectedBatch.remainingSeats : false;

  async function handleConfirm() {
    if (!batchId) {
      setError("Choose a batch.");
      return;
    }
    if (overCapacity) {
      setError(`Only ${selectedBatch?.remainingSeats ?? 0} seat(s) available in this batch.`);
      return;
    }
    setSubmitting(true);
    setError("");
    const result = await onConfirm(batchId);
    if (!result.ok) {
      setError(result.message ?? "Assignment failed.");
      setSubmitting(false);
    }
  }

  return (
    <div className="modal-overlay" role="dialog" aria-modal="true" aria-labelledby="assign-batch-title">
      <div className="modal-panel">
        <h3 id="assign-batch-title">Assign to batch</h3>
        <p className="muted">
          Assign <strong>{selectedCount}</strong> verification-approved candidate
          {selectedCount === 1 ? "" : "s"} to a training batch.
        </p>

        <Field label="Choose batch">
          <select value={batchId} onChange={(e) => setBatchId(e.target.value)}>
            <option value="">Select batch…</option>
            {batches.map((b) => (
              <option key={b.id} value={b.id} disabled={b.remainingSeats === 0}>
                {b.name} — {b.assignedCount}/{b.capacity} assigned ({b.remainingSeats} remaining)
              </option>
            ))}
          </select>
        </Field>

        {selectedBatch ? (
          <div className="batch-seat-summary">
            <span>
              Assigned: <strong>{selectedBatch.assignedCount}</strong> / {selectedBatch.capacity}
            </span>
            <span>
              Remaining seats: <strong>{selectedBatch.remainingSeats}</strong>
            </span>
          </div>
        ) : null}

        {error ? <p className="form-error">{error}</p> : null}

        <div className="modal-actions">
          <button type="button" className="btn-secondary" onClick={onClose} disabled={submitting}>
            Cancel
          </button>
          <button type="button" onClick={() => void handleConfirm()} disabled={submitting || overCapacity}>
            {submitting ? "Assigning…" : `Confirm — assign ${selectedCount}`}
          </button>
        </div>
      </div>
    </div>
  );
}

export async function postBulkAssign(candidateIds: string[], batchId: string) {
  const res = await fetch("/api/batches/assign", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ candidateIds, batchId }),
  });
  const json = await parseApiResponse(res);
  if (res.ok && json.ok) {
    const data = json.data as { count?: number; remainingSeats?: number; batchName?: string };
    return {
      ok: true,
      message: `${data.count ?? candidateIds.length} assigned to ${data.batchName ?? "batch"}. ${data.remainingSeats ?? 0} seats remaining.`,
    };
  }
  return { ok: false, message: getFriendlyApiMessage(json, "Assignment failed.") };
}

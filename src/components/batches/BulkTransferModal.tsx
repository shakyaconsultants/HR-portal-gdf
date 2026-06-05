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

export function BulkTransferModal({
  open,
  selectedCount,
  fromBatchId,
  batches,
  onClose,
  onConfirm,
}: {
  open: boolean;
  selectedCount: number;
  fromBatchId: string;
  batches: BatchOption[];
  onClose: () => void;
  onConfirm: (toBatchId: string, reason: string) => Promise<{ ok: boolean; message?: string }>;
}) {
  const [toBatchId, setToBatchId] = useState("");
  const [reason, setReason] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  const destinations = batches.filter((b) => b.id !== fromBatchId);

  useEffect(() => {
    if (!open) {
      setToBatchId("");
      setReason("");
      setError("");
      setSubmitting(false);
    }
  }, [open]);

  if (!open) return null;

  const dest = destinations.find((b) => b.id === toBatchId);
  const overCapacity = dest ? selectedCount > dest.remainingSeats : false;

  async function handleConfirm() {
    if (!toBatchId) {
      setError("Choose a destination batch.");
      return;
    }
    if (!reason.trim()) {
      setError("Transfer reason is required.");
      return;
    }
    if (overCapacity) {
      setError(`Destination has only ${dest?.remainingSeats ?? 0} remaining seat(s).`);
      return;
    }
    setSubmitting(true);
    setError("");
    const result = await onConfirm(toBatchId, reason.trim());
    if (!result.ok) {
      setError(result.message ?? "Transfer failed.");
      setSubmitting(false);
    }
  }

  return (
    <div className="modal-overlay" role="dialog" aria-modal="true" aria-labelledby="bulk-transfer-title">
      <div className="modal-panel">
        <h3 id="bulk-transfer-title">Transfer candidates</h3>
        <p className="muted">
          Move <strong>{selectedCount}</strong> candidate{selectedCount === 1 ? "" : "s"} to another batch.
        </p>

        <Field label="Destination batch">
          <select value={toBatchId} onChange={(e) => setToBatchId(e.target.value)}>
            <option value="">Select batch…</option>
            {destinations.map((b) => (
              <option key={b.id} value={b.id} disabled={b.remainingSeats === 0}>
                {b.name} — {b.remainingSeats} seat(s) remaining
              </option>
            ))}
          </select>
        </Field>

        <Field label="Reason">
          <input
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="Why are these candidates being transferred?"
          />
        </Field>

        {dest ? (
          <div className="batch-seat-summary">
            <span>
              Destination assigned: <strong>{dest.assignedCount}</strong> / {dest.capacity}
            </span>
            <span>
              Remaining seats: <strong>{dest.remainingSeats}</strong>
            </span>
          </div>
        ) : null}

        {error ? <p className="form-error">{error}</p> : null}

        <div className="modal-actions">
          <button type="button" className="btn-secondary" onClick={onClose} disabled={submitting}>
            Cancel
          </button>
          <button
            type="button"
            onClick={() => void handleConfirm()}
            disabled={submitting || overCapacity || !reason.trim()}
          >
            {submitting ? "Transferring…" : `Confirm transfer (${selectedCount})`}
          </button>
        </div>
      </div>
    </div>
  );
}

export async function postBulkTransfer(
  candidateIds: string[],
  fromBatchId: string,
  toBatchId: string,
  reason: string
) {
  const res = await fetch("/api/batches/transfer", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ candidateIds, fromBatchId, toBatchId, reason }),
  });
  const json = await parseApiResponse(res);
  if (res.ok && json.ok) {
    const data = json.data as { count?: number; toBatchName?: string };
    return {
      ok: true,
      message: `${data.count ?? candidateIds.length} transferred to ${data.toBatchName ?? "batch"}.`,
    };
  }
  return { ok: false, message: getFriendlyApiMessage(json, "Transfer failed.") };
}

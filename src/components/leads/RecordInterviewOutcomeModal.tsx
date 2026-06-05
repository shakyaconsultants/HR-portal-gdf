"use client";

import { useEffect, useState } from "react";
import { Modal } from "@/components/ui/Modal";
import { Field } from "@/components/ui/Field";
import { useToast } from "@/components/ToastProvider";
import { getFriendlyApiMessage } from "@/lib/client-api";

export type OutcomeInterview = {
  id: string;
  candidateName: string;
  candidateEmail: string;
  interviewDate: string;
  interviewTime: string;
  interviewer: string;
  invitationSentAt: string | null;
  scheduledByName: string;
};

export function RecordInterviewOutcomeModal({
  open,
  onClose,
  interview,
  onRecorded,
}: {
  open: boolean;
  onClose: () => void;
  interview: OutcomeInterview | null;
  onRecorded?: () => void;
}) {
  const toast = useToast();
  const [remarks, setRemarks] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open) setRemarks("");
  }, [open, interview?.id]);

  function handleClose() {
    setRemarks("");
    onClose();
  }

  async function record(outcome: "SELECTED" | "REJECTED" | "HOLD") {
    if (!interview) return;
    const trimmed = remarks.trim();
    if (trimmed.length < 3) {
      toast.error("Remarks are required (minimum 3 characters).");
      return;
    }
    setSaving(true);
    const res = await fetch(`/api/interviews/${interview.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ outcome, remarks: trimmed }),
    });
    const json = await res.json();
    setSaving(false);
    if (res.ok && json.ok) {
      toast.success(
        outcome === "SELECTED"
          ? "Lead selected — ready for Letter of Intent."
          : outcome === "HOLD"
            ? "Lead placed on hold."
            : "Lead rejected — record kept permanently."
      );
      handleClose();
      onRecorded?.();
    } else {
      toast.error(getFriendlyApiMessage(json, "Unable to record outcome."));
    }
  }

  if (!interview) return null;

  return (
    <Modal
      open={open}
      onClose={handleClose}
      title="Record Interview Outcome"
      description={`${interview.candidateName} · ${new Date(interview.interviewDate).toLocaleDateString()} ${interview.interviewTime}`}
      size="md"
      footer={
        <div className="modal-actions lead-outcome-actions">
          <button type="button" className="btn-secondary" onClick={handleClose} disabled={saving}>
            Cancel
          </button>
          <button type="button" disabled={saving} onClick={() => void record("SELECTED")}>
            Selected → LOI
          </button>
          <button type="button" disabled={saving} onClick={() => void record("HOLD")}>
            Hold
          </button>
          <button type="button" className="btn-danger" disabled={saving} onClick={() => void record("REJECTED")}>
            Rejected
          </button>
        </div>
      }
    >
      <div className="stack">
        <p className="muted">
          Interviewer: {interview.interviewer}
          {interview.invitationSentAt
            ? ` · Invitation sent ${new Date(interview.invitationSentAt).toLocaleDateString()} by ${interview.scheduledByName}`
            : ""}
        </p>
        <Field label="Remarks (required)">
          <textarea
            rows={4}
            value={remarks}
            onChange={(e) => setRemarks(e.target.value)}
            placeholder="Interview feedback and decision rationale…"
          />
        </Field>
      </div>
    </Modal>
  );
}

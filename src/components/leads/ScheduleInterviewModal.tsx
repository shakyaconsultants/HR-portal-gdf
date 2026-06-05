"use client";

import { useCallback, useEffect, useState } from "react";
import { Modal } from "@/components/ui/Modal";
import { Field } from "@/components/ui/Field";
import { useToast } from "@/components/ToastProvider";
import { INTERVIEW_MODES } from "@/lib/constants";
import { formatInterviewMode } from "@/lib/interview-display";
import { getFriendlyApiMessage } from "@/lib/client-api";

type EligibleLead = {
  id: string;
  fullName: string;
  email: string;
};

export function ScheduleInterviewModal({
  open,
  onClose,
  onScheduled,
  initialLeadId = "",
}: {
  open: boolean;
  onClose: () => void;
  onScheduled?: () => void;
  initialLeadId?: string;
}) {
  const toast = useToast();
  const [eligible, setEligible] = useState<EligibleLead[]>([]);
  const [loadingEligible, setLoadingEligible] = useState(false);
  const [saving, setSaving] = useState(false);
  const [leadId, setLeadId] = useState(initialLeadId);
  const [interviewDate, setInterviewDate] = useState("");
  const [interviewTime, setInterviewTime] = useState("");
  const [interviewer, setInterviewer] = useState("");
  const [mode, setMode] = useState<string>(INTERVIEW_MODES[0]);
  const [instructions, setInstructions] = useState("");

  const loadEligible = useCallback(async () => {
    setLoadingEligible(true);
    const res = await fetch("/api/interviews?tab=eligible", { cache: "no-store" });
    const json = await res.json();
    if (res.ok && json.ok) {
      setEligible(json.data?.eligible ?? []);
    }
    setLoadingEligible(false);
  }, []);

  useEffect(() => {
    if (!open) return;
    setLeadId(initialLeadId);
    void loadEligible();
  }, [open, initialLeadId, loadEligible]);

  function reset() {
    setInterviewDate("");
    setInterviewTime("");
    setInterviewer("");
    setInstructions("");
    setMode(INTERVIEW_MODES[0]);
    if (!initialLeadId) setLeadId("");
  }

  function handleClose() {
    reset();
    onClose();
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!leadId) {
      toast.error("Select a lead.");
      return;
    }
    setSaving(true);
    const res = await fetch("/api/interviews", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        leadId,
        interviewDate,
        interviewTime,
        interviewer,
        mode,
        instructions,
      }),
    });
    const json = await res.json();
    setSaving(false);
    if (res.ok && json.ok) {
      toast.success("Interview scheduled and invitation email sent.");
      reset();
      onScheduled?.();
      onClose();
    } else {
      toast.error(getFriendlyApiMessage(json, "Unable to schedule interview."));
    }
  }

  return (
    <Modal
      open={open}
      onClose={handleClose}
      title="Schedule Interview"
      description="Invitation email is sent automatically with date, time, mode, and instructions."
      size="lg"
      footer={
        <div className="modal-actions">
          <button type="button" className="btn-secondary" onClick={handleClose} disabled={saving}>
            Cancel
          </button>
          <button type="submit" form="schedule-interview-form" disabled={saving || eligible.length === 0}>
            {saving ? "Scheduling…" : "Schedule & send invitation"}
          </button>
        </div>
      }
    >
      {loadingEligible ? (
        <div className="loading-line" />
      ) : eligible.length === 0 ? (
        <p className="muted">No eligible leads. Only leads with New Lead status can be scheduled.</p>
      ) : (
        <form id="schedule-interview-form" className="stack" onSubmit={(e) => void submit(e)}>
          <div className="form-grid">
            <Field label="Lead">
              <select
                value={leadId}
                onChange={(e) => setLeadId(e.target.value)}
                required
                disabled={Boolean(initialLeadId)}
              >
                <option value="">Select lead (New Lead status)</option>
                {eligible.map((l) => (
                  <option key={l.id} value={l.id}>
                    {l.fullName} — {l.email}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Interview date">
              <input
                type="date"
                value={interviewDate}
                onChange={(e) => setInterviewDate(e.target.value)}
                required
              />
            </Field>
            <Field label="Interview time">
              <input
                type="time"
                value={interviewTime}
                onChange={(e) => setInterviewTime(e.target.value)}
                required
              />
            </Field>
            <Field label="Interviewer">
              <input
                value={interviewer}
                onChange={(e) => setInterviewer(e.target.value)}
                required
                placeholder="Interviewer name"
              />
            </Field>
            <Field label="Mode">
              <select value={mode} onChange={(e) => setMode(e.target.value)} required>
                {INTERVIEW_MODES.map((m) => (
                  <option key={m} value={m}>
                    {formatInterviewMode(m)}
                  </option>
                ))}
              </select>
            </Field>
          </div>
          <Field label="Additional instructions (included in invitation email)">
            <textarea
              value={instructions}
              onChange={(e) => setInstructions(e.target.value)}
              rows={3}
              placeholder="Any extra instructions for the lead…"
            />
          </Field>
        </form>
      )}
    </Modal>
  );
}

"use client";

import { useEffect, useState } from "react";
import { useToast } from "@/components/ToastProvider";
import { LIFECYCLE_PIPELINE } from "@/lib/lifecycle";
import { formatStatusLabel } from "@/lib/status-ui";
import { getFriendlyApiMessage, isApiSuccess, parseApiResponse } from "@/lib/client-api";

export function CandidateStageControl({
  candidateId,
  currentStage,
  onUpdated,
}: {
  candidateId: string;
  currentStage: string;
  onUpdated: () => Promise<void>;
}) {
  const toast = useToast();
  const [stage, setStage] = useState(currentStage);
  const [remarks, setRemarks] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setStage(currentStage);
  }, [currentStage]);

  async function saveStage() {
    if (stage === currentStage) {
      toast.error("Select a different stage to update.");
      return;
    }
    setSaving(true);
    try {
      const res = await fetch(`/api/candidates/${candidateId}/lifecycle`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          action: "set_stage",
          lifecycleStage: stage,
          remarks: remarks.trim() || undefined,
        }),
      });
      const json = await parseApiResponse(res);
      if (isApiSuccess(json)) {
        toast.success(`Stage updated to ${formatStatusLabel(stage)}.`);
        setRemarks("");
        await onUpdated();
      } else {
        toast.error(getFriendlyApiMessage(json, "Unable to update stage."));
      }
    } catch {
      toast.error("Network error while updating stage.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="admin-stage-control">
      <p className="admin-stage-label">
        <strong>Admin — lifecycle stage</strong>
        <span className="muted">Rewind to Offer Letter to resend emails</span>
      </p>
      <div className="admin-stage-row">
        <select
          id="lifecycle-stage-select"
          value={stage}
          onChange={(e) => setStage(e.target.value)}
          disabled={saving}
          aria-label="Lifecycle stage"
        >
          {LIFECYCLE_PIPELINE.map((m) => (
            <option key={m.stage} value={m.stage}>
              {m.label}
            </option>
          ))}
        </select>
        <input
          type="text"
          placeholder="Reason (optional)"
          value={remarks}
          onChange={(e) => setRemarks(e.target.value)}
          disabled={saving}
        />
        <button type="button" className="btn-secondary btn-sm" disabled={saving} onClick={() => void saveStage()}>
          {saving ? "Saving…" : "Update stage"}
        </button>
      </div>
    </div>
  );
}

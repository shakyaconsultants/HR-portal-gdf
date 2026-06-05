"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useToast } from "@/components/ToastProvider";
import { Field } from "@/components/ui/Field";
import { PageSection } from "@/components/ui/PageSection";
import { VERIFICATION_STAGES } from "@/lib/constants";
import { formatStatusLabel } from "@/lib/status-ui";
import { getFriendlyApiMessage, parseApiResponse } from "@/lib/client-api";

type HistoryItem = {
  id: string;
  previousStage: string | null;
  stage: string;
  action: string;
  remarks: string;
  actorName: string;
  actorRole: string;
  createdAt: string;
};

export function VerificationProfileSection({
  candidateId,
  verificationStage,
  status,
  onUpdated,
}: {
  candidateId: string;
  verificationStage: string;
  status: string;
  onUpdated: () => Promise<void>;
}) {
  const toast = useToast();
  const [remarks, setRemarks] = useState("");
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [acting, setActing] = useState(false);

  const isApproved = status === "BATCH_ASSIGNMENT" || verificationStage === "FINAL_APPROVED";
  const isPending =
    (status === "REGISTRATION_SUBMITTED" || status === "VERIFICATION") && !isApproved;
  const currentIdx = VERIFICATION_STAGES.indexOf(verificationStage as (typeof VERIFICATION_STAGES)[number]);

  useEffect(() => {
    async function load() {
      const res = await fetch(`/api/candidates/${candidateId}/verification`, { cache: "no-store" });
      const json = await res.json();
      if (res.ok && json.ok) {
        setHistory(json.data.history ?? []);
      }
      setLoading(false);
    }
    void load();
  }, [candidateId, status, verificationStage]);

  async function runAction(action: "advance" | "reject") {
    setActing(true);
    const res = await fetch(`/api/candidates/${candidateId}/verification`, {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ action, remarks }),
    });
    const json = await parseApiResponse(res);
    if (res.ok && json.ok) {
      toast.success(
        action === "reject"
          ? "Verification rejected."
          : (json.data as { eligibleForBatch?: boolean } | undefined)?.eligibleForBatch
            ? "Approved — eligible for batch assignment."
            : "Stage advanced."
      );
      setRemarks("");
      await onUpdated();
      const histRes = await fetch(`/api/candidates/${candidateId}/verification`, { cache: "no-store" });
      const histJson = await histRes.json();
      if (histRes.ok) setHistory(histJson.data?.history ?? []);
    } else {
      toast.error(getFriendlyApiMessage(json, "Verification update failed."));
    }
    setActing(false);
  }

  return (
    <PageSection
      title="Background verification"
      description="Multi-stage verification with HR remarks. Final approval makes the candidate eligible for batch assignment."
    >
      <div className="verification-stepper" aria-label="Verification stages">
        {VERIFICATION_STAGES.map((stage, idx) => {
          const done = isApproved || currentIdx > idx;
          const current = verificationStage === stage && !isApproved;
          return (
            <div key={stage} className={`verify-step ${done ? "done" : ""} ${current ? "current" : ""}`}>
              <span className="verify-step-dot">{done ? "✓" : idx + 1}</span>
              <span className="verify-step-label">{formatStatusLabel(stage)}</span>
            </div>
          );
        })}
      </div>

      {isApproved ? (
        <p className="verify-approved-banner">
          Verification approved —{" "}
          <Link href="/batches" className="profile-link">
            open a batch to assign
          </Link>
        </p>
      ) : null}

      {isPending ? (
        <div className="verification-workspace">
          <Field label="HR remarks">
            <textarea
              rows={3}
              value={remarks}
              onChange={(e) => setRemarks(e.target.value)}
              placeholder="Notes for this step (required when rejecting)"
            />
          </Field>
          <div className="row">
            <button type="button" disabled={acting} onClick={() => void runAction("advance")}>
              {acting
                ? "Updating…"
                : verificationStage === "REFERENCE_VERIFIED"
                  ? "Final approve"
                  : "Advance to next stage"}
            </button>
            <button type="button" className="btn-secondary" disabled={acting} onClick={() => void runAction("reject")}>
              Reject verification
            </button>
          </div>
        </div>
      ) : null}

      <h4 className="section-subtitle">Verification history</h4>
      {loading ? (
        <div className="loading-line" />
      ) : history.length === 0 ? (
        <p className="muted">No verification history yet.</p>
      ) : (
        <ul className="timeline-list verify-history">
          {history.map((h) => (
            <li key={h.id}>
              <span className="timeline-date">{new Date(h.createdAt).toLocaleString()}</span>
              <strong>
                {formatStatusLabel(h.action)}
                {h.previousStage ? ` · ${formatStatusLabel(h.previousStage)} → ` : " · "}
                {formatStatusLabel(h.stage)}
              </strong>
              <p>{h.remarks}</p>
              <span className="muted">
                {h.actorName} ({h.actorRole})
              </span>
            </li>
          ))}
        </ul>
      )}
    </PageSection>
  );
}

"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { useToast } from "@/components/ToastProvider";
import { Badge } from "@/components/ui/Badge";
import { getFriendlyApiMessage, isApiSuccess, parseApiResponse } from "@/lib/client-api";
import { deliveryToVariant, formatStatusLabel } from "@/lib/status-ui";

type IdCardStatus = {
  canGenerate: boolean;
  generated: boolean;
  pdfPath: string;
  fileName: string;
  generatedAt: string | null;
  emailStatus: string | null;
  emailSentAt: string | null;
  lifecycleStage: string;
  employeeCode?: string | null;
};

type ProfileIdCardSnapshot = {
  pdfPath?: string;
  fileName?: string;
  generatedAt?: string | null;
  emailStatus?: string | null;
  emailSentAt?: string | null;
};

function normalizeStatus(
  data: Partial<IdCardStatus> | null,
  lifecycleStage: string
): IdCardStatus | null {
  if (!data) return null;
  const pdfPath = String(data.pdfPath ?? "").trim();
  const generated =
    Boolean(pdfPath) ||
    Boolean(data.generated) ||
    data.lifecycleStage === "EMPLOYEE" ||
    lifecycleStage === "EMPLOYEE";

  return {
    canGenerate: Boolean(data.canGenerate),
    generated,
    pdfPath,
    fileName: String(data.fileName ?? "").trim(),
    generatedAt: data.generatedAt ?? null,
    emailStatus: data.emailStatus ?? null,
    emailSentAt: data.emailSentAt ?? null,
    lifecycleStage: data.lifecycleStage ?? lifecycleStage,
    employeeCode: data.employeeCode ?? null,
  };
}

function snapshotToStatus(snapshot: ProfileIdCardSnapshot, lifecycleStage: string): IdCardStatus | null {
  const pdfPath = String(snapshot.pdfPath ?? "").trim();
  if (!pdfPath && lifecycleStage !== "EMPLOYEE") return null;

  return normalizeStatus(
    {
      canGenerate: true,
      generated: Boolean(pdfPath) || lifecycleStage === "EMPLOYEE",
      pdfPath,
      fileName: snapshot.fileName ?? "",
      generatedAt: snapshot.generatedAt ?? null,
      emailStatus: snapshot.emailStatus ?? null,
      emailSentAt: snapshot.emailSentAt ?? null,
      lifecycleStage,
    },
    lifecycleStage
  );
}

export function IdCardGenerationSection({
  candidateId,
  formsReady,
  lifecycleStage,
  profileIdCard,
  onUpdated,
}: {
  candidateId: string;
  formsReady: boolean;
  lifecycleStage: string;
  profileIdCard?: ProfileIdCardSnapshot;
  onUpdated?: () => Promise<void>;
}) {
  const toast = useToast();
  const [status, setStatus] = useState<IdCardStatus | null>(() =>
    profileIdCard ? snapshotToStatus(profileIdCard, lifecycleStage) : null
  );
  const [loading, setLoading] = useState(!profileIdCard?.pdfPath);
  const [refreshing, setRefreshing] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [sending, setSending] = useState(false);

  const load = useCallback(
    async (opts?: { silent?: boolean }) => {
      if (!opts?.silent) setLoading(true);
      else setRefreshing(true);

      const res = await fetch(`/api/onboarding/${candidateId}/id-card`, { cache: "no-store" });
      const json = await parseApiResponse<IdCardStatus>(res);
      if (res.ok && json.ok && json.data) {
        setStatus(normalizeStatus(json.data, lifecycleStage));
      }

      setLoading(false);
      setRefreshing(false);
    },
    [candidateId, lifecycleStage]
  );

  useEffect(() => {
    void load({ silent: Boolean(status?.pdfPath) });
  }, [load, lifecycleStage]);

  useEffect(() => {
    if (!profileIdCard) return;
    const fromProfile = snapshotToStatus(profileIdCard, lifecycleStage);
    if (!fromProfile) return;
    setStatus((prev) => {
      if (!prev) return fromProfile;
      const pdfPath = prev.pdfPath || fromProfile.pdfPath;
      return normalizeStatus({ ...prev, ...fromProfile, pdfPath }, lifecycleStage);
    });
  }, [profileIdCard, lifecycleStage]);

  async function handleGenerate() {
    setGenerating(true);
    try {
      const res = await fetch(`/api/onboarding/${candidateId}/id-card`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ action: "generate" }),
      });
      const json = await parseApiResponse<{
        employeeCode?: string;
        pdfPath?: string;
        fileName?: string;
        generatedAt?: string;
        lifecycleStage?: string;
        message?: string;
      }>(res);
      if (isApiSuccess(json)) {
        const pdfPath = String(json.data?.pdfPath ?? "").trim();
        setStatus((prev) =>
          normalizeStatus(
            {
              ...(prev ?? { canGenerate: true }),
              generated: true,
              pdfPath,
              fileName: json.data?.fileName ?? prev?.fileName ?? "",
              generatedAt: json.data?.generatedAt ?? new Date().toISOString(),
              lifecycleStage: json.data?.lifecycleStage ?? "EMPLOYEE",
              employeeCode: json.data?.employeeCode ?? prev?.employeeCode ?? null,
            },
            "EMPLOYEE"
          )
        );
        toast.success(
          json.data?.message ??
            `ID card generated. Employee code: ${json.data?.employeeCode ?? "assigned"}.`
        );
        await load({ silent: true });
        await onUpdated?.();
      } else {
        toast.error(getFriendlyApiMessage(json, "Unable to generate ID card."));
      }
    } catch {
      toast.error("Network error while generating ID card.");
    } finally {
      setGenerating(false);
    }
  }

  async function handleSend() {
    setSending(true);
    try {
      const res = await fetch(`/api/onboarding/${candidateId}/id-card`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ action: "send" }),
      });
      const json = await parseApiResponse<{ status?: string; sentAt?: string }>(res);
      if (isApiSuccess(json)) {
        toast.success("ID card emailed to candidate.");
        setStatus((prev) =>
          prev
            ? {
                ...prev,
                emailStatus: json.data?.status ?? "SENT",
                emailSentAt: json.data?.sentAt ?? new Date().toISOString(),
              }
            : prev
        );
        await load({ silent: true });
      } else {
        toast.error(getFriendlyApiMessage(json, "Unable to send ID card email."));
      }
    } catch {
      toast.error("Network error while sending ID card.");
    } finally {
      setSending(false);
    }
  }

  const isEmployee = lifecycleStage === "EMPLOYEE" || status?.lifecycleStage === "EMPLOYEE";
  const hasPdf = Boolean(status?.pdfPath);
  const hasGenerated = Boolean(status?.generated) || hasPdf || isEmployee;
  const canGenerate = formsReady && (status?.canGenerate ?? false);
  const canSend = hasPdf;

  return (
    <div className="onboarding-id-card-block">
      <h4 className="section-subtitle">ID card generation</h4>
      <p className="muted" style={{ marginBottom: "1rem" }}>
        When both forms above are complete, generate the employee ID card PDF and transfer the candidate to the
        Employees panel.
      </p>

      {loading && !status ? (
        <p className="muted">Loading ID card status…</p>
      ) : !status ? (
        <p className="muted">Unable to load ID card status.</p>
      ) : (
        <div className="stack" style={{ gap: "1rem" }}>
          {refreshing ? <p className="muted">Refreshing status…</p> : null}

          {!formsReady ? (
            <p className="muted comm-blocked-msg">Complete both onboarding forms above before generating an ID card.</p>
          ) : null}

          {hasGenerated ? (
            <div className="comm-action-card">
              <div className="comm-action-header">
                <strong>Generated ID card</strong>
                <Badge variant="success">Saved</Badge>
              </div>
              {status.generatedAt ? (
                <p className="muted comm-action-meta">
                  Generated {new Date(status.generatedAt).toLocaleString()}
                </p>
              ) : null}
              {status.employeeCode ? (
                <p className="muted comm-action-meta">Employee code: {status.employeeCode}</p>
              ) : null}
              {hasPdf ? (
                <div className="id-card-view-actions">
                  <a
                    href={status.pdfPath}
                    target="_blank"
                    rel="noreferrer"
                    className="btn-secondary btn-sm"
                  >
                    View ID card PDF
                  </a>
                  <a href={status.pdfPath} download className="profile-link">
                    Download
                  </a>
                </div>
              ) : (
                <p className="muted comm-blocked-msg">
                  PDF path not found in records. Use <strong>Regenerate</strong> to create the file again.
                </p>
              )}
              {status.emailStatus ? (
                <p className="muted" style={{ marginTop: "0.5rem" }}>
                  Email:{" "}
                  <Badge variant={deliveryToVariant(status.emailStatus)}>
                    {formatStatusLabel(status.emailStatus)}
                  </Badge>
                  {status.emailSentAt ? ` · ${new Date(status.emailSentAt).toLocaleString()}` : null}
                </p>
              ) : null}
            </div>
          ) : null}

          {isEmployee ? (
            <p className="muted">
              Transferred to <strong>Employee</strong>.{" "}
              <Link href="/employees" className="profile-link">
                Open Employees panel →
              </Link>
            </p>
          ) : null}

          <div className="admin-stage-row" style={{ flexWrap: "wrap", gap: "0.5rem" }}>
            {!hasGenerated ? (
              <button
                type="button"
                className="btn-secondary btn-sm"
                disabled={generating || !canGenerate}
                onClick={() => void handleGenerate()}
              >
                {generating ? "Generating…" : "Generate ID card & transfer to Employee"}
              </button>
            ) : (
              <button
                type="button"
                className="btn-secondary btn-sm"
                disabled={generating || !canGenerate}
                onClick={() => void handleGenerate()}
              >
                {generating ? "Regenerating…" : "Regenerate ID card"}
              </button>
            )}
            <button
              type="button"
              className="btn-secondary btn-sm"
              disabled={sending || !canSend}
              title={!canSend ? "Generate the ID card first" : undefined}
              onClick={() => void handleSend()}
            >
              {sending ? "Sending…" : "Send ID card to candidate"}
            </button>
            {hasPdf ? (
              <a href={status.pdfPath} target="_blank" rel="noreferrer" className="btn-secondary btn-sm">
                View PDF
              </a>
            ) : null}
            {isEmployee ? (
              <Link href="/employees" className="btn-secondary btn-sm">
                View Employees
              </Link>
            ) : null}
          </div>
        </div>
      )}
    </div>
  );
}

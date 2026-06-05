"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useToast } from "@/components/ToastProvider";
import { CommunicationHistoryModal } from "@/components/communications/CommunicationHistoryModal";
import { CommunicationSendForm } from "@/components/communications/CommunicationSendForm";
import { PageSection } from "@/components/ui/PageSection";
import { formatStatusLabel } from "@/lib/status-ui";
import { getFriendlyApiMessage, isApiSuccess, parseApiResponse } from "@/lib/client-api";
import { sanitizeDeliveryError } from "@/lib/delivery-errors";
import { mapCommStatusFromLogs } from "@/lib/comm-status";

type HistoryItem = {
  id: string;
  type: string;
  subject: string;
  sentToEmail: string;
  status: string;
  sentByName: string;
  sentAt: string;
  errorMessage?: string;
};

type CommStatus = {
  sent: boolean;
  lastSentAt: string | null;
  status: string | null;
  sentByName: string | null;
};

export function CommunicationProfileSection({
  candidateId,
  fullName,
  email,
  decision,
  onUpdated,
}: {
  candidateId: string;
  fullName: string;
  email: string;
  decision: string | null;
  onUpdated: () => Promise<void>;
}) {
  const toast = useToast();
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [communications, setCommunications] = useState<Record<string, CommStatus>>({});
  const [submitting, setSubmitting] = useState(false);
  const [retryingId, setRetryingId] = useState<string | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [historyOpen, setHistoryOpen] = useState(false);
  const canSend = decision === "SELECTED";

  useEffect(() => {
    void fetch("/api/auth/me")
      .then((r) => r.json())
      .then((j) => setIsAdmin(j.data?.user?.role === "ADMIN"));
  }, []);

  function applyHistory(items: HistoryItem[]) {
    setHistory(items);
    setCommunications(mapCommStatusFromLogs(items));
  }

  useEffect(() => {
    void fetch(`/api/communications/${candidateId}/history`, { cache: "no-store" })
      .then((r) => r.json())
      .then((histJson) => {
        if (histJson.ok) applyHistory(histJson.data?.items ?? []);
      });
  }, [candidateId, decision]);

  async function retryEmail(logId: string) {
    setRetryingId(logId);
    try {
      const res = await fetch(`/api/communications/logs/${logId}/retry`, { method: "POST" });
      const json = await parseApiResponse<{ status?: string; errorMessage?: string }>(res);
      if (isApiSuccess(json)) {
        if (json.data?.status === "SENT") {
          toast.success("Email delivered successfully.");
        } else {
          toast.error(
            json.data?.errorMessage
              ? sanitizeDeliveryError(json.data.errorMessage)
              : "Retry failed. Check SMTP settings."
          );
        }
        const histRes = await fetch(`/api/communications/${candidateId}/history`, { cache: "no-store" });
        const histJson = await parseApiResponse<{ items?: HistoryItem[] }>(histRes);
        if (histRes.ok && histJson.ok) applyHistory(histJson.data?.items ?? []);
        await onUpdated();
      } else {
        toast.error(getFriendlyApiMessage(json, "Unable to retry email."));
      }
    } catch {
      toast.error("Network error while retrying email.");
    } finally {
      setRetryingId(null);
    }
  }

  async function sendCommunication(
    type: string,
    payload?: { joiningDate?: string; offerDetails?: Record<string, string> }
  ) {
    setSubmitting(true);
    try {
      const needsResend =
        isAdmin &&
        (Boolean(communications[type]?.sent) ||
          communications[type]?.status === "FAILED" ||
          communications[type]?.status === "PENDING");
      const res = await fetch("/api/communications", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          candidateId,
          type,
          ...payload,
          ...(needsResend ? { resend: true } : {}),
        }),
      });
      const json = await parseApiResponse<{ status?: string; errorMessage?: string }>(res);
      if (isApiSuccess(json)) {
        const delivery = json.data?.status;
        if (delivery === "FAILED") {
          toast.error(
            json.data?.errorMessage
              ? sanitizeDeliveryError(json.data.errorMessage)
              : getFriendlyApiMessage(
                  json,
                  `${formatStatusLabel(type)} could not be delivered. Check Email Management to retry.`
                )
          );
        } else {
          toast.success(`${formatStatusLabel(type)} sent successfully.`);
        }
        await onUpdated();
        const histRes = await fetch(`/api/communications/${candidateId}/history`, { cache: "no-store" });
        const histJson = await parseApiResponse<{ items?: HistoryItem[] }>(histRes);
        if (histRes.ok && histJson.ok) applyHistory(histJson.data?.items ?? []);
      } else {
        toast.error(getFriendlyApiMessage(json, "Unable to send communication."));
      }
    } catch {
      toast.error("Network error while sending. Check your connection and try again.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <PageSection
      title="Communication workflow"
      description="Send offer letter, training completion letter, and joining instructions to selected candidates."
    >
      <div className="comm-section-toolbar">
        <Link href="/communications" className="profile-link">
          Open Communication Workflow →
        </Link>
        <button type="button" className="btn-secondary btn-sm" onClick={() => setHistoryOpen(true)}>
          Communication history{history.length > 0 ? ` (${history.length})` : ""}
        </button>
      </div>

      {!canSend ? (
        <p className="muted">Candidate must be marked Selected before sending communications.</p>
      ) : (
        <CommunicationSendForm
          candidateName={fullName}
          email={email}
          communications={communications}
          submitting={submitting}
          onSend={sendCommunication}
        />
      )}

      <CommunicationHistoryModal
        open={historyOpen}
        onClose={() => setHistoryOpen(false)}
        items={history}
        retryingId={retryingId}
        onRetry={(logId) => void retryEmail(logId)}
      />
    </PageSection>
  );
}

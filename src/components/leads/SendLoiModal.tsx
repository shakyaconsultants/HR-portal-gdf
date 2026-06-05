"use client";

import { useState } from "react";
import { Modal } from "@/components/ui/Modal";
import { useToast } from "@/components/ToastProvider";
import { getFriendlyApiMessage, isApiSuccess, parseApiResponse } from "@/lib/client-api";
import { sanitizeDeliveryError } from "@/lib/delivery-errors";

export function SendLoiModal({
  open,
  onClose,
  leadId,
  leadName,
  leadEmail,
  onSent,
}: {
  open: boolean;
  onClose: () => void;
  leadId: string;
  leadName: string;
  leadEmail: string;
  onSent?: () => void;
}) {
  const toast = useToast();
  const [sending, setSending] = useState(false);

  async function send() {
    setSending(true);
    try {
      const res = await fetch(`/api/letter-of-intent/${leadId}/send`, { method: "POST" });
      const json = await parseApiResponse(res);
      if (isApiSuccess(json)) {
        const data = json.data as { emailStatus?: string; errorMessage?: string };
        if (data.emailStatus === "FAILED") {
          toast.error(
            data.errorMessage
              ? sanitizeDeliveryError(data.errorMessage)
              : "LOI could not be delivered. Check Email Management to retry."
          );
        } else {
          toast.success("LOI email sent with registration link.");
          onSent?.();
          onClose();
        }
      } else {
        toast.error(getFriendlyApiMessage(json, "Unable to send LOI."));
      }
    } catch {
      toast.error("Network error while sending LOI. Please try again.");
    } finally {
      setSending(false);
    }
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Send Letter of Intent"
      description="A responsive HTML email with a secure registration link will be sent to the lead."
      size="sm"
      footer={
        <div className="modal-actions">
          <button type="button" className="btn-secondary" onClick={onClose} disabled={sending}>
            Cancel
          </button>
          <button type="button" onClick={() => void send()} disabled={sending}>
            {sending ? "Sending…" : "Send LOI email"}
          </button>
        </div>
      }
    >
      <div className="stack">
        <p>
          <strong>{leadName}</strong>
        </p>
        <p className="muted">{leadEmail}</p>
        <p className="muted">
          No candidate record is created until the lead completes registration via the link in the email.
        </p>
      </div>
    </Modal>
  );
}

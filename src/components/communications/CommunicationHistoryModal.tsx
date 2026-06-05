"use client";

import { Modal } from "@/components/ui/Modal";
import { Badge } from "@/components/ui/Badge";
import { sanitizeDeliveryError } from "@/lib/delivery-errors";
import { deliveryToVariant, formatStatusLabel } from "@/lib/status-ui";

export type CommunicationHistoryItem = {
  id: string;
  type: string;
  subject: string;
  sentToEmail: string;
  status: string;
  sentByName: string;
  sentAt: string;
  errorMessage?: string;
};

export function CommunicationHistoryModal({
  open,
  onClose,
  items,
  retryingId,
  onRetry,
}: {
  open: boolean;
  onClose: () => void;
  items: CommunicationHistoryItem[];
  retryingId: string | null;
  onRetry: (logId: string) => void;
}) {
  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Communication history"
      description={
        items.length > 0
          ? `${items.length} email${items.length === 1 ? "" : "s"} logged for this candidate.`
          : "All offer letter and joining instruction emails sent to this candidate."
      }
      size="lg"
      footer={
        <div className="modal-actions">
          <button type="button" className="btn-secondary" onClick={onClose}>
            Close
          </button>
        </div>
      }
    >
      {items.length === 0 ? (
        <p className="muted">No communications sent yet.</p>
      ) : (
        <ul className="timeline-list verify-history comm-history comm-history-modal">
          {items.map((h) => (
            <li key={h.id}>
              <span className="timeline-date">{new Date(h.sentAt).toLocaleString()}</span>
              <strong>{formatStatusLabel(h.type)}</strong>
              <p>{h.subject}</p>
              <p className="muted">
                To: {h.sentToEmail} ·{" "}
                <Badge variant={deliveryToVariant(h.status)}>{formatStatusLabel(h.status)}</Badge>
              </p>
              <span className="muted">Sent by {h.sentByName}</span>
              {h.status === "FAILED" && h.errorMessage ? (
                <p className="comm-error-msg">{sanitizeDeliveryError(h.errorMessage)}</p>
              ) : null}
              {h.status === "FAILED" ? (
                <button
                  type="button"
                  className="btn-secondary btn-sm"
                  style={{ marginTop: "0.5rem" }}
                  disabled={retryingId === h.id}
                  onClick={() => onRetry(h.id)}
                >
                  {retryingId === h.id ? "Retrying…" : "Retry delivery"}
                </button>
              ) : null}
              {h.status === "PENDING" ? (
                <p className="muted">Delivery still processing — refresh or retry from Email Management.</p>
              ) : null}
            </li>
          ))}
        </ul>
      )}
    </Modal>
  );
}

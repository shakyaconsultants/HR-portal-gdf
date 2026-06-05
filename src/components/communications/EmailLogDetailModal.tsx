"use client";

import { useEffect, useState } from "react";
import { Badge } from "@/components/ui/Badge";
import { communicationTypeLabel } from "@/lib/email-templates";
import { sanitizeDeliveryError } from "@/lib/delivery-errors";
import { deliveryToVariant, formatStatusLabel } from "@/lib/status-ui";

type LogDetail = {
  id: string;
  candidateName: string;
  type: string;
  subject: string;
  sentToEmail: string;
  sentByName: string;
  sentAt: string;
  status: string;
  errorMessage: string;
  retryCount?: number;
  body: string;
  htmlBody: string;
  attachments: Array<{ fileName: string; mimeType: string; storagePath: string; size: number }>;
};

export function EmailLogDetailModal({
  logId,
  onClose,
  onRetry,
}: {
  logId: string | null;
  onClose: () => void;
  onRetry?: () => void;
}) {
  const [detail, setDetail] = useState<LogDetail | null>(null);
  const [loading, setLoading] = useState(false);
  const [view, setView] = useState<"html" | "text">("html");

  useEffect(() => {
    if (!logId) {
      setDetail(null);
      return;
    }
    setLoading(true);
    void fetch(`/api/communications/logs/${logId}`, { cache: "no-store" })
      .then((r) => r.json())
      .then((json) => {
        if (json.ok) setDetail(json.data as LogDetail);
      })
      .finally(() => setLoading(false));
  }, [logId]);

  if (!logId) return null;

  return (
    <div className="modal-overlay" role="dialog" aria-modal="true" onClick={onClose}>
      <div className="modal-panel modal-panel-wide" onClick={(e) => e.stopPropagation()}>
        <div className="modal-panel-head">
          <h3>Email log detail</h3>
          <button type="button" className="btn-secondary btn-sm" onClick={onClose}>
            Close
          </button>
        </div>

        {loading || !detail ? (
          <div className="loading-line" />
        ) : (
          <div className="stack-md">
            <div className="detail-grid">
              <div>
                <dt className="muted">Template</dt>
                <dd>{communicationTypeLabel(detail.type)}</dd>
              </div>
              <div>
                <dt className="muted">Candidate</dt>
                <dd>{detail.candidateName}</dd>
              </div>
              <div>
                <dt className="muted">Status</dt>
                <dd>
                  <Badge variant={deliveryToVariant(detail.status)}>{formatStatusLabel(detail.status)}</Badge>
                </dd>
              </div>
              <div>
                <dt className="muted">Sent to</dt>
                <dd>{detail.sentToEmail}</dd>
              </div>
              <div>
                <dt className="muted">Sent by</dt>
                <dd>{detail.sentByName}</dd>
              </div>
              <div>
                <dt className="muted">Sent at</dt>
                <dd>{new Date(detail.sentAt).toLocaleString()}</dd>
              </div>
            </div>

            <div>
              <strong>Subject:</strong> {detail.subject}
            </div>

            {detail.errorMessage ? (
              <p className="form-error">{sanitizeDeliveryError(detail.errorMessage)}</p>
            ) : null}

            {detail.status === "FAILED" && onRetry ? (
              <button type="button" className="btn-secondary btn-sm" onClick={onRetry}>
                Retry failed email{detail.retryCount != null ? ` (${detail.retryCount}/3)` : ""}
              </button>
            ) : null}

            {detail.attachments.length > 0 ? (
              <div>
                <strong>Attachments</strong>
                <ul className="email-attachment-list">
                  {detail.attachments.map((att) => (
                    <li key={att.fileName}>
                      {att.fileName} ({att.mimeType})
                      {att.storagePath ? (
                        <>
                          {" "}
                          — <a href={att.storagePath} target="_blank" rel="noopener noreferrer">Open</a>
                        </>
                      ) : null}
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}

            <div className="tab-bar">
              <button type="button" className={view === "html" ? "active" : ""} onClick={() => setView("html")}>
                HTML
              </button>
              <button type="button" className={view === "text" ? "active" : ""} onClick={() => setView("text")}>
                Plain text
              </button>
            </div>

            {view === "html" && detail.htmlBody ? (
              <iframe
                title="Email HTML preview"
                className="email-html-preview"
                srcDoc={detail.htmlBody}
                sandbox=""
              />
            ) : (
              <pre className="email-text-preview">{detail.body}</pre>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

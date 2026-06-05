"use client";

import { useEffect, useState } from "react";
import type { CommunicationType } from "@/lib/constants";
import { communicationTypeLabel } from "@/lib/email-templates";
import { Badge } from "@/components/ui/Badge";
import { Field } from "@/components/ui/Field";
import { Modal } from "@/components/ui/Modal";
import { canSendWorkflowCommunication } from "@/lib/communication-gates";
import { sanitizeDeliveryError } from "@/lib/delivery-errors";
import { deliveryToVariant, formatStatusLabel } from "@/lib/status-ui";

type CommStatus = {
  sent: boolean;
  lastSentAt: string | null;
  status: string | null;
  sentByName: string | null;
  logId?: string | null;
  errorMessage?: string | null;
};

export type OfferLetterFormData = {
  candidateName: string;
  designation: string;
  department: string;
  ctc: string;
  joiningDate: string;
  reportingManager: string;
  offerDate: string;
};

function defaultOfferForm(candidateName: string): OfferLetterFormData {
  return {
    candidateName,
    designation: "Financial Advisor",
    department: "",
    ctc: "",
    joiningDate: "",
    reportingManager: "",
    offerDate: new Date().toISOString().slice(0, 10),
  };
}

function isOfferFormValid(form: OfferLetterFormData) {
  return Boolean(
    form.candidateName &&
      form.designation &&
      form.department &&
      form.ctc &&
      form.joiningDate &&
      form.reportingManager &&
      form.offerDate
  );
}

export function CommunicationSendForm({
  candidateName,
  email,
  communications,
  submitting,
  onSend,
  allowedTypes,
}: {
  candidateName: string;
  email: string;
  communications: Record<string, CommStatus>;
  submitting: boolean;
  onSend: (type: string, payload?: { joiningDate?: string; offerDetails?: OfferLetterFormData }) => Promise<void>;
  allowedTypes?: CommunicationType[];
}) {
  const [pendingType, setPendingType] = useState<string | null>(null);
  const [modalType, setModalType] = useState<"OFFER_LETTER" | "JOINING_INSTRUCTIONS" | null>(null);
  const [joiningDate, setJoiningDate] = useState("");
  const [offerForm, setOfferForm] = useState<OfferLetterFormData>(() => defaultOfferForm(candidateName));

  const types = allowedTypes ?? (["OFFER_LETTER", "JOINING_INSTRUCTIONS"] as CommunicationType[]);

  useEffect(() => {
    setOfferForm((prev) => ({ ...prev, candidateName }));
  }, [candidateName]);

  function openModal(type: "OFFER_LETTER" | "JOINING_INSTRUCTIONS") {
    if (type === "OFFER_LETTER") {
      setOfferForm(defaultOfferForm(candidateName));
    } else {
      setJoiningDate("");
    }
    setModalType(type);
  }

  function closeModal() {
    if (submitting) return;
    setModalType(null);
  }

  async function handleSend(type: string, payload?: { joiningDate?: string; offerDetails?: OfferLetterFormData }) {
    setPendingType(type);
    try {
      await onSend(type, payload);
      setModalType(null);
    } finally {
      setPendingType(null);
    }
  }

  const offerBusy = submitting && pendingType === "OFFER_LETTER";
  const joiningBusy = submitting && pendingType === "JOINING_INSTRUCTIONS";

  return (
    <div className="comm-send-form">
      <p className="muted">
        Send to <strong>{candidateName}</strong> at <strong>{email}</strong> via SMTP. Interview, LOI, and onboarding
        emails are HTML only. Offer letter is the only communication that generates a PDF attachment.
      </p>
      <div className="comm-action-grid">
        {types.map((type) => {
          const status = communications[type];
          const isOffer = type === "OFFER_LETTER";
          const isJoining = type === "JOINING_INSTRUCTIONS";
          const busy = submitting && pendingType === type;
          const gate = canSendWorkflowCommunication(type, communications);

          return (
            <div key={type} className="comm-action-card">
              <div className="comm-action-header">
                <strong>{communicationTypeLabel(type)}</strong>
                {status?.status ? (
                  <Badge variant={deliveryToVariant(status.status)}>{formatStatusLabel(status.status)}</Badge>
                ) : (
                  <Badge variant="warning">Not sent</Badge>
                )}
              </div>
              {status?.lastSentAt ? (
                <p className="muted comm-action-meta">
                  {new Date(status.lastSentAt).toLocaleString()}
                  {status.sentByName ? ` · ${status.sentByName}` : ""}
                </p>
              ) : (
                <p className="muted comm-action-meta">Ready to send</p>
              )}
              {status?.status === "FAILED" && status.errorMessage ? (
                <p className="comm-error-msg">{sanitizeDeliveryError(status.errorMessage)}</p>
              ) : null}

              {gate.allowed ? (
                <p className="muted comm-action-hint">
                  {isOffer
                    ? "Opens a form to enter offer details. The system generates the PDF and attaches it to the email."
                    : "Opens a form to confirm the tentative joining date before sending."}
                </p>
              ) : (
                <p className="comm-blocked-msg">{gate.reason}</p>
              )}

              <button
                type="button"
                className="btn-secondary btn-sm"
                disabled={submitting || !gate.allowed}
                onClick={() => openModal(type as "OFFER_LETTER" | "JOINING_INSTRUCTIONS")}
              >
                {busy ? "Sending…" : status?.sent ? "Resend" : isOffer ? "Send offer letter" : "Send joining instructions"}
              </button>
            </div>
          );
        })}
      </div>

      <Modal
        open={modalType === "OFFER_LETTER"}
        onClose={closeModal}
        title="Send offer letter"
        description={`Generate the offer PDF and email it to ${candidateName} at ${email}.`}
        size="md"
        footer={
          <div className="modal-actions">
            <button type="button" className="btn-secondary" onClick={closeModal} disabled={offerBusy}>
              Cancel
            </button>
            <button
              type="button"
              disabled={offerBusy || !isOfferFormValid(offerForm)}
              onClick={() => void handleSend("OFFER_LETTER", { offerDetails: offerForm })}
            >
              {offerBusy ? "Sending…" : "Generate PDF & send"}
            </button>
          </div>
        }
      >
        <div className="stack comm-modal-fields">
          <Field label="Candidate Name">
            <input
              value={offerForm.candidateName}
              onChange={(e) => setOfferForm((p) => ({ ...p, candidateName: e.target.value }))}
            />
          </Field>
          <Field label="Designation">
            <input
              value={offerForm.designation}
              onChange={(e) => setOfferForm((p) => ({ ...p, designation: e.target.value }))}
            />
          </Field>
          <Field label="Department">
            <input
              value={offerForm.department}
              onChange={(e) => setOfferForm((p) => ({ ...p, department: e.target.value }))}
            />
          </Field>
          <Field label="CTC">
            <input
              value={offerForm.ctc}
              onChange={(e) => setOfferForm((p) => ({ ...p, ctc: e.target.value }))}
              placeholder="e.g. ₹4,50,000 per annum"
            />
          </Field>
          <Field label="Joining Date">
            <input
              type="date"
              value={offerForm.joiningDate}
              onChange={(e) => setOfferForm((p) => ({ ...p, joiningDate: e.target.value }))}
            />
          </Field>
          <Field label="Reporting Manager">
            <input
              value={offerForm.reportingManager}
              onChange={(e) => setOfferForm((p) => ({ ...p, reportingManager: e.target.value }))}
            />
          </Field>
          <Field label="Offer Date">
            <input
              type="date"
              value={offerForm.offerDate}
              onChange={(e) => setOfferForm((p) => ({ ...p, offerDate: e.target.value }))}
            />
          </Field>
        </div>
      </Modal>

      <Modal
        open={modalType === "JOINING_INSTRUCTIONS"}
        onClose={closeModal}
        title="Send joining instructions"
        description={`Email joining instructions to ${candidateName} at ${email}.`}
        size="sm"
        footer={
          <div className="modal-actions">
            <button type="button" className="btn-secondary" onClick={closeModal} disabled={joiningBusy}>
              Cancel
            </button>
            <button
              type="button"
              disabled={joiningBusy || !joiningDate}
              onClick={() => void handleSend("JOINING_INSTRUCTIONS", { joiningDate })}
            >
              {joiningBusy ? "Sending…" : "Send email"}
            </button>
          </div>
        }
      >
        <div className="stack comm-modal-fields">
          <Field label="Tentative Joining Date">
            <input type="date" value={joiningDate} onChange={(e) => setJoiningDate(e.target.value)} />
          </Field>
          <p className="muted">
            This date is included in the joining instructions email so the candidate knows when to report.
          </p>
        </div>
      </Modal>
    </div>
  );
}

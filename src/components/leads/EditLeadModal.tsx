"use client";

import { useEffect, useState } from "react";
import { Modal } from "@/components/ui/Modal";
import { Field } from "@/components/ui/Field";
import { useToast } from "@/components/ToastProvider";
import { getFriendlyApiMessage } from "@/lib/client-api";

export function EditLeadModal({
  open,
  onClose,
  leadId,
  initialReferenceName = "",
  initialRemarks = "",
  onSaved,
}: {
  open: boolean;
  onClose: () => void;
  leadId: string;
  initialReferenceName?: string;
  initialRemarks?: string;
  onSaved?: () => void;
}) {
  const toast = useToast();
  const [referenceName, setReferenceName] = useState(initialReferenceName);
  const [remarks, setRemarks] = useState(initialRemarks);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open) {
      setReferenceName(initialReferenceName);
      setRemarks(initialRemarks);
    }
  }, [open, initialReferenceName, initialRemarks]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    const res = await fetch(`/api/leads/${leadId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ referenceName, comments: remarks }),
    });
    const json = await res.json();
    setSaving(false);
    if (res.ok && json.ok) {
      toast.success("Lead details saved.");
      onSaved?.();
      onClose();
    } else {
      toast.error(getFriendlyApiMessage(json, "Unable to save lead."));
    }
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Edit Lead Details"
      description="Update reference and internal remarks."
      size="md"
      footer={
        <div className="modal-actions">
          <button type="button" className="btn-secondary" onClick={onClose} disabled={saving}>
            Cancel
          </button>
          <button type="submit" form="edit-lead-form" disabled={saving}>
            {saving ? "Saving…" : "Save"}
          </button>
        </div>
      }
    >
      <form id="edit-lead-form" className="stack" onSubmit={(e) => void submit(e)}>
        <Field label="Reference">
          <input
            value={referenceName}
            onChange={(e) => setReferenceName(e.target.value)}
            placeholder="Referrer name or reference details"
          />
        </Field>
        <Field label="Remarks">
          <textarea
            rows={5}
            value={remarks}
            onChange={(e) => setRemarks(e.target.value)}
            placeholder="Recruiter notes and context…"
          />
        </Field>
      </form>
    </Modal>
  );
}

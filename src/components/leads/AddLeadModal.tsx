"use client";

import { useState } from "react";
import { Modal } from "@/components/ui/Modal";
import { Field } from "@/components/ui/Field";
import { useToast } from "@/components/ToastProvider";
import { REFERENCE_SOURCES } from "@/lib/constants";
import { getFriendlyApiMessage } from "@/lib/client-api";
import { formatReferenceSource } from "@/lib/leads";

const TABS = [
  { id: "basic", label: "Basic Info" },
  { id: "contact", label: "Contact" },
  { id: "documents", label: "Documents" },
  { id: "notes", label: "Notes" },
] as const;

type TabId = (typeof TABS)[number]["id"];

export function AddLeadModal({
  open,
  onClose,
  onCreated,
}: {
  open: boolean;
  onClose: () => void;
  onCreated: () => void;
}) {
  const toast = useToast();
  const [saving, setSaving] = useState(false);
  const [tab, setTab] = useState<TabId>("basic");
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [referenceSource, setReferenceSource] = useState<string>(REFERENCE_SOURCES[0]);
  const [referenceName, setReferenceName] = useState("");
  const [comments, setComments] = useState("");
  const [resume, setResume] = useState<File | null>(null);

  function reset() {
    setFullName("");
    setEmail("");
    setPhone("");
    setReferenceName("");
    setComments("");
    setResume(null);
    setTab("basic");
  }

  async function createLead(e: React.FormEvent) {
    e.preventDefault();
    const trimmedName = fullName.trim();
    const trimmedEmail = email.trim();
    const trimmedPhone = phone.trim().replace(/\s+/g, "");
    if (trimmedName.length < 2) {
      toast.error("Full name must be at least 2 characters.");
      setTab("basic");
      return;
    }
    if (trimmedPhone.length < 8) {
      toast.error("Phone number must be at least 8 digits.");
      setTab("contact");
      return;
    }
    if (!trimmedEmail.includes("@")) {
      toast.error("Enter a valid email address.");
      setTab("contact");
      return;
    }
    if (!resume || resume.size === 0) {
      toast.error("Please upload a resume.");
      setTab("documents");
      return;
    }
    setSaving(true);
    const formData = new FormData();
    formData.set("fullName", trimmedName);
    formData.set("email", trimmedEmail);
    formData.set("phone", trimmedPhone);
    formData.set("referenceSource", referenceSource || REFERENCE_SOURCES[0]);
    formData.set("referenceName", referenceName.trim());
    formData.set("comments", comments);
    formData.set("resume", resume);

    const res = await fetch("/api/leads", { method: "POST", body: formData });
    const json = await res.json();
    setSaving(false);
    if (res.ok && json.ok) {
      toast.success("Lead created.");
      reset();
      onCreated();
      onClose();
    } else {
      toast.error(getFriendlyApiMessage(json, "Unable to create lead."));
    }
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Add Lead"
      description="Capture a new lead to start the recruitment pipeline. Candidates are created only after registration."
      size="xl"
      footer={
        <div className="modal-actions">
          <button type="button" className="btn-secondary" onClick={onClose} disabled={saving}>
            Cancel
          </button>
          <button type="submit" form="add-lead-form" disabled={saving}>
            {saving ? "Creating…" : "Create Lead"}
          </button>
        </div>
      }
    >
      <div className="modal-tabs">
        {TABS.map((t) => (
          <button
            key={t.id}
            type="button"
            className={tab === t.id ? "active" : ""}
            onClick={() => setTab(t.id)}
          >
            {t.label}
          </button>
        ))}
      </div>
      <form id="add-lead-form" className="stack" onSubmit={(e) => void createLead(e)}>
        {tab === "basic" && (
          <>
            <Field label="Full Name">
              <input value={fullName} onChange={(e) => setFullName(e.target.value)} required />
            </Field>
            <Field label="Source">
              <select value={referenceSource} onChange={(e) => setReferenceSource(e.target.value)} required>
                {REFERENCE_SOURCES.map((s) => (
                  <option key={s} value={s}>
                    {formatReferenceSource(s)}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Reference">
              <input
                value={referenceName}
                onChange={(e) => setReferenceName(e.target.value)}
                placeholder="Referrer name or reference details"
              />
            </Field>
          </>
        )}
        {tab === "contact" && (
          <>
            <Field label="Email">
              <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
            </Field>
            <Field label="Phone">
              <input
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                required
                minLength={8}
                maxLength={20}
                inputMode="tel"
              />
            </Field>
          </>
        )}
        {tab === "documents" && (
          <Field label="Resume">
            <input
              type="file"
              accept=".pdf,.doc,.docx,application/pdf,application/msword"
              onChange={(e) => setResume(e.target.files?.[0] ?? null)}
              required
            />
            {resume ? <p className="field-hint">Selected: {resume.name}</p> : null}
          </Field>
        )}
        {tab === "notes" && (
          <Field label="Remarks">
            <textarea
              value={comments}
              onChange={(e) => setComments(e.target.value)}
              rows={5}
              placeholder="Recruiter notes, referral context, interview preferences…"
            />
          </Field>
        )}
      </form>
    </Modal>
  );
}

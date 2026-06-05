"use client";

import { useState } from "react";
import { Modal } from "@/components/ui/Modal";
import { Field } from "@/components/ui/Field";
import { useToast } from "@/components/ToastProvider";
import { getFriendlyApiMessage, parseApiResponse } from "@/lib/client-api";

export function CreateBatchModal({
  open,
  onClose,
  onCreated,
}: {
  open: boolean;
  onClose: () => void;
  onCreated: (batchId?: string) => void;
}) {
  const toast = useToast();
  const [form, setForm] = useState({
    name: "",
    trainerName: "",
    startDate: "",
    endDate: "",
    status: "PLANNED",
    capacity: "30",
  });

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const res = await fetch("/api/batches", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ ...form, capacity: Number(form.capacity) }),
    });
    const json = await parseApiResponse(res);
    if (res.ok && json.ok) {
      toast.success("Batch created.");
      setForm({ name: "", trainerName: "", startDate: "", endDate: "", status: "PLANNED", capacity: "30" });
      onCreated((json.data as { id?: string } | undefined)?.id);
      onClose();
    } else {
      toast.error(getFriendlyApiMessage(json, "Unable to create batch."));
    }
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Create Batch"
      description="Set up a new training batch for candidate assignment."
      footer={
        <div className="modal-actions">
          <button type="button" className="btn-secondary" onClick={onClose}>
            Cancel
          </button>
          <button type="submit" form="create-batch-form">
            Create Batch
          </button>
        </div>
      }
    >
      <form id="create-batch-form" className="stack" onSubmit={(e) => void submit(e)}>
        <Field label="Batch name">
          <input
            value={form.name}
            onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
            placeholder="Sales Batch June 2026"
            required
          />
        </Field>
        <Field label="Trainer">
          <input
            value={form.trainerName}
            onChange={(e) => setForm((p) => ({ ...p, trainerName: e.target.value }))}
            required
          />
        </Field>
        <div className="grid grid-2">
          <Field label="Start date">
            <input
              type="date"
              value={form.startDate}
              onChange={(e) => setForm((p) => ({ ...p, startDate: e.target.value }))}
              required
            />
          </Field>
          <Field label="End date">
            <input
              type="date"
              value={form.endDate}
              onChange={(e) => setForm((p) => ({ ...p, endDate: e.target.value }))}
              required
            />
          </Field>
        </div>
        <Field label="Capacity">
          <input
            type="number"
            min={1}
            value={form.capacity}
            onChange={(e) => setForm((p) => ({ ...p, capacity: e.target.value }))}
            required
          />
        </Field>
      </form>
    </Modal>
  );
}

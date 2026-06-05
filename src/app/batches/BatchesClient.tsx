"use client";

import Link from "next/link";
import { FormEvent, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { BatchAssignmentClient } from "@/app/batches/BatchAssignmentClient";
import { useToast } from "@/components/ToastProvider";
import { Badge } from "@/components/ui/Badge";
import { EmptyState } from "@/components/ui/EmptyState";
import { Field } from "@/components/ui/Field";
import { PageSection } from "@/components/ui/PageSection";
import { WorkflowQueueClient } from "@/components/workflow/WorkflowQueueClient";
import { formatStatusLabel, statusToVariant } from "@/lib/status-ui";
import { getFriendlyApiMessage, parseApiResponse } from "@/lib/client-api";
import { getStageMeta } from "@/lib/workflow";

type BatchStats = {
  total: number;
  evaluated: number;
  selected: number;
  hold: number;
  rejected: number;
};

type Batch = {
  id: string;
  name: string;
  trainerName: string;
  startDate: string;
  endDate: string;
  status: string;
  capacity: number;
  assignedCount: number;
  remainingSeats: number;
  stats: BatchStats;
};

const TABS = [
  { key: "assignment", label: "Batch Assignment" },
  { key: "training", label: "In Training" },
  { key: "batches", label: "All Batches" },
] as const;

export function BatchesClient() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const toast = useToast();
  const initialTab = TABS.some((t) => t.key === searchParams.get("tab"))
    ? (searchParams.get("tab") as (typeof TABS)[number]["key"])
    : "assignment";
  const [tab, setTab] = useState<(typeof TABS)[number]["key"]>(initialTab);
  const [batches, setBatches] = useState<Batch[]>([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState({
    name: "",
    trainerName: "",
    startDate: "",
    endDate: "",
    status: "PLANNED",
    capacity: "30",
  });

  const trainingStage = getStageMeta("training");

  function switchTab(next: (typeof TABS)[number]["key"]) {
    setTab(next);
    router.replace(`/batches?tab=${next}`, { scroll: false });
  }

  async function loadBatches() {
    setLoading(true);
    const res = await fetch("/api/batches", { cache: "no-store" });
    const json = await res.json();
    setBatches(json.data?.items ?? []);
    setLoading(false);
  }

  useEffect(() => {
    if (tab === "batches") void loadBatches();
  }, [tab]);

  async function createBatch(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const res = await fetch("/api/batches", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        ...form,
        capacity: Number(form.capacity),
      }),
    });
    const json = await parseApiResponse(res);
    if (res.ok && json.ok) {
      const newId = (json.data as { id?: string } | undefined)?.id;
      setForm({
        name: "",
        trainerName: "",
        startDate: "",
        endDate: "",
        status: "PLANNED",
        capacity: "30",
      });
      toast.success("Batch created.");
      if (newId) {
        router.push(`/batches/${newId}`);
      } else {
        await loadBatches();
      }
    } else {
      toast.error(getFriendlyApiMessage(json, "Unable to create batch."));
    }
  }

  if (tab === "assignment") {
    return (
      <div className="stack-lg">
        <div className="tab-bar">
          {TABS.map((t) => (
            <button
              key={t.key}
              type="button"
              className={tab === t.key ? "active" : ""}
              onClick={() => switchTab(t.key)}
            >
              {t.label}
            </button>
          ))}
        </div>
        <BatchAssignmentClient />
      </div>
    );
  }

  if (tab === "training") {
    return (
      <div className="stack-lg">
        <div className="tab-bar">
          {TABS.map((t) => (
            <button
              key={t.key}
              type="button"
              className={tab === t.key ? "active" : ""}
              onClick={() => switchTab(t.key)}
            >
              {t.label}
            </button>
          ))}
        </div>
        <WorkflowQueueClient
          stage="training"
          title="Candidates in training"
          description={trainingStage.description}
          actionHint={trainingStage.actionHint}
        />
      </div>
    );
  }

  return (
    <div className="stack-lg">
      <div className="tab-bar">
        {TABS.map((t) => (
          <button
            key={t.key}
            type="button"
            className={tab === t.key ? "tab-active" : ""}
            onClick={() => switchTab(t.key)}
          >
            {t.label}
          </button>
        ))}
      </div>

      <PageSection
        title="Create training batch"
        description="Set capacity to control how many candidates can be assigned. Open a batch to manage members and history."
      >
        <form className="grid grid-3" onSubmit={createBatch}>
          <Field label="Batch name">
            <input
              value={form.name}
              onChange={(e) => setForm((s) => ({ ...s, name: e.target.value }))}
              placeholder="e.g. Sales Batch — June 2026"
              required
            />
          </Field>
          <Field label="Trainer">
            <input
              value={form.trainerName}
              onChange={(e) => setForm((s) => ({ ...s, trainerName: e.target.value }))}
              placeholder="Trainer name"
              required
            />
          </Field>
          <Field label="Capacity (seats)">
            <input
              type="number"
              min={1}
              max={200}
              value={form.capacity}
              onChange={(e) => setForm((s) => ({ ...s, capacity: e.target.value }))}
              required
            />
          </Field>
          <Field label="Status">
            <select value={form.status} onChange={(e) => setForm((s) => ({ ...s, status: e.target.value }))}>
              <option value="PLANNED">Planned</option>
              <option value="ACTIVE">Active</option>
              <option value="COMPLETED">Completed</option>
            </select>
          </Field>
          <Field label="Start date">
            <input
              type="date"
              value={form.startDate}
              onChange={(e) => setForm((s) => ({ ...s, startDate: e.target.value }))}
              required
            />
          </Field>
          <Field label="End date">
            <input
              type="date"
              value={form.endDate}
              onChange={(e) => setForm((s) => ({ ...s, endDate: e.target.value }))}
              required
            />
          </Field>
          <div className="form-actions-end">
            <button type="submit">Create batch</button>
          </div>
        </form>
      </PageSection>

      <PageSection title="All batches" description="Click a batch to manage assigned candidates, transfers, and history.">
        {loading ? (
          <div className="loading-line" />
        ) : batches.length === 0 ? (
          <EmptyState title="No batches yet" description="Create your first batch above." />
        ) : (
          <div className="batch-grid">
            {batches.map((batch) => (
              <Link key={batch.id} href={`/batches/${batch.id}`} className="batch-card">
                <div className="batch-card-top">
                  <h3>{batch.name}</h3>
                  <Badge variant={statusToVariant(batch.status)}>{formatStatusLabel(batch.status)}</Badge>
                </div>
                <p className="muted batch-card-trainer">Trainer: {batch.trainerName}</p>
                <p className="muted batch-card-dates">
                  {new Date(batch.startDate).toLocaleDateString()} — {new Date(batch.endDate).toLocaleDateString()}
                </p>
                <div className="batch-seat-summary">
                  <span>
                    Assigned: <strong>{batch.assignedCount}</strong> / {batch.capacity}
                  </span>
                  <span>
                    Remaining: <strong>{batch.remainingSeats}</strong>
                  </span>
                </div>
                <div className="batch-card-stats">
                  <span>
                    <strong>{batch.stats.total}</strong> in batch
                  </span>
                  <span>
                    <strong>{batch.stats.evaluated}</strong> evaluated
                  </span>
                  <span>
                    <strong>{batch.stats.selected}</strong> selected
                  </span>
                </div>
                <span className="batch-card-cta">Open batch →</span>
              </Link>
            ))}
          </div>
        )}
      </PageSection>
    </div>
  );
}

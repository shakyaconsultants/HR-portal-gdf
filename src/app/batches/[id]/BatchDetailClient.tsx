"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { AssignToBatchModal, postBulkAssign } from "@/components/batches/AssignToBatchModal";
import { BatchHistoryPanel } from "@/components/batches/BatchHistoryPanel";
import { BulkTransferModal, postBulkTransfer } from "@/components/batches/BulkTransferModal";
import { useToast } from "@/components/ToastProvider";
import { Badge } from "@/components/ui/Badge";
import { EmptyState } from "@/components/ui/EmptyState";
import { PageSection } from "@/components/ui/PageSection";
import { formatStatusLabel, statusToVariant } from "@/lib/status-ui";
import { getFriendlyApiMessage, parseApiResponse } from "@/lib/client-api";

type BatchStats = {
  total: number;
  evaluated: number;
  selected: number;
  hold: number;
  rejected: number;
};

type CandidateRow = {
  id: string;
  registrationId?: string | null;
  fullName: string;
  email: string;
  phone: string;
  status: string;
  trainingStatus: string;
  evaluationStatus: string;
  finalScore: number | null;
  decision: string | null;
};

type BatchOption = {
  id: string;
  name: string;
  capacity: number;
  assignedCount: number;
  remainingSeats: number;
};

type BatchDetail = {
  batch: BatchOption & {
    trainerName: string;
    startDate: string;
    endDate: string;
    status: string;
  };
  stats: BatchStats;
  candidates: CandidateRow[];
  otherBatches: BatchOption[];
  eligibleForAssign: Array<{ id: string; registrationId?: string | null; fullName: string; email: string }>;
};

export function BatchDetailClient({ batchId }: { batchId: string }) {
  const toast = useToast();
  const [data, setData] = useState<BatchDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [assignIds, setAssignIds] = useState<Set<string>>(new Set());
  const [transferIds, setTransferIds] = useState<Set<string>>(new Set());
  const [acting, setActing] = useState<string | null>(null);
  const [assignModalOpen, setAssignModalOpen] = useState(false);
  const [transferModalOpen, setTransferModalOpen] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    const res = await fetch(`/api/batches/${batchId}`, { cache: "no-store" });
    const json = await res.json();
    if (res.ok && json.ok) {
      setData(json.data as BatchDetail);
      setAssignIds(new Set());
      setTransferIds(new Set());
    } else {
      toast.error("Unable to load batch.");
    }
    setLoading(false);
  }, [batchId, toast]);

  useEffect(() => {
    void load();
  }, [load]);

  async function handleAssignToThisBatch() {
    if (!assignIds.size) {
      toast.error("Select candidates to assign.");
      return;
    }
    setAssignModalOpen(true);
  }

  async function confirmAssign(batchIdConfirm: string) {
    const result = await postBulkAssign(Array.from(assignIds), batchIdConfirm);
    if (result.ok) {
      toast.success(result.message ?? "Candidates assigned.");
      setAssignModalOpen(false);
      await load();
      return { ok: true };
    }
    return { ok: false, message: result.message };
  }

  async function confirmBulkTransfer(toBatchId: string, reason: string) {
    const result = await postBulkTransfer(Array.from(transferIds), batchId, toBatchId, reason);
    if (result.ok) {
      toast.success(result.message ?? "Candidates transferred.");
      setTransferModalOpen(false);
      await load();
      return { ok: true };
    }
    return { ok: false, message: result.message };
  }

  async function removeCandidate(candidateId: string) {
    if (!confirm("Remove this candidate from the batch? They will return to the verified pool.")) return;
    setActing(candidateId);
    const res = await fetch("/api/batches/remove", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ candidateId, batchId }),
    });
    const json = await parseApiResponse(res);
    if (res.ok && json.ok) {
      toast.success("Candidate removed from batch.");
      await load();
    } else {
      toast.error(getFriendlyApiMessage(json, "Remove failed."));
    }
    setActing(null);
  }

  if (loading || !data) {
    return (
      <div className="stack skeleton-stack">
        <div className="loading-line" />
        <div className="loading-line" />
      </div>
    );
  }

  const { batch, stats, candidates, otherBatches, eligibleForAssign } = data;
  const remainingSeats = batch.remainingSeats;

  const allEligible = eligibleForAssign.map((c) => c.id);
  const allAssignSelected = allEligible.length > 0 && allEligible.every((id) => assignIds.has(id));

  const memberIds = candidates.map((c) => c.id);
  const allTransferSelected = memberIds.length > 0 && memberIds.every((id) => transferIds.has(id));

  function toggleAssign(id: string) {
    setAssignIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else if (next.size < remainingSeats) next.add(id);
      return next;
    });
  }

  function toggleTransfer(id: string) {
    setTransferIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  const batchOptions: BatchOption[] = [
    {
      id: batch.id,
      name: batch.name,
      capacity: batch.capacity,
      assignedCount: batch.assignedCount,
      remainingSeats: batch.remainingSeats,
    },
    ...otherBatches,
  ];

  return (
    <div className="stack-lg">
      <div className="batch-detail-header">
        <div>
          <Link href="/batches?tab=batches" className="back-link">
            ← All batches
          </Link>
          <h2 className="profile-name">{batch.name}</h2>
          <p className="muted">
            Trainer: <strong>{batch.trainerName}</strong>
          </p>
        </div>
        <Badge variant={statusToVariant(batch.status)}>{formatStatusLabel(batch.status)}</Badge>
      </div>

      <div className="batch-info-grid">
        <div className="batch-info-card">
          <span className="batch-info-label">Start date</span>
          <span>{new Date(batch.startDate).toLocaleDateString()}</span>
        </div>
        <div className="batch-info-card">
          <span className="batch-info-label">End date</span>
          <span>{new Date(batch.endDate).toLocaleDateString()}</span>
        </div>
        <div className="batch-info-card accent-emerald">
          <span className="batch-info-label">Assigned count</span>
          <span>
            <strong>{batch.assignedCount}</strong> / {batch.capacity}
          </span>
        </div>
        <div className="batch-info-card accent-amber">
          <span className="batch-info-label">Remaining seats</span>
          <span>
            <strong>{batch.remainingSeats}</strong>
          </span>
        </div>
      </div>

      <div className="batch-stats-row">
        <div className="batch-stat-tile">
          <span className="batch-stat-label">Total candidates</span>
          <span className="batch-stat-value">{stats.total}</span>
        </div>
        <div className="batch-stat-tile accent-amber">
          <span className="batch-stat-label">Evaluated</span>
          <span className="batch-stat-value">{stats.evaluated}</span>
        </div>
        <div className="batch-stat-tile accent-emerald">
          <span className="batch-stat-label">Selected</span>
          <span className="batch-stat-value">{stats.selected}</span>
        </div>
        <div className="batch-stat-tile accent-sky">
          <span className="batch-stat-label">Hold</span>
          <span className="batch-stat-value">{stats.hold}</span>
        </div>
        <div className="batch-stat-tile accent-rose">
          <span className="batch-stat-label">Rejected</span>
          <span className="batch-stat-value">{stats.rejected}</span>
        </div>
      </div>

      <PageSection
        title="Assign candidates"
        description="Verification-approved candidates. Select up to remaining seat count and assign to this batch."
        actions={
          assignIds.size > 0 ? (
            <button type="button" disabled={acting === "assign"} onClick={() => void handleAssignToThisBatch()}>
              Assign to batch ({assignIds.size})
            </button>
          ) : null
        }
      >
        {remainingSeats === 0 ? (
          <p className="muted">This batch is full. Transfer or remove candidates to free seats.</p>
        ) : eligibleForAssign.length === 0 ? (
          <p className="muted">No verification-approved candidates waiting for batch assignment.</p>
        ) : (
          <div className="data-table-wrap">
            <table className="data-table">
              <thead>
                <tr>
                  <th className="col-check">
                    <input
                      type="checkbox"
                      checked={allAssignSelected}
                      onChange={() =>
                        setAssignIds(
                          allAssignSelected
                            ? new Set()
                            : new Set(allEligible.slice(0, remainingSeats))
                        )
                      }
                      aria-label="Select all eligible"
                    />
                  </th>
                  <th>Reg. ID</th>
                  <th>Candidate</th>
                  <th>Email</th>
                </tr>
              </thead>
              <tbody>
                {eligibleForAssign.map((c) => {
                  const checked = assignIds.has(c.id);
                  const disabled = !checked && assignIds.size >= remainingSeats;
                  return (
                    <tr key={c.id}>
                      <td className="col-check">
                        <input
                          type="checkbox"
                          checked={checked}
                          disabled={disabled}
                          onChange={() => toggleAssign(c.id)}
                        />
                      </td>
                      <td>{c.registrationId ?? "—"}</td>
                      <td>{c.fullName}</td>
                      <td className="cell-muted">{c.email}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </PageSection>

      <PageSection
        title="Assigned candidates"
        description="Trainees in this batch — bulk transfer or remove individually."
        actions={
          transferIds.size > 0 ? (
            <button type="button" onClick={() => setTransferModalOpen(true)}>
              Transfer selected ({transferIds.size})
            </button>
          ) : (
            <button type="button" onClick={() => void load()}>
              Refresh
            </button>
          )
        }
      >
        {candidates.length === 0 ? (
          <EmptyState
            title="No candidates in this batch"
            description="Assign verification-approved candidates from the section above."
          />
        ) : (
          <div className="data-table-wrap">
            <table className="data-table">
              <thead>
                <tr>
                  <th className="col-check">
                    <input
                      type="checkbox"
                      checked={allTransferSelected}
                      onChange={() =>
                        setTransferIds(allTransferSelected ? new Set() : new Set(memberIds))
                      }
                      aria-label="Select all members"
                    />
                  </th>
                  <th>Reg. ID</th>
                  <th>Candidate</th>
                  <th>Status</th>
                  <th>Score</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {candidates.map((c) => (
                  <tr key={c.id}>
                    <td className="col-check">
                      <input
                        type="checkbox"
                        checked={transferIds.has(c.id)}
                        onChange={() => toggleTransfer(c.id)}
                      />
                    </td>
                    <td>{c.registrationId ?? "—"}</td>
                    <td>
                      <div className="cell-name">{c.fullName}</div>
                      <div className="cell-muted">{c.email}</div>
                    </td>
                    <td>
                      <Badge variant={statusToVariant(c.status)}>{formatStatusLabel(c.status)}</Badge>
                    </td>
                    <td>{c.finalScore ?? "—"}</td>
                    <td>
                      <div className="row-actions">
                        <Link href={`/candidates/${c.id}`} className="profile-link">
                          Profile →
                        </Link>
                        <button
                          type="button"
                          className="btn-secondary btn-sm"
                          disabled={acting === c.id}
                          onClick={() => void removeCandidate(c.id)}
                        >
                          Remove
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </PageSection>

      <BatchHistoryPanel batchId={batchId} />

      <AssignToBatchModal
        open={assignModalOpen}
        selectedCount={assignIds.size}
        batches={batchOptions.filter((b) => b.id === batchId)}
        onClose={() => setAssignModalOpen(false)}
        onConfirm={confirmAssign}
      />

      <BulkTransferModal
        open={transferModalOpen}
        selectedCount={transferIds.size}
        fromBatchId={batchId}
        batches={batchOptions}
        onClose={() => setTransferModalOpen(false)}
        onConfirm={confirmBulkTransfer}
      />
    </div>
  );
}

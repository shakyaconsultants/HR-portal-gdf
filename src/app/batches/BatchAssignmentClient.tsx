"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { AssignToBatchModal, postBulkAssign } from "@/components/batches/AssignToBatchModal";
import { useToast } from "@/components/ToastProvider";
import { EmptyState } from "@/components/ui/EmptyState";
import { Field } from "@/components/ui/Field";
import { PageSection } from "@/components/ui/PageSection";
import { Badge } from "@/components/ui/Badge";
import { formatStatusLabel, statusToVariant } from "@/lib/status-ui";

type EligibleCandidate = {
  id: string;
  registrationId?: string | null;
  fullName: string;
  email: string;
  phone: string;
  verificationStage: string;
};

type BatchOption = {
  id: string;
  name: string;
  capacity: number;
  assignedCount: number;
  remainingSeats: number;
  status: string;
};

export function BatchAssignmentClient() {
  const toast = useToast();
  const [candidates, setCandidates] = useState<EligibleCandidate[]>([]);
  const [batches, setBatches] = useState<BatchOption[]>([]);
  const [total, setTotal] = useState(0);
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    const query = search.trim() ? `?search=${encodeURIComponent(search.trim())}` : "";
    const [eligibleRes, batchesRes] = await Promise.all([
      fetch(`/api/batches/eligible${query}`, { cache: "no-store" }),
      fetch("/api/batches", { cache: "no-store" }),
    ]);
    const eligibleJson = await eligibleRes.json();
    const batchesJson = await batchesRes.json();
    if (eligibleRes.ok && eligibleJson.ok) {
      setCandidates(eligibleJson.data?.items ?? []);
      setTotal(eligibleJson.data?.total ?? 0);
    }
    if (batchesRes.ok && batchesJson.ok) {
      setBatches(
        (batchesJson.data?.items ?? []).map(
          (b: BatchOption & { trainerName?: string }) => ({
            id: b.id,
            name: b.name,
            capacity: b.capacity,
            assignedCount: b.assignedCount,
            remainingSeats: b.remainingSeats,
            status: b.status,
          })
        )
      );
    }
    setLoading(false);
  }, [search]);

  useEffect(() => {
    void load();
  }, [load]);

  const allIds = candidates.map((c) => c.id);
  const allSelected = allIds.length > 0 && allIds.every((id) => selected.has(id));

  function toggleAll() {
    setSelected(allSelected ? new Set() : new Set(allIds));
  }

  function toggleOne(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  async function handleAssign(batchId: string) {
    const ids = Array.from(selected);
    const result = await postBulkAssign(ids, batchId);
    if (result.ok) {
      toast.success(result.message ?? "Candidates assigned.");
      setSelected(new Set());
      setModalOpen(false);
      await load();
      return { ok: true };
    }
    return { ok: false, message: result.message };
  }

  return (
    <div className="stack-lg">
      <PageSection
        title="Batch assignment"
        description="Verification-approved candidates ready for training. Select in bulk, choose a batch, and assign together."
        actions={
          selected.size > 0 ? (
            <button type="button" onClick={() => setModalOpen(true)}>
              Assign to batch ({selected.size})
            </button>
          ) : null
        }
      >
        <div className="toolbar toolbar-spaced">
          <Field label="Search candidates">
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Name, email, phone, reg ID"
            />
          </Field>
          <button type="button" onClick={() => void load()}>
            Refresh
          </button>
        </div>

        <p className="muted">
          <strong>{total}</strong> verification-approved candidate{total === 1 ? "" : "s"} awaiting batch
          assignment.
        </p>

        {loading ? (
          <div className="loading-line" />
        ) : candidates.length === 0 ? (
          <EmptyState
            title="No candidates ready"
            description="Candidates appear here after final verification approval."
          />
        ) : (
          <div className="data-table-wrap">
            <table className="data-table">
              <thead>
                <tr>
                  <th className="col-check">
                    <input
                      type="checkbox"
                      checked={allSelected}
                      onChange={toggleAll}
                      aria-label="Select all"
                    />
                  </th>
                  <th>Reg. ID</th>
                  <th>Candidate</th>
                  <th>Email</th>
                  <th>Phone</th>
                  <th>Verification</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {candidates.map((c) => (
                  <tr key={c.id}>
                    <td className="col-check">
                      <input
                        type="checkbox"
                        checked={selected.has(c.id)}
                        onChange={() => toggleOne(c.id)}
                        aria-label={`Select ${c.fullName}`}
                      />
                    </td>
                    <td>{c.registrationId ?? "—"}</td>
                    <td className="cell-name">{c.fullName}</td>
                    <td className="cell-muted">{c.email}</td>
                    <td className="cell-muted">{c.phone}</td>
                    <td>
                      <Badge variant={statusToVariant(c.verificationStage)}>
                        {formatStatusLabel(c.verificationStage)}
                      </Badge>
                    </td>
                    <td>
                      <Link href={`/candidates/${c.id}`} className="profile-link">
                        Profile →
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </PageSection>

      <PageSection title="Available batches" description="Seat availability across all training batches.">
        {batches.length === 0 ? (
          <p className="muted">Create a batch first to assign candidates.</p>
        ) : (
          <div className="batch-grid batch-grid-compact">
            {batches.map((b) => (
              <Link key={b.id} href={`/batches/${b.id}`} className="batch-card batch-card-compact">
                <div className="batch-card-top">
                  <h3>{b.name}</h3>
                  <Badge variant={statusToVariant(b.status)}>{formatStatusLabel(b.status)}</Badge>
                </div>
                <div className="batch-seat-summary">
                  <span>
                    Assigned: <strong>{b.assignedCount}</strong> / {b.capacity}
                  </span>
                  <span>
                    Remaining: <strong>{b.remainingSeats}</strong>
                  </span>
                </div>
              </Link>
            ))}
          </div>
        )}
      </PageSection>

      <AssignToBatchModal
        open={modalOpen}
        selectedCount={selected.size}
        batches={batches}
        onClose={() => setModalOpen(false)}
        onConfirm={handleAssign}
      />
    </div>
  );
}

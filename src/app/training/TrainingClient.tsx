"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { CreateBatchModal } from "@/components/batches/CreateBatchModal";
import { Badge } from "@/components/ui/Badge";
import { EmptyState } from "@/components/ui/EmptyState";
import { formatStatusLabel, statusToVariant } from "@/lib/status-ui";

type Batch = {
  id: string;
  name: string;
  trainerName: string;
  startDate: string;
  endDate: string;
  status: string;
  assignedCount: number;
  capacity: number;
};

export function TrainingClient() {
  const searchParams = useSearchParams();
  const [batches, setBatches] = useState<Batch[]>([]);
  const [loading, setLoading] = useState(true);
  const [createOpen, setCreateOpen] = useState(searchParams.get("create") === "1");

  async function load() {
    setLoading(true);
    const res = await fetch("/api/batches", { cache: "no-store" });
    const json = await res.json();
    setBatches(json.data?.items ?? []);
    setLoading(false);
  }

  useEffect(() => {
    void load();
  }, []);

  useEffect(() => {
    if (searchParams.get("create") === "1") setCreateOpen(true);
  }, [searchParams]);

  return (
    <div className="training-hub">
      <div className="section-head">
        <h2 className="section-title">Batch Overview</h2>
        <button type="button" className="btn-sm" onClick={() => setCreateOpen(true)}>
          + Create Batch
        </button>
      </div>

      {loading ? (
        <div className="loading-line" />
      ) : batches.length === 0 ? (
        <div className="glass-card">
          <EmptyState
            icon="batches"
            title="No batches yet"
            description="Create your first training batch to assign candidates."
            action={
              <button type="button" onClick={() => setCreateOpen(true)}>
                + Create Batch
              </button>
            }
          />
        </div>
      ) : (
        <div className="glass-card">
          <div className="data-table-wrap">
            <table className="data-table data-table-compact">
              <thead>
                <tr>
                  <th>Batch</th>
                  <th>Trainer</th>
                  <th>Candidates</th>
                  <th>Status</th>
                  <th>Start</th>
                  <th>End</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {batches.map((b) => (
                  <tr key={b.id}>
                    <td className="cell-name">{b.name}</td>
                    <td>{b.trainerName}</td>
                    <td>
                      {b.assignedCount}/{b.capacity}
                    </td>
                    <td>
                      <Badge variant={statusToVariant(b.status)}>{formatStatusLabel(b.status)}</Badge>
                    </td>
                    <td>{new Date(b.startDate).toLocaleDateString()}</td>
                    <td>{new Date(b.endDate).toLocaleDateString()}</td>
                    <td className="cell-actions">
                      <Link href={`/batches/${b.id}`} className="btn-ghost btn-sm">
                        View
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <CreateBatchModal
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        onCreated={(id) => {
          void load();
          if (id) window.location.href = `/batches/${id}`;
        }}
      />
    </div>
  );
}

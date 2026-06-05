"use client";

import { useCallback, useEffect, useState } from "react";
import { Badge } from "@/components/ui/Badge";
import { EmptyState } from "@/components/ui/EmptyState";
import { PageSection } from "@/components/ui/PageSection";
import { formatStatusLabel } from "@/lib/status-ui";

type HistoryItem = {
  id: string;
  action: string;
  candidateName: string;
  fromBatchName: string | null;
  toBatchName: string | null;
  reason: string;
  performedByName: string;
  createdAt: string;
};

const ACTION_VARIANT: Record<string, "success" | "warning" | "info" | "neutral"> = {
  ASSIGNED: "success",
  TRANSFERRED: "info",
  REMOVED: "warning",
};

function describeEvent(item: HistoryItem) {
  if (item.action === "ASSIGNED") {
    return `Assigned to ${item.toBatchName ?? "batch"}`;
  }
  if (item.action === "TRANSFERRED") {
    return `${item.fromBatchName ?? "—"} → ${item.toBatchName ?? "—"}`;
  }
  if (item.action === "REMOVED") {
    return `Removed from ${item.fromBatchName ?? "batch"}`;
  }
  return item.action;
}

export function BatchHistoryPanel({ batchId }: { batchId: string }) {
  const [items, setItems] = useState<HistoryItem[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    const res = await fetch(`/api/batches/${batchId}/history`, { cache: "no-store" });
    const json = await res.json();
    if (res.ok && json.ok) {
      setItems(json.data?.items ?? []);
    }
    setLoading(false);
  }, [batchId]);

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <PageSection
      title="Batch history"
      description="Assignments, transfers, and removals for this batch."
      actions={
        <button type="button" onClick={() => void load()}>
          Refresh
        </button>
      }
    >
      {loading ? (
        <div className="loading-line" />
      ) : items.length === 0 ? (
        <EmptyState title="No history yet" description="Batch activity will appear here." />
      ) : (
        <div className="data-table-wrap">
          <table className="data-table">
            <thead>
              <tr>
                <th>When</th>
                <th>Action</th>
                <th>Candidate</th>
                <th>Details</th>
                <th>By</th>
              </tr>
            </thead>
            <tbody>
              {items.map((item) => (
                <tr key={item.id}>
                  <td className="cell-muted">{new Date(item.createdAt).toLocaleString()}</td>
                  <td>
                    <Badge variant={ACTION_VARIANT[item.action] ?? "neutral"}>
                      {formatStatusLabel(item.action)}
                    </Badge>
                  </td>
                  <td>{item.candidateName}</td>
                  <td>
                    <div>{describeEvent(item)}</div>
                    {item.reason ? <div className="cell-muted">{item.reason}</div> : null}
                  </td>
                  <td className="cell-muted">{item.performedByName}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </PageSection>
  );
}

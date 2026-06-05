"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Badge } from "@/components/ui/Badge";
import { EmptyState } from "@/components/ui/EmptyState";
import { PIPELINE_COLUMNS, pipelineColumnForStage } from "@/lib/pipeline-ui";
import { formatStatusLabel, statusToVariant } from "@/lib/status-ui";

type CandidateRow = {
  id: string;
  registrationId?: string | null;
  fullName: string;
  email: string;
  phone: string;
  lifecycleStage: string;
  finalScore: number | null;
  batch: { name: string; trainerName: string } | null;
  decision: string | null;
};

function initials(name: string) {
  return name
    .split(" ")
    .map((p) => p[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

export function CandidatesManagementClient() {
  const searchParams = useSearchParams();
  const [pipeline, setPipeline] = useState(searchParams.get("pipeline") ?? "all");
  const [search, setSearch] = useState(searchParams.get("search") ?? "");
  const [items, setItems] = useState<CandidateRow[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    const query = new URLSearchParams({ page: "1", pageSize: "300" });
    if (search.trim()) query.set("search", search.trim());
    const res = await fetch(`/api/candidates?${query}`, { cache: "no-store" });
    const json = await res.json();
    if (res.ok && json.ok) {
      setItems(
        (json.data?.items ?? []).map((c: Record<string, unknown>) => ({
          id: String(c.id),
          registrationId: c.registrationId as string | null,
          fullName: String(c.fullName),
          email: String(c.email),
          phone: String(c.phone),
          lifecycleStage: String(c.lifecycleStage),
          finalScore: c.finalScore as number | null,
          batch: c.batch as CandidateRow["batch"],
          decision: c.decision as string | null,
        }))
      );
    }
    setLoading(false);
  }, [search]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    const p = searchParams.get("pipeline");
    if (p) setPipeline(p);
  }, [searchParams]);

  const columnCounts = useMemo(() => {
    const counts = Object.fromEntries(PIPELINE_COLUMNS.map((c) => [c.id, 0]));
    for (const c of items) {
      const col = pipelineColumnForStage(c.lifecycleStage);
      counts[col.id] = (counts[col.id] ?? 0) + 1;
    }
    return counts;
  }, [items]);

  const filtered = useMemo(() => {
    if (pipeline === "all") return items;
    const col = PIPELINE_COLUMNS.find((c) => c.id === pipeline);
    if (!col) return items;
    return items.filter((c) => col.stages.includes(c.lifecycleStage as never));
  }, [items, pipeline]);

  function exportCsv() {
    const header = ["Name", "Email", "Phone", "Reg ID", "Stage", "Batch", "Score", "Decision"];
    const rows = filtered.map((c) =>
      [
        c.fullName,
        c.email,
        c.phone,
        c.registrationId ?? "",
        c.lifecycleStage,
        c.batch?.name ?? "",
        c.finalScore ?? "",
        c.decision ?? "",
      ].join(",")
    );
    const blob = new Blob([[header.join(","), ...rows].join("\n")], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "candidates-export.csv";
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="data-hub">
      <div className="hub-panel">
        <div className="hub-toolbar">
          <div className="hub-search">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" aria-hidden>
              <circle cx="11" cy="11" r="7" />
              <path d="M20 20l-3-3" />
            </svg>
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by name, email, phone, or registration ID…"
              aria-label="Search candidates"
              onKeyDown={(e) => e.key === "Enter" && void load()}
            />
          </div>
          <div className="hub-actions">
            <button type="button" className="btn-secondary btn-sm" onClick={() => void load()}>
              Refresh
            </button>
            <button type="button" className="btn-secondary btn-sm" onClick={exportCsv}>
              Export
            </button>
            <Link href="/leads?add=1" className="btn-sm">
              + Add Lead
            </Link>
          </div>
        </div>

        <div className="filter-chips" role="tablist" aria-label="Filter by stage">
          <button
            type="button"
            role="tab"
            className={`filter-chip ${pipeline === "all" ? "active" : ""}`}
            onClick={() => setPipeline("all")}
          >
            All
            <span className="filter-chip-count">{items.length}</span>
          </button>
          {PIPELINE_COLUMNS.map((col) => (
            <button
              key={col.id}
              type="button"
              role="tab"
              className={`filter-chip ${pipeline === col.id ? "active" : ""}`}
              onClick={() => setPipeline(col.id)}
            >
              {col.label}
              <span className="filter-chip-count">{columnCounts[col.id] ?? 0}</span>
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="hub-loading">
          <div className="loading-line" />
        </div>
      ) : items.length === 0 ? (
        <div className="hub-panel hub-empty-panel">
          <EmptyState
            icon="candidates"
            title="No registered candidates"
            description="Candidates appear here after leads complete registration."
            action={
              <Link href="/leads?add=1" className="btn-sm">
                + Add Lead
              </Link>
            }
          />
        </div>
      ) : filtered.length === 0 ? (
        <div className="hub-panel hub-empty-panel">
          <EmptyState title="No matches" description="Try a different search or stage filter." />
        </div>
      ) : (
        <div className="hub-panel hub-table-panel">
          <div className="hub-table-meta">
            <span className="muted">
              Showing {filtered.length} of {items.length} candidates
            </span>
          </div>
          <div className="data-table-wrap enterprise-table">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Candidate</th>
                  <th>Reg. ID</th>
                  <th>Stage</th>
                  <th>Batch</th>
                  <th>Score</th>
                  <th>Decision</th>
                  <th className="th-actions">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((c) => (
                  <tr key={c.id}>
                    <td>
                      <div className="cell-with-avatar">
                        <span className="candidate-avatar candidate-avatar-sm">{initials(c.fullName)}</span>
                        <div>
                          <Link href={`/candidates/${c.id}`} className="cell-name cell-link">
                            {c.fullName}
                          </Link>
                          <div className="cell-muted">{c.email}</div>
                        </div>
                      </div>
                    </td>
                    <td className="cell-mono">{c.registrationId ?? "—"}</td>
                    <td>
                      <Badge variant={statusToVariant(c.lifecycleStage)}>
                        {formatStatusLabel(c.lifecycleStage)}
                      </Badge>
                    </td>
                    <td>
                      {c.batch ? (
                        <>
                          <div>{c.batch.name}</div>
                          <div className="cell-muted">{c.batch.trainerName}</div>
                        </>
                      ) : (
                        "—"
                      )}
                    </td>
                    <td>{c.finalScore ?? "—"}</td>
                    <td>
                      {c.decision ? (
                        <Badge variant={statusToVariant(c.decision)}>{formatStatusLabel(c.decision)}</Badge>
                      ) : (
                        "—"
                      )}
                    </td>
                    <td className="cell-actions">
                      <div className="action-group">
                        <Link href={`/candidates/${c.id}`} className="btn-ghost btn-sm">
                          View
                        </Link>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

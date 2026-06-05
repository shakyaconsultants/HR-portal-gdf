"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import { AddLeadModal } from "@/components/leads/AddLeadModal";
import { ScheduleInterviewModal } from "@/components/leads/ScheduleInterviewModal";
import { SendLoiModal } from "@/components/leads/SendLoiModal";
import { Badge } from "@/components/ui/Badge";
import { EmptyState } from "@/components/ui/EmptyState";
import { LEAD_PIPELINE_COLUMNS, leadColumnForStatus } from "@/lib/lead-pipeline-ui";
import { formatLeadStatus } from "@/lib/leads";

type LeadRow = {
  id: string;
  fullName: string;
  email: string;
  phone: string;
  leadStatus: string;
  referenceSourceLabel: string;
  referenceName: string;
  remarks: string;
};

function initials(name: string) {
  return name
    .split(" ")
    .map((p) => p[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

function leadStatusVariant(status: string) {
  if (status === "SELECTED" || status === "AWAITING_REGISTRATION") return "success" as const;
  if (status === "REJECTED") return "danger" as const;
  if (status === "HOLD") return "warning" as const;
  if (status === "INTERVIEW_SCHEDULED" || status === "LOI_SENT") return "info" as const;
  return "neutral" as const;
}

export function LeadsManagementClient() {
  const searchParams = useSearchParams();
  const [pipeline, setPipeline] = useState(searchParams.get("pipeline") ?? "all");
  const [search, setSearch] = useState(searchParams.get("search") ?? "");
  const [items, setItems] = useState<LeadRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [addOpen, setAddOpen] = useState(searchParams.get("add") === "1");
  const [scheduleOpen, setScheduleOpen] = useState(false);
  const [scheduleLeadId, setScheduleLeadId] = useState("");
  const [loiOpen, setLoiOpen] = useState(false);
  const [loiLead, setLoiLead] = useState<LeadRow | null>(null);

  function openSchedule(leadId: string) {
    setScheduleLeadId(leadId);
    setScheduleOpen(true);
  }

  function openLoi(lead: LeadRow) {
    setLoiLead(lead);
    setLoiOpen(true);
  }

  const load = useCallback(async () => {
    setLoading(true);
    const query = new URLSearchParams({ page: "1", pageSize: "300" });
    if (search.trim()) query.set("search", search.trim());
    const res = await fetch(`/api/leads?${query}`, { cache: "no-store" });
    const json = await res.json();
    if (res.ok && json.ok) {
      setItems(
        (json.data?.items ?? []).map((l: Record<string, unknown>) => ({
          id: String(l.id),
          fullName: String(l.fullName),
          email: String(l.email),
          phone: String(l.phone),
          leadStatus: String(l.leadStatus),
          referenceSourceLabel: String(l.referenceSourceLabel ?? ""),
          referenceName: String(l.referenceName ?? ""),
          remarks: String(l.remarks ?? ""),
        }))
      );
    }
    setLoading(false);
  }, [search]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    if (searchParams.get("add") === "1") setAddOpen(true);
    const scheduleId = searchParams.get("schedule");
    if (scheduleId) openSchedule(scheduleId);
    const p = searchParams.get("pipeline");
    if (p) setPipeline(p);
  }, [searchParams]);

  const columnCounts = useMemo(() => {
    const counts = Object.fromEntries(LEAD_PIPELINE_COLUMNS.map((c) => [c.id, 0]));
    for (const l of items) {
      const col = leadColumnForStatus(l.leadStatus);
      counts[col.id] = (counts[col.id] ?? 0) + 1;
    }
    return counts;
  }, [items]);

  const filtered = useMemo(() => {
    if (pipeline === "all") return items;
    const col = LEAD_PIPELINE_COLUMNS.find((c) => c.id === pipeline);
    if (!col) return items;
    return items.filter((l) => col.statuses.includes(l.leadStatus as never));
  }, [items, pipeline]);

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
              placeholder="Search by name, email, phone, or reference…"
              aria-label="Search leads"
              onKeyDown={(e) => e.key === "Enter" && void load()}
            />
          </div>
          <div className="hub-actions">
            <button type="button" className="btn-secondary btn-sm" onClick={() => void load()}>
              Refresh
            </button>
            <button type="button" className="btn-sm" onClick={() => setAddOpen(true)}>
              + Add Lead
            </button>
          </div>
        </div>

        <div className="filter-chips" role="tablist" aria-label="Filter by status">
          <button
            type="button"
            role="tab"
            className={`filter-chip ${pipeline === "all" ? "active" : ""}`}
            onClick={() => setPipeline("all")}
          >
            All
            <span className="filter-chip-count">{items.length}</span>
          </button>
          {LEAD_PIPELINE_COLUMNS.map((col) => (
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
            title="No leads yet"
            description="Create your first lead to start the recruitment pipeline."
            action={
              <button type="button" onClick={() => setAddOpen(true)}>
                + Add Lead
              </button>
            }
          />
        </div>
      ) : filtered.length === 0 ? (
        <div className="hub-panel hub-empty-panel">
          <EmptyState title="No matches" description="Try a different search or status filter." />
        </div>
      ) : (
        <div className="hub-panel hub-table-panel">
          <div className="hub-table-meta">
            <span className="muted">
              Showing {filtered.length} of {items.length} leads
            </span>
          </div>
          <div className="data-table-wrap enterprise-table">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Lead</th>
                  <th>Contact</th>
                  <th>Source</th>
                  <th>Reference</th>
                  <th>Status</th>
                  <th className="th-actions">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((l) => (
                  <tr key={l.id}>
                    <td>
                      <div className="cell-with-avatar">
                        <span className="candidate-avatar candidate-avatar-sm">{initials(l.fullName)}</span>
                        <div>
                          <Link href={`/leads/${l.id}`} className="cell-name cell-link">
                            {l.fullName}
                          </Link>
                          {l.remarks ? <div className="cell-muted cell-truncate">{l.remarks}</div> : null}
                        </div>
                      </div>
                    </td>
                    <td>
                      <div>{l.phone}</div>
                      <div className="cell-muted">{l.email}</div>
                    </td>
                    <td>{l.referenceSourceLabel}</td>
                    <td className="cell-muted">{l.referenceName || "—"}</td>
                    <td>
                      <Badge variant={leadStatusVariant(l.leadStatus)}>{formatLeadStatus(l.leadStatus)}</Badge>
                    </td>
                    <td className="cell-actions">
                      <div className="action-group">
                        <Link href={`/leads/${l.id}`} className="btn-ghost btn-sm">
                          View
                        </Link>
                        {l.leadStatus === "NEW_LEAD" ? (
                          <button type="button" className="btn-ghost btn-sm" onClick={() => openSchedule(l.id)}>
                            Schedule
                          </button>
                        ) : null}
                        {l.leadStatus === "SELECTED" ? (
                          <button type="button" className="btn-ghost btn-sm" onClick={() => openLoi(l)}>
                            Send LOI
                          </button>
                        ) : null}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <AddLeadModal open={addOpen} onClose={() => setAddOpen(false)} onCreated={() => void load()} />

      <ScheduleInterviewModal
        open={scheduleOpen}
        onClose={() => {
          setScheduleOpen(false);
          setScheduleLeadId("");
        }}
        initialLeadId={scheduleLeadId}
        onScheduled={() => void load()}
      />

      {loiLead ? (
        <SendLoiModal
          open={loiOpen}
          onClose={() => {
            setLoiOpen(false);
            setLoiLead(null);
          }}
          leadId={loiLead.id}
          leadName={loiLead.fullName}
          leadEmail={loiLead.email}
          onSent={() => void load()}
        />
      ) : null}
    </div>
  );
}

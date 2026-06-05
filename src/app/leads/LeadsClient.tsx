"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Fragment, useCallback, useEffect, useState } from "react";
import { Badge } from "@/components/ui/Badge";
import { EmptyState } from "@/components/ui/EmptyState";
import { Field } from "@/components/ui/Field";
import { PageSection } from "@/components/ui/PageSection";
import { useToast } from "@/components/ToastProvider";
import { LEAD_STATUSES, REFERENCE_SOURCES } from "@/lib/constants";
import { formatLeadStatus, formatReferenceSource } from "@/lib/leads";
import { formatStatusLabel, statusToVariant } from "@/lib/status-ui";

type LeadRow = {
  id: string;
  fullName: string;
  email: string;
  phone: string;
  leadStatus: string;
  leadStatusLabel: string;
  referenceSource: string;
  referenceSourceLabel: string;
  comments: string;
  lifecycleStage: string;
  resume: { fileName: string; filePath: string } | null;
  updatedAt: string;
};

type LeadCounts = {
  total: number;
  byStatus: Record<string, number>;
};

const STATUS_TABS = [
  { key: "all", label: "All" },
  ...LEAD_STATUSES.map((s) => ({ key: s, label: formatLeadStatus(s) })),
];

function leadStatusVariant(status: string) {
  switch (status) {
    case "NEW_LEAD":
      return "neutral" as const;
    case "INTERVIEW_SCHEDULED":
      return "info" as const;
    case "INTERVIEW_COMPLETED":
      return "warning" as const;
    case "SELECTED":
      return "success" as const;
    case "REJECTED":
      return "danger" as const;
    default:
      return "neutral" as const;
  }
}

export function LeadsClient() {
  const searchParams = useSearchParams();
  const toast = useToast();
  const [items, setItems] = useState<LeadRow[]>([]);
  const [counts, setCounts] = useState<LeadCounts | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState(() => {
    const status = searchParams.get("status");
    return status && LEAD_STATUSES.includes(status as (typeof LEAD_STATUSES)[number]) ? status : "all";
  });
  const [sourceFilter, setSourceFilter] = useState("");
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [referenceSource, setReferenceSource] = useState<string>(REFERENCE_SOURCES[0]);
  const [comments, setComments] = useState("");
  const [resume, setResume] = useState<File | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    const query = new URLSearchParams({ page: "1", pageSize: "100" });
    if (search.trim()) query.set("search", search.trim());
    if (statusFilter !== "all") query.set("leadStatus", statusFilter);
    if (sourceFilter) query.set("referenceSource", sourceFilter);

    const res = await fetch(`/api/leads?${query}`, { cache: "no-store" });
    const json = await res.json();
    if (res.ok && json.ok) {
      setItems(json.data?.items ?? []);
      setCounts(json.data?.counts ?? null);
    }
    setLoading(false);
  }, [search, statusFilter, sourceFilter]);

  useEffect(() => {
    void load();
  }, [load]);

  async function createLead(e: React.FormEvent) {
    e.preventDefault();
    if (!resume) {
      toast.error("Please upload a resume.");
      return;
    }
    setSaving(true);
    const formData = new FormData();
    formData.set("fullName", fullName);
    formData.set("email", email);
    formData.set("phone", phone);
    formData.set("referenceSource", referenceSource);
    formData.set("comments", comments);
    formData.set("resume", resume);

    const res = await fetch("/api/leads", { method: "POST", body: formData });
    const json = await res.json();
    setSaving(false);
    if (res.ok && json.ok) {
      toast.success("Lead created.");
      setFullName("");
      setEmail("");
      setPhone("");
      setComments("");
      setResume(null);
      void load();
    } else {
      toast.error(json.error ?? "Unable to create lead.");
    }
  }

  async function updateLeadStatus(leadId: string, leadStatus: string) {
    setUpdatingId(leadId);
    const res = await fetch(`/api/leads/${leadId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ leadStatus }),
    });
    const json = await res.json();
    setUpdatingId(null);
    if (res.ok && json.ok) {
      toast.success(`Status updated to ${formatLeadStatus(leadStatus)}.`);
      void load();
    } else {
      toast.error(json.error ?? "Unable to update status.");
    }
  }

  return (
    <div className="stack-lg">
      <div className="stats-grid stats-grid-5">
        <article className="stat-tile accent-indigo">
          <span className="stat-tile-label">Total Leads</span>
          <span className="stat-tile-value">{counts?.total ?? "—"}</span>
        </article>
        <article className="stat-tile accent-neutral">
          <span className="stat-tile-label">New Leads</span>
          <span className="stat-tile-value">{counts?.byStatus?.NEW_LEAD ?? "—"}</span>
        </article>
        <article className="stat-tile accent-sky">
          <span className="stat-tile-label">Interview Scheduled</span>
          <span className="stat-tile-value">{counts?.byStatus?.INTERVIEW_SCHEDULED ?? "—"}</span>
        </article>
        <article className="stat-tile accent-emerald">
          <span className="stat-tile-label">Selected</span>
          <span className="stat-tile-value">{counts?.byStatus?.SELECTED ?? "—"}</span>
        </article>
        <article className="stat-tile accent-rose">
          <span className="stat-tile-label">Rejected</span>
          <span className="stat-tile-value">{counts?.byStatus?.REJECTED ?? "—"}</span>
        </article>
      </div>

      <form className="card stack" onSubmit={(e) => void createLead(e)}>
        <h3>Add lead</h3>
        <p className="muted">Capture potential candidates before interview scheduling.</p>
        <div className="form-grid">
          <Field label="Full name">
            <input value={fullName} onChange={(e) => setFullName(e.target.value)} required />
          </Field>
          <Field label="Mobile number">
            <input value={phone} onChange={(e) => setPhone(e.target.value)} required />
          </Field>
          <Field label="Email">
            <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
          </Field>
          <Field label="Reference source">
            <select value={referenceSource} onChange={(e) => setReferenceSource(e.target.value)} required>
              {REFERENCE_SOURCES.map((s) => (
                <option key={s} value={s}>
                  {formatReferenceSource(s)}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Resume upload">
            <input
              type="file"
              accept=".pdf,.doc,.docx,application/pdf,application/msword"
              onChange={(e) => setResume(e.target.files?.[0] ?? null)}
              required
            />
          </Field>
        </div>
        <Field label="Comments">
          <textarea value={comments} onChange={(e) => setComments(e.target.value)} rows={3} placeholder="Notes about the lead…" />
        </Field>
        <button type="submit" disabled={saving}>
          {saving ? "Saving…" : "Create lead"}
        </button>
      </form>

      <PageSection
        title="Lead registry"
        description="Filter by status or reference source. Rejected leads are kept permanently."
        actions={
          <button type="button" onClick={() => void load()}>
            Refresh
          </button>
        }
      >
        <div className="toolbar toolbar-spaced lead-filters">
          <Field label="Search">
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Name, email, phone, comments"
              onKeyDown={(e) => {
                if (e.key === "Enter") void load();
              }}
            />
          </Field>
          <Field label="Reference source">
            <select value={sourceFilter} onChange={(e) => setSourceFilter(e.target.value)}>
              <option value="">All sources</option>
              {REFERENCE_SOURCES.map((s) => (
                <option key={s} value={s}>
                  {formatReferenceSource(s)}
                </option>
              ))}
            </select>
          </Field>
          <button type="button" onClick={() => void load()}>
            Apply filters
          </button>
        </div>

        <div className="tab-bar lead-status-tabs">
          {STATUS_TABS.map((tab) => (
            <button
              key={tab.key}
              type="button"
              className={statusFilter === tab.key ? "active" : ""}
              onClick={() => setStatusFilter(tab.key)}
            >
              {tab.label}
              {tab.key !== "all" && counts?.byStatus?.[tab.key] != null ? (
                <span className="tab-count">{counts.byStatus[tab.key]}</span>
              ) : null}
            </button>
          ))}
        </div>

        {loading ? (
          <div className="stack skeleton-stack">
            <div className="loading-line" />
            <div className="loading-line" />
          </div>
        ) : items.length === 0 ? (
          <EmptyState title="No leads found" description="Adjust filters or add a new lead above." />
        ) : (
          <div className="data-table-wrap">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Candidate</th>
                  <th>Source</th>
                  <th>Status</th>
                  <th>Resume</th>
                  <th>Updated</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {items.map((lead) => (
                  <Fragment key={lead.id}>
                    <tr>
                      <td>
                        <div className="cell-name">{lead.fullName}</div>
                        <div className="cell-muted">
                          {lead.email} · {lead.phone}
                        </div>
                      </td>
                      <td>{lead.referenceSourceLabel}</td>
                      <td>
                        <Badge variant={leadStatusVariant(lead.leadStatus)}>{lead.leadStatusLabel}</Badge>
                      </td>
                      <td>
                        {lead.resume ? (
                          <a href={lead.resume.filePath} target="_blank" rel="noreferrer" className="profile-link">
                            {lead.resume.fileName}
                          </a>
                        ) : (
                          <span className="muted">—</span>
                        )}
                      </td>
                      <td className="cell-muted">{new Date(lead.updatedAt).toLocaleDateString()}</td>
                      <td className="cell-actions">
                        <button type="button" className="btn-inline" onClick={() => setExpandedId(expandedId === lead.id ? null : lead.id)}>
                          {expandedId === lead.id ? "Close" : "Manage"}
                        </button>
                        <Link href={`/leads/${lead.id}`} className="profile-link">
                          Profile →
                        </Link>
                      </td>
                    </tr>
                    {expandedId === lead.id && (
                      <tr className="lead-detail-row">
                        <td colSpan={6}>
                          <div className="lead-detail-panel">
                            {lead.comments ? (
                              <p>
                                <strong>Comments:</strong> {lead.comments}
                              </p>
                            ) : (
                              <p className="muted">No comments.</p>
                            )}
                            <p className="muted">
                              Lifecycle: <Badge variant={statusToVariant(lead.lifecycleStage)}>{formatStatusLabel(lead.lifecycleStage)}</Badge>
                            </p>
                            {lead.leadStatus !== "REJECTED" && (
                              <div className="lead-status-actions">
                                <span className="muted">Move to:</span>
                                {LEAD_STATUSES.filter((s) => s !== lead.leadStatus).map((s) => (
                                  <button
                                    key={s}
                                    type="button"
                                    disabled={updatingId === lead.id}
                                    onClick={() => void updateLeadStatus(lead.id, s)}
                                  >
                                    {formatLeadStatus(s)}
                                  </button>
                                ))}
                              </div>
                            )}
                            {lead.leadStatus === "REJECTED" && (
                              <p className="muted">Rejected leads are kept permanently and cannot be reactivated.</p>
                            )}
                          </div>
                        </td>
                      </tr>
                    )}
                  </Fragment>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </PageSection>
    </div>
  );
}

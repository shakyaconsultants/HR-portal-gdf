"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Fragment, useCallback, useEffect, useState } from "react";
import { RecordInterviewOutcomeModal, type OutcomeInterview } from "@/components/leads/RecordInterviewOutcomeModal";
import { ScheduleInterviewModal } from "@/components/leads/ScheduleInterviewModal";
import { Badge } from "@/components/ui/Badge";
import { EmptyState } from "@/components/ui/EmptyState";
import { PageSection } from "@/components/ui/PageSection";

type InterviewRow = {
  id: string;
  candidateId: string;
  candidateName: string;
  candidateEmail: string;
  interviewDate: string;
  interviewTime: string;
  interviewer: string;
  modeLabel: string;
  outcome: string | null;
  outcomeRemarks: string;
  invitationSentAt: string | null;
  scheduledByName: string;
  outcomeRecordedByName: string;
};

type InterviewCounts = {
  scheduled: number;
  completed: number;
  selected: number;
  rejected: number;
};

const TABS = [
  { key: "upcoming", label: "Upcoming" },
  { key: "history", label: "History" },
] as const;

function outcomeVariant(outcome: string | null) {
  if (outcome === "SELECTED") return "success" as const;
  if (outcome === "REJECTED") return "danger" as const;
  if (outcome === "HOLD") return "warning" as const;
  return "info" as const;
}

export function InterviewsClient() {
  const searchParams = useSearchParams();
  const initialTab = TABS.some((t) => t.key === searchParams.get("tab"))
    ? (searchParams.get("tab") as (typeof TABS)[number]["key"])
    : "upcoming";
  const preselectedLeadId = searchParams.get("leadId") ?? "";
  const shouldOpenSchedule = searchParams.get("schedule") === "1" || Boolean(preselectedLeadId);

  const [tab, setTab] = useState<(typeof TABS)[number]["key"]>(initialTab);
  const [items, setItems] = useState<InterviewRow[]>([]);
  const [counts, setCounts] = useState<InterviewCounts | null>(null);
  const [loading, setLoading] = useState(true);
  const [scheduleOpen, setScheduleOpen] = useState(shouldOpenSchedule);
  const [outcomeOpen, setOutcomeOpen] = useState(false);
  const [outcomeInterview, setOutcomeInterview] = useState<OutcomeInterview | null>(null);

  const loadInterviews = useCallback(async () => {
    setLoading(true);
    const res = await fetch(`/api/interviews?tab=${tab}`, { cache: "no-store" });
    const json = await res.json();
    if (res.ok && json.ok) {
      setItems(json.data?.items ?? []);
      setCounts(json.data?.counts ?? null);
    }
    setLoading(false);
  }, [tab]);

  const loadCounts = useCallback(async () => {
    const res = await fetch("/api/interviews?tab=upcoming", { cache: "no-store" });
    const json = await res.json();
    if (res.ok && json.ok) {
      setCounts(json.data?.counts ?? null);
    }
  }, []);

  useEffect(() => {
    void loadInterviews();
    void loadCounts();
  }, [loadInterviews, loadCounts]);

  useEffect(() => {
    if (shouldOpenSchedule) setScheduleOpen(true);
  }, [shouldOpenSchedule]);

  function formatDate(value: string) {
    return new Date(value).toLocaleDateString("en-IN", {
      weekday: "short",
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  }

  function openOutcome(item: InterviewRow) {
    setOutcomeInterview({
      id: item.id,
      candidateName: item.candidateName,
      candidateEmail: item.candidateEmail,
      interviewDate: item.interviewDate,
      interviewTime: item.interviewTime,
      interviewer: item.interviewer,
      invitationSentAt: item.invitationSentAt,
      scheduledByName: item.scheduledByName,
    });
    setOutcomeOpen(true);
  }

  function afterWorkflowChange() {
    void loadInterviews();
    void loadCounts();
  }

  return (
    <div className="stack-lg">
      <div className="stats-grid stats-grid-4">
        <article className="stat-tile accent-sky">
          <span className="stat-tile-label">Scheduled</span>
          <span className="stat-tile-value">{counts?.scheduled ?? "—"}</span>
        </article>
        <article className="stat-tile accent-indigo">
          <span className="stat-tile-label">Completed</span>
          <span className="stat-tile-value">{counts?.completed ?? "—"}</span>
        </article>
        <article className="stat-tile accent-emerald">
          <span className="stat-tile-label">Selected</span>
          <span className="stat-tile-value">{counts?.selected ?? "—"}</span>
        </article>
        <article className="stat-tile accent-rose">
          <span className="stat-tile-label">Rejected</span>
          <span className="stat-tile-value">{counts?.rejected ?? "—"}</span>
        </article>
      </div>

      <div className="hub-panel">
        <div className="hub-toolbar hub-toolbar-split">
          <div className="filter-chips filter-chips-inline" role="tablist">
            {TABS.map((t) => (
              <button
                key={t.key}
                type="button"
                role="tab"
                className={`filter-chip ${tab === t.key ? "active" : ""}`}
                onClick={() => setTab(t.key)}
              >
                {t.label}
              </button>
            ))}
          </div>
          <div className="hub-actions">
            <button type="button" className="btn-sm" onClick={() => setScheduleOpen(true)}>
              + Schedule Interview
            </button>
          </div>
        </div>
      </div>

      <PageSection
        title={tab === "upcoming" ? "Upcoming interviews" : "Interview history"}
        description={
          tab === "upcoming"
            ? "Record outcome after the interview. Selected leads move to LOI Queue."
            : "Permanent record of all completed interviews with outcomes and remarks."
        }
        actions={
          <button type="button" onClick={() => void loadInterviews()}>
            Refresh
          </button>
        }
      >
        {loading ? (
          <div className="stack skeleton-stack">
            <div className="loading-line" />
            <div className="loading-line" />
          </div>
        ) : items.length === 0 ? (
          <EmptyState
            title={tab === "upcoming" ? "No upcoming interviews" : "No interview history"}
            description={
              tab === "upcoming" ? "Schedule an interview using the button above." : "Completed interviews will appear here."
            }
            action={
              tab === "upcoming" ? (
                <button type="button" onClick={() => setScheduleOpen(true)}>
                  + Schedule Interview
                </button>
              ) : undefined
            }
          />
        ) : (
          <div className="hub-panel hub-table-panel">
          <div className="data-table-wrap enterprise-table">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Lead</th>
                  <th>Date & time</th>
                  <th>Interviewer</th>
                  <th>Mode</th>
                  {tab === "history" && <th>Outcome</th>}
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {items.map((item) => (
                  <Fragment key={item.id}>
                    <tr>
                      <td>
                        <div className="cell-name">{item.candidateName}</div>
                        <div className="cell-muted">{item.candidateEmail}</div>
                      </td>
                      <td>
                        {formatDate(item.interviewDate)}
                        <div className="cell-muted">{item.interviewTime}</div>
                      </td>
                      <td>{item.interviewer}</td>
                      <td>{item.modeLabel}</td>
                      {tab === "history" && (
                        <td>
                          {item.outcome ? (
                            <Badge variant={outcomeVariant(item.outcome)}>{item.outcome}</Badge>
                          ) : (
                            "—"
                          )}
                        </td>
                      )}
                      <td className="cell-actions">
                        {tab === "upcoming" ? (
                          <button type="button" className="btn-inline" onClick={() => openOutcome(item)}>
                            Record outcome
                          </button>
                        ) : null}
                        <Link href={`/leads/${item.candidateId}`} className="profile-link">
                          Profile →
                        </Link>
                      </td>
                    </tr>
                    {tab === "history" && item.outcomeRemarks && (
                      <tr className="lead-detail-row">
                        <td colSpan={6}>
                          <p className="muted">
                            <strong>Remarks:</strong> {item.outcomeRemarks}
                            {item.outcomeRecordedByName ? ` — ${item.outcomeRecordedByName}` : ""}
                          </p>
                        </td>
                      </tr>
                    )}
                  </Fragment>
                ))}
              </tbody>
            </table>
          </div>
          </div>
        )}
      </PageSection>

      <ScheduleInterviewModal
        open={scheduleOpen}
        onClose={() => setScheduleOpen(false)}
        initialLeadId={preselectedLeadId}
        onScheduled={afterWorkflowChange}
      />

      <RecordInterviewOutcomeModal
        open={outcomeOpen}
        onClose={() => {
          setOutcomeOpen(false);
          setOutcomeInterview(null);
        }}
        interview={outcomeInterview}
        onRecorded={afterWorkflowChange}
      />
    </div>
  );
}

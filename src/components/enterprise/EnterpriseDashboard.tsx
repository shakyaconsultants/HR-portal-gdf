"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Badge } from "@/components/ui/Badge";
import { CompactKpi } from "@/components/ui/CompactKpi";
import { EmptyState } from "@/components/ui/EmptyState";
import { PipelineProgress } from "@/components/ui/PipelineProgress";
import { countForLeadStatuses, DASHBOARD_LEAD_STAGES } from "@/lib/lead-pipeline-ui";
import { DASHBOARD_CANDIDATE_STAGES, countForStages } from "@/lib/pipeline-ui";
import { formatLeadStatus } from "@/lib/leads";
import { formatStatusLabel, statusToVariant } from "@/lib/status-ui";
import type { HrWorkflowStats } from "@/components/HrWorkflowDashboard";

type RecentCandidate = {
  id: string;
  registrationId?: string;
  fullName: string;
  lifecycleStage: string;
};

type RecentLead = {
  id: string;
  fullName: string;
  leadStatus: string;
};

type DashboardData = HrWorkflowStats & {
  totalCandidates: number;
  lifecycleCounts: Record<string, number>;
  activeBatches: number;
  candidatesInTraining: number;
  employees: number;
  pendingVerification: number;
  pendingHiringDecision: number;
  onboardingAwaitingReview: number;
  mockCallPending: number;
  totalActiveLeads: number;
  leadsInterviewScheduled: number;
  leadsSelected: number;
  leadsRejected: number;
  leadsAwaitingRegistration: number;
  leadCounts: Record<string, number>;
};

const CANDIDATE_PENDING_ACTIONS = [
  { key: "verification", label: "Verification Review", href: "/candidates?pipeline=verification", statKey: "pendingVerification" as const },
  { key: "mock", label: "Mock Calls", href: "/candidates?pipeline=mock", queueStage: "FINAL_MOCK_CALL" },
  { key: "offer", label: "Offer Letters", href: "/candidates?pipeline=offer", queueStage: "OFFER_LETTER" },
  { key: "onboarding", label: "Onboarding", href: "/candidates?pipeline=onboarding", statKey: "onboardingAwaitingReview" as const },
];

export function EnterpriseDashboard({ initialStats }: { initialStats: DashboardData }) {
  const [stats] = useState(initialStats);
  const [queues, setQueues] = useState<Record<string, RecentCandidate[]> | null>(null);
  const [recentCandidates, setRecentCandidates] = useState<RecentCandidate[]>([]);
  const [recentLeads, setRecentLeads] = useState<RecentLead[]>([]);

  useEffect(() => {
    void fetch("/api/dashboard/queues", { cache: "no-store" })
      .then((r) => r.json())
      .then((j) => {
        if (j.ok) {
          setQueues(j.data?.queues ?? null);
          setRecentCandidates(j.data?.recentCandidates ?? []);
          setRecentLeads(j.data?.recentLeads ?? []);
        }
      })
      .catch(() => setQueues({}));
  }, []);

  const leadPipelineStages = DASHBOARD_LEAD_STAGES.map((stage) => ({
    id: stage.id,
    label: stage.label,
    count: countForLeadStatuses(stats.leadCounts ?? {}, [...stage.statuses]),
    color: stage.color,
    href:
      stage.id === "interview"
        ? "/interviews"
        : stage.id === "awaiting"
          ? "/letter-of-intent?tab=sent"
          : `/leads?pipeline=${stage.id}`,
  }));

  const candidatePipelineStages = DASHBOARD_CANDIDATE_STAGES.map((stage) => ({
    id: stage.id,
    label: stage.label,
    count: countForStages(stats.lifecycleCounts, [...stage.stages]),
    color: stage.color,
    href: `/candidates?pipeline=${stage.id}`,
  }));

  const mockCallCount = stats.mockCallPending ?? countForStages(stats.lifecycleCounts, ["FINAL_MOCK_CALL"]);
  const offerCount =
    (stats.lifecycleCounts.OFFER_LETTER ?? 0) + (stats.lifecycleCounts.JOINING_INSTRUCTIONS ?? 0);

  return (
    <div className="enterprise-dashboard">
      <section className="dash-pipeline-section">
        <div className="pipeline-section-header">
          <div>
            <h2 className="section-title">Lead Metrics</h2>
            <p className="section-subtitle muted">Pre-registration recruitment pipeline</p>
          </div>
          <Link href="/leads" className="text-link">
            Lead Management →
          </Link>
        </div>
        <div className="dash-kpi-row">
          <CompactKpi label="Total Leads" value={stats.totalActiveLeads} trend="Active" />
          <CompactKpi label="Interview Scheduled" value={stats.leadsInterviewScheduled} trend="In progress" />
          <CompactKpi label="Selected" value={stats.leadsSelected} trend="Ready for LOI" />
          <CompactKpi label="Rejected" value={stats.leadsRejected} trend="Closed" />
          <CompactKpi label="Awaiting Registration" value={stats.leadsAwaitingRegistration} trend="LOI sent" />
        </div>
        <div className="dash-section glass-card">
          <div className="section-head">
            <h3 className="section-title-sm">Lead Pipeline</h3>
            <Link href="/leads" className="text-link">
              View all →
            </Link>
          </div>
          <PipelineProgress stages={leadPipelineStages} showConversion />
        </div>
        <div className="dash-section glass-card">
          <div className="section-head">
            <h3 className="section-title-sm">Recent Leads</h3>
            <Link href="/leads" className="text-link">
              View all →
            </Link>
          </div>
          {recentLeads.length === 0 ? (
            <EmptyState
              title="No active leads"
              description="Add a lead to start the recruitment pipeline."
              action={
                <Link href="/leads?add=1" className="btn-sm">
                  + Add Lead
                </Link>
              }
            />
          ) : (
            <ul className="activity-timeline">
              {recentLeads.map((l) => (
                <li key={l.id}>
                  <div className="activity-dot activity-dot-lead" />
                  <div className="activity-body">
                    <Link href={`/leads/${l.id}`} className="activity-title">
                      {l.fullName}
                    </Link>
                    <span className="activity-meta">
                      <Badge variant="info">{formatLeadStatus(l.leadStatus)}</Badge>
                    </span>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </section>

      <section className="dash-pipeline-section">
        <div className="pipeline-section-header">
          <div>
            <h2 className="section-title">Candidate Metrics</h2>
            <p className="section-subtitle muted">Post-registration processing only</p>
          </div>
          <Link href="/candidates" className="text-link">
            Candidate Management →
          </Link>
        </div>
        <div className="dash-kpi-row">
          <CompactKpi label="Verification" value={stats.pendingVerification} trend="Pending review" />
          <CompactKpi label="Training" value={stats.candidatesInTraining} trend={`${stats.activeBatches} batches`} />
          <CompactKpi label="Mock Call" value={mockCallCount} trend="Evaluation" />
          <CompactKpi label="Hiring" value={stats.pendingHiringDecision} trend="Decision pending" />
          <CompactKpi label="Offer" value={offerCount} trend="Letters & joining" />
          <CompactKpi label="Onboarding" value={stats.onboardingAwaitingReview} trend="Awaiting review" />
        </div>
        <div className="dash-section glass-card">
          <div className="section-head">
            <h3 className="section-title-sm">Candidate Pipeline</h3>
            <Link href="/candidates" className="text-link">
              View all →
            </Link>
          </div>
          <PipelineProgress stages={candidatePipelineStages} showConversion />
        </div>
        <div className="dash-section glass-card">
          <div className="section-head">
            <h3 className="section-title-sm">Recent Candidates</h3>
            <Link href="/candidates" className="text-link">
              View all →
            </Link>
          </div>
          {recentCandidates.length === 0 ? (
            <EmptyState
              icon="candidates"
              title="No registered candidates yet"
              description="Candidates appear after leads complete registration."
            />
          ) : (
            <ul className="activity-timeline">
              {recentCandidates.map((c) => (
                <li key={c.id}>
                  <div className="activity-dot activity-dot-candidate" />
                  <div className="activity-body">
                    <Link href={`/candidates/${c.id}`} className="activity-title">
                      {c.fullName}
                    </Link>
                    <span className="activity-meta">
                      <Badge variant={statusToVariant(c.lifecycleStage)}>
                        {formatStatusLabel(c.lifecycleStage)}
                      </Badge>
                      {c.registrationId ? <span>{c.registrationId}</span> : null}
                    </span>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </section>

      <section className="dash-section">
        <h2 className="section-title section-title-inline">Pending Actions</h2>
        <p className="section-subtitle muted">Candidate workflow tasks requiring HR attention</p>
        <div className="dash-pending-grid">
          {CANDIDATE_PENDING_ACTIONS.map((action) => {
            const count =
              action.statKey != null
                ? stats[action.statKey]
                : action.queueStage && queues
                  ? (queues[action.queueStage]?.length ?? 0)
                  : 0;
            return (
              <Link key={action.key} href={action.href} className="pending-compact">
                <span className="pending-compact-label">{action.label}</span>
                <span className="pending-compact-count">{count}</span>
                <span className="pending-compact-hint">{count === 1 ? "waiting" : "waiting"}</span>
              </Link>
            );
          })}
        </div>
      </section>

    </div>
  );
}

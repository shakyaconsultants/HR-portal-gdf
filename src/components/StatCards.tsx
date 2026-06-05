import Link from "next/link";
import { LifecycleStageCards } from "@/components/workflow/LifecycleStageCards";

type Stats = {
  totalCandidates: number;
  lifecycleCounts: Record<string, number>;
  pendingVerification: number;
  approvedVerification: number;
  rejectedVerification: number;
  activeBatches: number;
  candidatesInTraining: number;
  mockCallEvaluated: number;
  pendingHiringDecision: number;
  selectedCandidates: number;
  holdCandidates: number;
  rejectedHiring: number;
  hiringDecided: number;
  selectionRate: number;
  awaitingOnboarding: number;
  communicationsSent: number;
  pendingCommunications: number;
  onboardingCompleted: number;
  onboardingAwaitingReview: number;
  onboardingNotStarted?: number;
  onboardingInProgress?: number;
  onboardingCorrections?: number;
  leads: number;
  totalLeads: number;
  newLeads: number;
  leadsInterviewScheduled: number;
  leadsSelected: number;
  leadsRejected: number;
  employees: number;
  registrationPending?: number;
  registrationSubmitted?: number;
  mockCallPending?: number;
};

export function StatCards({ stats }: { stats: Stats }) {
  return (
    <div className="stack-lg">
      <div>
        <p className="stat-section-label">Lifecycle pipeline</p>
        <LifecycleStageCards counts={stats.lifecycleCounts} />
      </div>

      <div>
        <p className="stat-section-label">Lead management</p>
        <div className="stats-grid stats-grid-5">
          <Link href="/leads" className="stat-tile accent-indigo">
            <span className="stat-tile-label">Total Leads</span>
            <span className="stat-tile-value">{stats.totalLeads}</span>
          </Link>
          <Link href="/leads?status=NEW_LEAD" className="stat-tile accent-neutral">
            <span className="stat-tile-label">New Leads</span>
            <span className="stat-tile-value">{stats.newLeads}</span>
          </Link>
          <Link href="/leads?status=INTERVIEW_SCHEDULED" className="stat-tile accent-sky">
            <span className="stat-tile-label">Interview Scheduled</span>
            <span className="stat-tile-value">{stats.leadsInterviewScheduled}</span>
          </Link>
          <Link href="/leads?status=SELECTED" className="stat-tile accent-emerald">
            <span className="stat-tile-label">Selected</span>
            <span className="stat-tile-value">{stats.leadsSelected}</span>
          </Link>
          <Link href="/leads?status=REJECTED" className="stat-tile accent-rose">
            <span className="stat-tile-label">Rejected</span>
            <span className="stat-tile-value">{stats.leadsRejected}</span>
          </Link>
        </div>
      </div>

      <div>
        <p className="stat-section-label">Early funnel</p>
        <div className="stats-grid stats-grid-5">
          <Link href="/interviews?tab=scheduled" className="stat-tile accent-sky">
            <span className="stat-tile-label">Lifecycle: Interview Scheduled</span>
            <span className="stat-tile-value">{stats.lifecycleCounts.INTERVIEW_SCHEDULED ?? 0}</span>
          </Link>
          <Link href="/letter-of-intent?tab=pending" className="stat-tile accent-indigo">
            <span className="stat-tile-label">LOI Pending</span>
            <span className="stat-tile-value">{stats.lifecycleCounts.LETTER_OF_INTENT_SENT ?? 0}</span>
          </Link>
        </div>
      </div>

      <div>
        <p className="stat-section-label">Registration</p>
        <div className="stats-grid stats-grid-2">
          <Link href="/letter-of-intent?tab=sent" className="stat-tile accent-amber">
            <span className="stat-tile-label">Registration Pending</span>
            <span className="stat-tile-value">
              {stats.registrationPending ?? stats.lifecycleCounts.AWAITING_REGISTRATION ?? 0}
            </span>
          </Link>
          <Link href="/registrations" className="stat-tile accent-violet">
            <span className="stat-tile-label">Registration Submitted</span>
            <span className="stat-tile-value">
              {stats.registrationSubmitted ?? stats.lifecycleCounts.REGISTRATION_SUBMITTED ?? 0}
            </span>
          </Link>
        </div>
      </div>

      <div>
        <p className="stat-section-label">Verification</p>
        <div className="stats-grid stats-grid-3">
          <Link href="/verification?tab=pending" className="stat-tile accent-sky">
            <span className="stat-tile-label">Pending</span>
            <span className="stat-tile-value">{stats.pendingVerification}</span>
          </Link>
          <Link href="/verification?tab=approved" className="stat-tile accent-emerald">
            <span className="stat-tile-label">Approved</span>
            <span className="stat-tile-value">{stats.approvedVerification}</span>
          </Link>
          <Link href="/verification?tab=rejected" className="stat-tile accent-rose">
            <span className="stat-tile-label">Rejected</span>
            <span className="stat-tile-value">{stats.rejectedVerification}</span>
          </Link>
        </div>
      </div>

      <div>
        <p className="stat-section-label">Mock call</p>
        <div className="stats-grid stats-grid-3">
          <Link href="/evaluations?tab=pending" className="stat-tile accent-amber">
            <span className="stat-tile-label">Pending Evaluation</span>
            <span className="stat-tile-value">{stats.mockCallPending ?? 0}</span>
          </Link>
          <Link href="/evaluations?tab=evaluated" className="stat-tile accent-emerald">
            <span className="stat-tile-label">Evaluated</span>
            <span className="stat-tile-value">{stats.mockCallEvaluated}</span>
          </Link>
          <Link href="/hiring-decisions?tab=pending" className="stat-tile accent-indigo">
            <span className="stat-tile-label">Hiring Decision</span>
            <span className="stat-tile-value">{stats.pendingHiringDecision}</span>
          </Link>
        </div>
      </div>

      <div>
        <p className="stat-section-label">Hiring funnel</p>
        <div className="hiring-funnel-summary">
          <div className="funnel-metric">
            <span className="funnel-metric-label">Evaluated</span>
            <strong>{stats.mockCallEvaluated}</strong>
          </div>
          <div className="funnel-metric">
            <span className="funnel-metric-label">Decided</span>
            <strong>{stats.hiringDecided}</strong>
          </div>
          <div className="funnel-metric">
            <span className="funnel-metric-label">Selection rate</span>
            <strong>{stats.selectionRate}%</strong>
          </div>
        </div>
        <div className="stats-grid stats-grid-4">
          <Link href="/hiring-decisions?tab=pending" className="stat-tile accent-sky">
            <span className="stat-tile-label">Pending Decision</span>
            <span className="stat-tile-value">{stats.pendingHiringDecision}</span>
          </Link>
          <Link href="/communications?tab=offer" className="stat-tile accent-emerald">
            <span className="stat-tile-label">Offer Letter</span>
            <span className="stat-tile-value">{stats.lifecycleCounts.OFFER_LETTER ?? 0}</span>
          </Link>
          <Link href="/hiring-decisions?tab=hold" className="stat-tile accent-amber">
            <span className="stat-tile-label">Hold</span>
            <span className="stat-tile-value">{stats.holdCandidates}</span>
          </Link>
          <Link href="/hiring-decisions?tab=rejected" className="stat-tile accent-rose">
            <span className="stat-tile-label">Rejected</span>
            <span className="stat-tile-value">{stats.rejectedHiring}</span>
          </Link>
        </div>
      </div>

      <div>
        <p className="stat-section-label">Onboarding portal</p>
        <div className="stats-grid stats-grid-5">
          <Link href="/onboarding?tab=not_started" className="stat-tile accent-neutral">
            <span className="stat-tile-label">Not Started</span>
            <span className="stat-tile-value">{stats.onboardingNotStarted ?? 0}</span>
          </Link>
          <Link href="/onboarding?tab=in_progress" className="stat-tile accent-sky">
            <span className="stat-tile-label">In Progress</span>
            <span className="stat-tile-value">{stats.onboardingInProgress ?? 0}</span>
          </Link>
          <Link href="/onboarding?tab=under_review" className="stat-tile accent-indigo">
            <span className="stat-tile-label">Submitted</span>
            <span className="stat-tile-value">{stats.onboardingAwaitingReview}</span>
          </Link>
          <Link href="/onboarding?tab=corrections" className="stat-tile accent-amber">
            <span className="stat-tile-label">Correction Required</span>
            <span className="stat-tile-value">{stats.onboardingCorrections ?? 0}</span>
          </Link>
          <Link href="/onboarding?tab=approved" className="stat-tile accent-emerald">
            <span className="stat-tile-label">Approved</span>
            <span className="stat-tile-value">{stats.onboardingCompleted}</span>
          </Link>
        </div>
      </div>

      <div>
        <p className="stat-section-label">Employees & training</p>
        <div className="stats-grid stats-grid-2">
          <Link href="/employees" className="stat-tile accent-emerald">
            <span className="stat-tile-label">Employees</span>
            <span className="stat-tile-value">{stats.employees}</span>
          </Link>
          <Link href="/batches" className="stat-tile accent-violet">
            <span className="stat-tile-label">In Training</span>
            <span className="stat-tile-value">{stats.candidatesInTraining}</span>
          </Link>
        </div>
      </div>
    </div>
  );
}

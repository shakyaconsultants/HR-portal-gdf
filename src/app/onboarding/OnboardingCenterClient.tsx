"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { useToast } from "@/components/ToastProvider";
import { OnboardingReviewPanel } from "@/components/onboarding/OnboardingReviewPanel";
import { Badge } from "@/components/ui/Badge";
import { EmptyState } from "@/components/ui/EmptyState";
import { Field } from "@/components/ui/Field";
import { PageSection } from "@/components/ui/PageSection";
import { formatStatusLabel, sectionStatusToVariant } from "@/lib/status-ui";
import { sectionLabel } from "@/lib/onboarding";

type Tab = "all" | "not_started" | "in_progress" | "under_review" | "approved" | "corrections";

type CandidateRow = {
  id: string;
  registrationId?: string | null;
  fullName: string;
  email: string;
  queueStatus: string;
  progress: {
    completionPercent: number;
    submissionPercent: number;
    approvedCount: number;
    submittedCount: number;
  };
  sections: Array<{ section: string; status: string }>;
  links: { hub: string; joiningForm: string; idCard: string } | null;
  hasLinks: boolean;
  onboardingStatus: string;
};

type DetailSection = {
  section: string;
  label: string;
  status: string;
  corrections: string;
  submittedAt?: string | null;
  data: Record<string, unknown>;
};

const TAB_CONFIG: Array<{ id: Tab; label: string; countKey: keyof Counts; accent?: string }> = [
  { id: "all", label: "All", countKey: "all" },
  { id: "not_started", label: "Not Started", countKey: "not_started", accent: "accent-neutral" },
  { id: "in_progress", label: "In Progress", countKey: "in_progress", accent: "accent-sky" },
  { id: "under_review", label: "Under Review", countKey: "under_review", accent: "accent-indigo" },
  { id: "approved", label: "Approved", countKey: "approved", accent: "accent-emerald" },
  { id: "corrections", label: "Correction Required", countKey: "corrections", accent: "accent-amber" },
];

type Counts = {
  all: number;
  not_started: number;
  in_progress: number;
  under_review: number;
  approved: number;
  corrections: number;
  sectionNotStarted: number;
  sectionUnderReview: number;
  sectionApproved: number;
  sectionCorrections: number;
};

export function OnboardingCenterClient() {
  const toast = useToast();
  const searchParams = useSearchParams();
  const tabParam = searchParams.get("tab");
  const validTabs: Tab[] = ["all", "not_started", "in_progress", "under_review", "approved", "corrections"];
  const initialTab: Tab = validTabs.includes(tabParam as Tab) ? (tabParam as Tab) : "all";

  const [tab, setTab] = useState<Tab>(initialTab);
  const [search, setSearch] = useState("");
  const [counts, setCounts] = useState<Counts>({
    all: 0,
    not_started: 0,
    in_progress: 0,
    under_review: 0,
    approved: 0,
    corrections: 0,
    sectionNotStarted: 0,
    sectionUnderReview: 0,
    sectionApproved: 0,
    sectionCorrections: 0,
  });
  const [items, setItems] = useState<CandidateRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [detailSections, setDetailSections] = useState<Record<string, DetailSection[]>>({});
  const [generatingId, setGeneratingId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    const query = new URLSearchParams({ tab });
    if (search.trim()) query.set("search", search.trim());
    const res = await fetch(`/api/onboarding/queue?${query}`, { cache: "no-store" });
    const json = await res.json();
    if (res.ok && json.ok) {
      setCounts(json.data.counts);
      setItems(json.data.items ?? []);
    }
    setLoading(false);
  }, [tab, search]);

  useEffect(() => {
    void load();
  }, [load]);

  async function loadDetail(candidateId: string) {
    const res = await fetch(`/api/onboarding/${candidateId}`, { cache: "no-store" });
    const json = await res.json();
    if (res.ok && json.ok) {
      setDetailSections((prev) => ({ ...prev, [candidateId]: json.data.sections ?? [] }));
    }
  }

  async function toggleExpand(candidateId: string) {
    if (expandedId === candidateId) {
      setExpandedId(null);
      return;
    }
    setExpandedId(candidateId);
    if (!detailSections[candidateId]) await loadDetail(candidateId);
  }

  async function generateLinks(candidateId: string) {
    setGeneratingId(candidateId);
    const res = await fetch("/api/onboarding/generate", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ candidateId }),
    });
    const json = await res.json();
    if (res.ok && json.ok) {
      toast.success("Secure onboarding links generated.");
      await load();
    } else {
      toast.error(json.message ?? "Unable to generate links.");
    }
    setGeneratingId(null);
  }

  const tabTitle = {
    all: "All onboarding candidates",
    not_started: "Not started",
    in_progress: "In progress",
    under_review: "Under review — awaiting HR action",
    approved: "Approved — fully onboarded",
    corrections: "Correction required",
  }[tab];

  return (
    <div className="stack-lg">
      <div className="onboarding-funnel-stats onboarding-funnel-stats-6">
        {TAB_CONFIG.map((t) => (
          <button
            key={t.id}
            type="button"
            className={`verify-stat ${t.accent ?? ""} ${tab === t.id ? "active" : ""}`}
            onClick={() => setTab(t.id)}
          >
            <span className="verify-stat-label">{t.label}</span>
            <span className="verify-stat-value">{counts[t.countKey]}</span>
          </button>
        ))}
      </div>

      <div className="onboarding-section-summary">
        <span className="comm-status-chip">
          Forms not started: <strong>{counts.sectionNotStarted}</strong>
        </span>
        <span className="comm-status-chip">
          Forms under review: <strong>{counts.sectionUnderReview}</strong>
        </span>
        <span className="comm-status-chip">
          Forms approved: <strong>{counts.sectionApproved}</strong>
        </span>
        <span className="comm-status-chip">
          Forms needing correction: <strong>{counts.sectionCorrections}</strong>
        </span>
      </div>

      <PageSection
        title={tabTitle}
        description="Candidates complete Personal Information, Bank Details, and ID Card forms via secure links. Track status and completion percentage for each candidate."
        actions={
          <button type="button" onClick={() => void load()}>
            Refresh
          </button>
        }
      >
        <div className="toolbar toolbar-spaced">
          <Field label="Search">
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Name, email, reg ID"
              onKeyDown={(e) => e.key === "Enter" && void load()}
            />
          </Field>
          <button type="button" onClick={() => void load()}>
            Search
          </button>
        </div>

        {loading ? (
          <div className="loading-line" />
        ) : items.length === 0 ? (
          <EmptyState
            title="No candidates in this queue"
            description="Generate secure onboarding links for selected candidates to begin."
          />
        ) : (
          <div className="onboarding-list">
            {items.map((c) => (
              <article key={c.id} className={`onboarding-card ${expandedId === c.id ? "expanded" : ""}`}>
                <div className="onboarding-card-header">
                  <div>
                    <div className="cell-name">{c.fullName}</div>
                    <div className="cell-muted">
                      {c.registrationId} · {c.email}
                    </div>
                  </div>
                  <div className="onboarding-card-meta">
                    <span className="onboarding-percent-badge">{c.progress.completionPercent}% approved</span>
                    <Badge variant={sectionStatusToVariant(c.queueStatus)}>{formatStatusLabel(c.queueStatus)}</Badge>
                  </div>
                </div>

                <div className="onboarding-progress-bar-wrap">
                  <div className="onboarding-progress-labels">
                    <span>
                      Completion: <strong>{c.progress.completionPercent}%</strong> ({c.progress.approvedCount}/3
                      approved)
                    </span>
                    <span>
                      Submitted: <strong>{c.progress.submissionPercent}%</strong> ({c.progress.submittedCount}/3
                      forms)
                    </span>
                  </div>
                  <div className="onboarding-progress-bar">
                    <div
                      className="onboarding-progress-fill onboarding-progress-fill-submitted"
                      style={{ width: `${c.progress.submissionPercent}%` }}
                    />
                    <div
                      className="onboarding-progress-fill onboarding-progress-fill-approved"
                      style={{ width: `${c.progress.completionPercent}%` }}
                    />
                  </div>
                </div>

                <div className="comm-status-row">
                  {c.sections.map((s) => (
                    <span key={s.section} className="comm-status-chip">
                      {sectionLabel(s.section as "JOINING_FORM" | "ID_CARD")}:{" "}
                      <Badge variant={sectionStatusToVariant(s.status)}>{formatStatusLabel(s.status)}</Badge>
                    </span>
                  ))}
                </div>

                <div className="onboarding-card-actions">
                  {!c.hasLinks ? (
                    <button
                      type="button"
                      className="btn-secondary btn-sm"
                      disabled={generatingId === c.id}
                      onClick={() => void generateLinks(c.id)}
                    >
                      {generatingId === c.id ? "Generating…" : "Generate secure links"}
                    </button>
                  ) : (
                    <button type="button" className="btn-secondary btn-sm" onClick={() => void toggleExpand(c.id)}>
                      {expandedId === c.id ? "Close" : "Review & share links"}
                    </button>
                  )}
                  <Link href={`/candidates/${c.id}?tab=onboarding`} className="profile-link">
                    Profile →
                  </Link>
                </div>

                {expandedId === c.id && c.links ? (
                  <div className="onboarding-panel">
                    <div className="onboarding-links-box">
                      <h4 className="section-subtitle">Secure candidate links (no login required)</h4>
                      <ul className="onboarding-links-list">
                        <li>
                          <a href={c.links.hub} target="_blank" rel="noreferrer">
                            Onboarding hub
                          </a>
                        </li>
                        <li>
                          <a href={c.links.joiningForm} target="_blank" rel="noreferrer">
                            Joining Form
                          </a>
                        </li>
                        <li>
                          <a href={c.links.idCard} target="_blank" rel="noreferrer">
                            ID Card Form
                          </a>
                        </li>
                      </ul>
                    </div>
                    <OnboardingReviewPanel
                      candidateId={c.id}
                      sections={detailSections[c.id] ?? []}
                      submitting={false}
                      onReviewed={async () => {
                        await loadDetail(c.id);
                        await load();
                      }}
                    />
                  </div>
                ) : null}
              </article>
            ))}
          </div>
        )}
      </PageSection>
    </div>
  );
}

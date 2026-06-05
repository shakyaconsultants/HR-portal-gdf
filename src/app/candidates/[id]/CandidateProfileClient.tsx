"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { useToast } from "@/components/ToastProvider";
import { EmptyState } from "@/components/ui/EmptyState";
import { Field } from "@/components/ui/Field";
import { PageSection } from "@/components/ui/PageSection";
import { formatStatusLabel } from "@/lib/status-ui";
import { SALARY_SLABS } from "@/lib/constants";
import { HiringProfileSection } from "@/components/hiring/HiringProfileSection";
import { CommunicationProfileSection } from "@/components/communications/CommunicationProfileSection";
import { OnboardingProfileSection } from "@/components/onboarding/OnboardingProfileSection";
import { CandidateDataSection } from "@/components/candidates/CandidateDataSection";
import { CandidateStageControl } from "@/components/candidates/CandidateStageControl";
import { VerificationProfileSection } from "@/components/verification/VerificationProfileSection";
import { MockCallProfileSection } from "@/components/evaluations/MockCallProfileSection";
import { getFriendlyApiMessage, parseApiResponse } from "@/lib/client-api";

type Profile = {
  candidate: Record<string, unknown>;
  documents: Array<Record<string, unknown>>;
  evaluation: Record<string, unknown> | null;
  communications: Array<Record<string, unknown>>;
  onboarding: Record<string, unknown> | null;
  transfers: Array<Record<string, unknown>>;
  timeline: Array<Record<string, unknown>>;
};

const TABS = [
  { id: "overview", label: "Overview" },
  { id: "profile-data", label: "Profile Data" },
  { id: "documents", label: "Documents" },
  { id: "verification", label: "Verification" },
  { id: "training", label: "Training" },
  { id: "mockcall", label: "Mock Call" },
  { id: "communications", label: "Offer Letter" },
  { id: "onboarding", label: "Onboarding" },
  { id: "timeline", label: "Activity Timeline" },
] as const;

type Tab = (typeof TABS)[number]["id"];

const TAB_IDS = TABS.map((t) => t.id);

export function CandidateProfileClient({ candidateId }: { candidateId: string }) {
  const toast = useToast();
  const searchParams = useSearchParams();
  const tabParam = searchParams.get("tab");
  const initialTab: Tab = TAB_IDS.includes(tabParam as Tab) ? (tabParam as Tab) : "overview";
  const [profile, setProfile] = useState<Profile | null>(null);
  const [tab, setTab] = useState<Tab>(initialTab);
  const [batches, setBatches] = useState<Array<{ id: string; name: string }>>([]);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setNotFound(false);
    const res = await fetch(`/api/candidates/${candidateId}`, { cache: "no-store" });
    const json = await res.json();
    if (res.ok && json.ok) {
      setProfile(json.data as Profile);
    } else if (res.status === 404) {
      setProfile(null);
      setNotFound(true);
    } else {
      setProfile(null);
      toast.error("Unable to load candidate profile.");
    }
    setLoading(false);
  }, [candidateId, toast]);

  useEffect(() => {
    void fetch("/api/auth/me")
      .then((r) => r.json())
      .then((j) => setIsAdmin(j.data?.user?.role === "ADMIN"));
  }, []);

  useEffect(() => {
    void load();
    void fetch("/api/batches")
      .then((r) => r.json())
      .then((j) => setBatches((j.data?.items ?? []).map((b: { id: string; name: string }) => ({ id: b.id, name: b.name }))));
  }, [load]);

  if (loading) {
    return <div className="stack skeleton-stack"><div className="loading-line" /><div className="loading-line" /></div>;
  }

  if (notFound || !profile) {
    return (
      <EmptyState
        title="Candidate not found"
        description="This profile link may be outdated — for example, an employee record ID was used instead of the candidate ID. Open the candidate from the Candidates or Employees list."
        action={
          <Link href="/candidates" className="btn-secondary btn-sm">
            Back to Candidates
          </Link>
        }
      />
    );
  }

  const c = profile.candidate as {
    registrationId?: string;
    fullName: string;
    email: string;
    phone: string;
    status: string;
    verificationStage: string;
    finalScore: number | null;
    decision: string | null;
    salarySlab: string | null;
    proposedCtc: number | null;
    finalCtc: number | null;
    batchId: string | null;
    batch: { id: string; name: string; trainerName: string; startDate?: string; endDate?: string } | null;
  };

  async function saveSalary(formData: FormData) {
    const res = await fetch(`/api/candidates/${candidateId}`, {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        salarySlab: formData.get("salarySlab"),
        proposedCtc: formData.get("proposedCtc"),
        finalCtc: formData.get("finalCtc"),
        salaryRemarks: formData.get("salaryRemarks"),
      }),
    });
    if (res.ok) {
      toast.success("Salary details saved.");
      await load();
    } else toast.error("Unable to save salary.");
  }

  return (
    <div className="profile-layout">
      <div className="profile-top-bar">
        <Link href="/candidates" className="back-link">
          ← Back to Candidates
        </Link>
      </div>

      {isAdmin ? (
        <CandidateStageControl
          candidateId={candidateId}
          currentStage={c.status}
          onUpdated={load}
        />
      ) : null}

      <nav className="profile-tabs">
        {TABS.map((t) => (
          <button key={t.id} type="button" className={tab === t.id ? "active" : ""} onClick={() => setTab(t.id)}>
            {t.label}
          </button>
        ))}
      </nav>

      {tab === "overview" && (
        <div className="grid grid-3">
          <div className="stat-tile accent-indigo">
            <span className="stat-tile-label">Verification</span>
            <span className="stat-tile-value" style={{ fontSize: "1rem" }}>
              {formatStatusLabel(c.verificationStage)}
            </span>
          </div>
          <div className="stat-tile accent-amber">
            <span className="stat-tile-label">Mock call score</span>
            <span className="stat-tile-value">{c.finalScore ?? "—"}/100</span>
          </div>
          <div className="stat-tile accent-emerald">
            <span className="stat-tile-label">Hiring decision</span>
            <span className="stat-tile-value" style={{ fontSize: "1rem" }}>
              {c.decision ? formatStatusLabel(c.decision) : "Pending"}
            </span>
          </div>
          <div className="stat-tile accent-indigo">
            <span className="stat-tile-label">Training batch</span>
            <span className="stat-tile-value" style={{ fontSize: "1rem" }}>
              {c.batch ? c.batch.name : "Unassigned"}
            </span>
          </div>
          <PageSection title="Salary slab" description="CTC and slab for offer preparation." className="span-3">
            <form
              className="grid grid-3"
              onSubmit={(e) => {
                e.preventDefault();
                void saveSalary(new FormData(e.currentTarget));
              }}
            >
              <Field label="Slab">
                <select name="salarySlab" defaultValue={c.salarySlab ?? ""}>
                  <option value="">Select</option>
                  {SALARY_SLABS.map((s) => (
                    <option key={s} value={s}>
                      {s}
                    </option>
                  ))}
                </select>
              </Field>
              <Field label="Proposed CTC">
                <input name="proposedCtc" type="number" defaultValue={c.proposedCtc ?? ""} />
              </Field>
              <Field label="Final CTC">
                <input name="finalCtc" type="number" defaultValue={c.finalCtc ?? ""} />
              </Field>
              <Field label="Remarks" className="span-2">
                <input name="salaryRemarks" defaultValue={String(profile.candidate.salaryRemarks ?? "")} />
              </Field>
              <button type="submit">Save salary</button>
            </form>
          </PageSection>
        </div>
      )}

      {tab === "profile-data" && <CandidateDataSection candidate={profile.candidate} />}

      {tab === "documents" && (
        <PageSection title="Uploaded documents" description="Files submitted during registration.">
          {profile.documents.length === 0 ? (
            <p className="muted">No documents uploaded.</p>
          ) : (
            <div className="data-table-wrap">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Type</th>
                    <th>File</th>
                    <th>Uploaded</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {profile.documents.map((d) => (
                    <tr key={String(d.id)}>
                      <td>{formatStatusLabel(String(d.documentType))}</td>
                      <td>{String(d.fileName)}</td>
                      <td>{new Date(String(d.createdAt)).toLocaleString()}</td>
                      <td>
                        <a href={String(d.filePath)} target="_blank" rel="noreferrer" className="profile-link">
                          View
                        </a>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </PageSection>
      )}

      {tab === "verification" && (
        <VerificationProfileSection
          candidateId={candidateId}
          verificationStage={c.verificationStage}
          status={c.status}
          onUpdated={load}
        />
      )}

      {tab === "training" && (
        <PageSection title="Training & batch" description="Assign or transfer between batches. Changes appear on the timeline.">
          <dl className="detail-grid">
            <div>
              <dt>Current batch</dt>
              <dd>{c.batch ? `${c.batch.name} (${c.batch.trainerName})` : "Not assigned"}</dd>
            </div>
            <div>
              <dt>Training status</dt>
              <dd>{formatStatusLabel(String(profile.candidate.trainingStatus ?? "NOT_STARTED"))}</dd>
            </div>
          </dl>

          {!c.batchId && (
            <form
              className="batch-action-form"
              onSubmit={async (e) => {
                e.preventDefault();
                const fd = new FormData(e.currentTarget);
                const res = await fetch("/api/batches/assign", {
                  method: "POST",
                  headers: { "content-type": "application/json" },
                  body: JSON.stringify({ candidateId, batchId: fd.get("batchId") }),
                });
                const json = await parseApiResponse(res);
                if (res.ok && json.ok) {
                  toast.success("Assigned to batch.");
                  await load();
                } else toast.error(getFriendlyApiMessage(json, "Assign failed."));
              }}
            >
              <Field label="Assign to batch">
                <select name="batchId" required>
                  <option value="">Select batch</option>
                  {batches.map((b) => (
                    <option key={b.id} value={b.id}>
                      {b.name}
                    </option>
                  ))}
                </select>
              </Field>
              <button type="submit">Assign batch</button>
            </form>
          )}

          {c.batchId && (
            <form
              className="batch-action-form grid grid-3"
              onSubmit={async (e) => {
                e.preventDefault();
                const fd = new FormData(e.currentTarget);
                const res = await fetch("/api/batches/transfer", {
                  method: "POST",
                  headers: { "content-type": "application/json" },
                  body: JSON.stringify({
                    candidateId,
                    fromBatchId: c.batchId,
                    toBatchId: fd.get("toBatchId"),
                    reason: fd.get("reason"),
                  }),
                });
                const json = await parseApiResponse(res);
                if (res.ok && json.ok) {
                  toast.success("Transferred to new batch.");
                  await load();
                } else toast.error(getFriendlyApiMessage(json, "Transfer failed."));
              }}
            >
              <Field label="Transfer to batch">
                <select name="toBatchId" required>
                  <option value="">Select destination batch</option>
                  {batches
                    .filter((b) => b.id !== c.batchId)
                    .map((b) => (
                      <option key={b.id} value={b.id}>
                        {b.name}
                      </option>
                    ))}
                </select>
              </Field>
              <Field label="Reason" className="span-2">
                <input name="reason" placeholder="Why is this candidate moving batches?" required minLength={3} />
              </Field>
              <button type="submit">Transfer batch</button>
            </form>
          )}
        </PageSection>
      )}

      {tab === "mockcall" && (
        <>
        <HiringProfileSection
          candidateId={candidateId}
          fullName={c.fullName}
          finalScore={c.finalScore}
          decision={c.decision}
          decisionRemarks={String(profile.candidate.decisionRemarks ?? "")}
          evaluationStatus={String(profile.candidate.evaluationStatus ?? "NOT_EVALUATED")}
          onUpdated={load}
        />
        <MockCallProfileSection
          candidateId={candidateId}
          candidateName={c.fullName}
          evaluationStatus={String(profile.candidate.evaluationStatus ?? "NOT_EVALUATED")}
          evaluation={profile.evaluation}
          onUpdated={load}
        />
        </>
      )}

      {tab === "communications" && (
        <>
          <CommunicationProfileSection
            candidateId={candidateId}
            fullName={c.fullName}
            email={c.email}
            decision={c.decision}
            onUpdated={load}
          />
        </>
      )}

      {tab === "onboarding" && (
        <OnboardingProfileSection
          candidateId={candidateId}
          lifecycleStage={String((profile.candidate as { lifecycleStage?: string }).lifecycleStage ?? c.status)}
          decision={c.decision}
          onUpdated={load}
          profileIdCard={{
            pdfPath: String(profile.candidate.idCardPdfPath ?? ""),
            fileName: String(profile.candidate.idCardPdfFileName ?? ""),
            generatedAt: (profile.candidate.idCardGeneratedAt as string | null) ?? null,
            emailStatus: String(profile.candidate.idCardEmailStatus ?? "") || undefined,
            emailSentAt: (profile.candidate.idCardEmailSentAt as string | null) ?? null,
          }}
          onboarding={
            profile.onboarding
              ? {
                  status: String(profile.onboarding.status ?? "PENDING"),
                  progress: {
                    completionPercent: Number(
                      (profile.onboarding.progress as { completionPercent?: number })?.completionPercent ?? 0
                    ),
                    filledFields: Number(
                      (profile.onboarding.progress as { filledFields?: number })?.filledFields ?? 0
                    ),
                    totalFields: Number(
                      (profile.onboarding.progress as { totalFields?: number })?.totalFields ?? 2
                    ),
                  },
                  tokenExpiresAt: (profile.onboarding.tokenExpiresAt as string | null) ?? null,
                  tokenExpired: Boolean(profile.onboarding.tokenExpired),
                  sections: (
                    (profile.onboarding.sections as Array<{
                      section: string;
                      label: string;
                      fillStatus: string;
                      submittedAt?: string | null;
                    }>) ?? []
                  ).map((s) => ({
                    section: s.section,
                    label: s.label,
                    fillStatus: s.fillStatus === "FILLED" ? ("FILLED" as const) : ("NOT_FILLED" as const),
                    submittedAt: s.submittedAt,
                  })),
                }
              : null
          }
        />
      )}

      {tab === "timeline" && (
        <PageSection title="Activity Timeline" description="Complete lifecycle history — interviews, LOI, registration, verification, and HR actions.">
          {profile.transfers.length > 0 && (
            <>
              <h3 className="section-subtitle">Batch transfer history</h3>
              <ul className="timeline-list transfer-history">
                {profile.transfers.map((t) => (
                  <li key={String(t.id)}>
                    <span className="timeline-date">{new Date(String(t.createdAt)).toLocaleString()}</span>
                    <strong>
                      {String(t.fromBatchName ?? "Batch")} → {String(t.toBatchName ?? "Batch")}
                    </strong>
                    <p>{String(t.reason)}</p>
                  </li>
                ))}
              </ul>
            </>
          )}
          <h3 className="section-subtitle">All activity</h3>
          <ul className="timeline-list">
            {profile.timeline.map((t) => (
              <li key={String(t.id)}>
                <span className="timeline-date">{new Date(String(t.createdAt)).toLocaleString()}</span>
                <strong>{formatStatusLabel(String(t.action))}</strong>
                <p>{String(t.remarks)}</p>
                <span className="muted">
                  {String(t.actorName)} ({String(t.actorRole)})
                </span>
              </li>
            ))}
          </ul>
        </PageSection>
      )}
    </div>
  );
}

"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { EditLeadModal } from "@/components/leads/EditLeadModal";
import { ScheduleInterviewModal } from "@/components/leads/ScheduleInterviewModal";
import { SendLoiModal } from "@/components/leads/SendLoiModal";
import { useToast } from "@/components/ToastProvider";
import { Badge } from "@/components/ui/Badge";
import { PageSection } from "@/components/ui/PageSection";
import { formatStatusLabel, deliveryToVariant } from "@/lib/status-ui";
import { getFriendlyApiMessage } from "@/lib/client-api";

type LeadProfile = {
  id: string;
  fullName: string;
  email: string;
  phone: string;
  leadStatus: string;
  leadStatusLabel: string;
  referenceSourceLabel: string;
  referenceName: string;
  remarks: string;
  candidateId: string | null;
  convertedAt: string | null;
  isConverted: boolean;
  resume: { fileName: string; filePath: string } | null;
  interviews: Array<{
    id: string;
    interviewDate: string;
    interviewTime: string;
    interviewer: string;
    modeLabel: string;
    status: string;
    outcome: string | null;
    outcomeRemarks: string;
  }>;
  letterOfIntent: {
    referenceNumber: string;
    sentAt: string;
    sentByName: string;
    emailStatus: string;
  } | null;
  communications: Array<{
    id: string;
    type: string;
    subject: string;
    status: string;
    sentAt: string | null;
    createdAt: string;
  }>;
  createdAt: string;
  updatedAt: string;
};

function leadStatusVariant(status: string) {
  if (status === "SELECTED" || status === "AWAITING_REGISTRATION") return "success" as const;
  if (status === "REJECTED") return "danger" as const;
  if (status === "HOLD") return "warning" as const;
  if (status === "INTERVIEW_SCHEDULED" || status === "LOI_SENT") return "info" as const;
  return "neutral" as const;
}

export function LeadProfileClient({ leadId }: { leadId: string }) {
  const router = useRouter();
  const toast = useToast();
  const [profile, setProfile] = useState<LeadProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [editOpen, setEditOpen] = useState(false);
  const [scheduleOpen, setScheduleOpen] = useState(false);
  const [loiOpen, setLoiOpen] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    const res = await fetch(`/api/leads/${leadId}`, { cache: "no-store" });
    const json = await res.json();
    if (res.ok && json.ok) {
      setProfile(json.data as LeadProfile);
    } else {
      toast.error(getFriendlyApiMessage(json, "Unable to load lead profile."));
    }
    setLoading(false);
  }, [leadId, toast]);

  useEffect(() => {
    void load();
  }, [load]);

  if (loading || !profile) {
    return (
      <div className="stack skeleton-stack">
        <div className="loading-line" />
        <div className="loading-line" />
      </div>
    );
  }

  const initials = profile.fullName
    .split(" ")
    .map((p) => p[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  const canScheduleInterview = profile.leadStatus === "NEW_LEAD" && !profile.isConverted;
  const canSendLoi = profile.leadStatus === "SELECTED" && !profile.isConverted;

  return (
    <div className="stack-lg lead-profile">
      <header className="profile-hero glass-card">
        <div className="profile-hero-main">
          <div className="candidate-avatar profile-avatar-lg">{initials}</div>
          <div>
            <h1 className="profile-name">{profile.fullName}</h1>
            <p className="profile-sub muted">
              {profile.email} · {profile.phone}
            </p>
            <div className="profile-badges">
              <Badge variant={leadStatusVariant(profile.leadStatus)}>{profile.leadStatusLabel}</Badge>
              <Badge variant="neutral">{profile.referenceSourceLabel}</Badge>
            </div>
          </div>
        </div>
        <div className="profile-hero-actions">
          {canScheduleInterview ? (
            <button type="button" className="btn-sm" onClick={() => setScheduleOpen(true)}>
              Schedule Interview
            </button>
          ) : null}
          {canSendLoi ? (
            <button type="button" className="btn-sm" onClick={() => setLoiOpen(true)}>
              Send LOI Email
            </button>
          ) : null}
          {!profile.isConverted ? (
            <button type="button" className="btn-secondary btn-sm" onClick={() => setEditOpen(true)}>
              Edit Details
            </button>
          ) : null}
          {profile.candidateId ? (
            <Link href={`/candidates/${profile.candidateId}`} className="btn-secondary btn-sm">
              View Candidate →
            </Link>
          ) : null}
          <button type="button" className="btn-ghost btn-sm" onClick={() => router.push("/leads")}>
            Back to Leads
          </button>
        </div>
      </header>

      <div className="profile-grid">
        <PageSection title="Lead Details" description="Contact, source, and internal remarks.">
          <dl className="detail-list">
            <div>
              <dt>Source</dt>
              <dd>{profile.referenceSourceLabel}</dd>
            </div>
            <div>
              <dt>Reference</dt>
              <dd>{profile.referenceName || "—"}</dd>
            </div>
            <div>
              <dt>Resume</dt>
              <dd>
                {profile.resume ? (
                  <a href={profile.resume.filePath} target="_blank" rel="noreferrer" className="text-link">
                    {profile.resume.fileName} ↗
                  </a>
                ) : (
                  <span className="muted">No resume uploaded</span>
                )}
              </dd>
            </div>
            <div>
              <dt>Remarks</dt>
              <dd>{profile.remarks || "—"}</dd>
            </div>
          </dl>
        </PageSection>

        <PageSection title="Recruitment Status">
          <dl className="detail-list">
            <div>
              <dt>Status</dt>
              <dd>
                <Badge variant={leadStatusVariant(profile.leadStatus)}>{profile.leadStatusLabel}</Badge>
              </dd>
            </div>
            <div>
              <dt>Created</dt>
              <dd>{new Date(profile.createdAt).toLocaleString()}</dd>
            </div>
            <div>
              <dt>Last updated</dt>
              <dd>{new Date(profile.updatedAt).toLocaleString()}</dd>
            </div>
            {profile.convertedAt ? (
              <div>
                <dt>Converted to candidate</dt>
                <dd>{new Date(profile.convertedAt).toLocaleString()}</dd>
              </div>
            ) : null}
          </dl>
        </PageSection>
      </div>

      <PageSection title="Interview History" description="Scheduled and completed interviews for this lead.">
        {profile.interviews.length === 0 ? (
          <p className="muted">No interviews scheduled yet.</p>
        ) : (
          <div className="data-table-wrap">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Date & time</th>
                  <th>Interviewer</th>
                  <th>Mode</th>
                  <th>Status</th>
                  <th>Outcome</th>
                </tr>
              </thead>
              <tbody>
                {profile.interviews.map((row) => (
                  <tr key={row.id}>
                    <td>
                      {new Date(row.interviewDate).toLocaleDateString()}
                      <div className="cell-muted">{row.interviewTime}</div>
                    </td>
                    <td>{row.interviewer}</td>
                    <td>{row.modeLabel}</td>
                    <td>{row.status}</td>
                    <td>
                      {row.outcome ? (
                        <>
                          <Badge variant={leadStatusVariant(row.outcome)}>{row.outcome}</Badge>
                          {row.outcomeRemarks ? (
                            <div className="cell-muted">{row.outcomeRemarks}</div>
                          ) : null}
                        </>
                      ) : (
                        "—"
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </PageSection>

      {profile.letterOfIntent ? (
        <PageSection title="Letter of Intent">
          <dl className="detail-list">
            <div>
              <dt>Reference</dt>
              <dd>{profile.letterOfIntent.referenceNumber}</dd>
            </div>
            <div>
              <dt>Sent at</dt>
              <dd>{new Date(profile.letterOfIntent.sentAt).toLocaleString()}</dd>
            </div>
            <div>
              <dt>Sent by</dt>
              <dd>{profile.letterOfIntent.sentByName}</dd>
            </div>
            <div>
              <dt>Email status</dt>
              <dd>
                <Badge variant={deliveryToVariant(profile.letterOfIntent.emailStatus)}>
                  {formatStatusLabel(profile.letterOfIntent.emailStatus)}
                </Badge>
              </dd>
            </div>
          </dl>
        </PageSection>
      ) : null}

      <PageSection title="Email Communications">
        {profile.communications.length === 0 ? (
          <p className="muted">No emails sent yet.</p>
        ) : (
          <div className="data-table-wrap">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Type</th>
                  <th>Subject</th>
                  <th>Status</th>
                  <th>Sent</th>
                </tr>
              </thead>
              <tbody>
                {profile.communications.map((log) => (
                  <tr key={log.id}>
                    <td>{formatStatusLabel(log.type)}</td>
                    <td>{log.subject}</td>
                    <td>
                      <Badge variant={deliveryToVariant(log.status)}>{formatStatusLabel(log.status)}</Badge>
                    </td>
                    <td className="cell-muted">
                      {log.sentAt ? new Date(log.sentAt).toLocaleString() : new Date(log.createdAt).toLocaleString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </PageSection>

      <EditLeadModal
        open={editOpen}
        onClose={() => setEditOpen(false)}
        leadId={leadId}
        initialReferenceName={profile.referenceName}
        initialRemarks={profile.remarks}
        onSaved={() => void load()}
      />

      <ScheduleInterviewModal
        open={scheduleOpen}
        onClose={() => setScheduleOpen(false)}
        initialLeadId={leadId}
        onScheduled={() => void load()}
      />

      <SendLoiModal
        open={loiOpen}
        onClose={() => setLoiOpen(false)}
        leadId={leadId}
        leadName={profile.fullName}
        leadEmail={profile.email}
        onSent={() => void load()}
      />
    </div>
  );
}

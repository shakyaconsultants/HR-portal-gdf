"use client";

import { useEffect, useState } from "react";
import { Badge } from "@/components/ui/Badge";
import { PageSection } from "@/components/ui/PageSection";
import { IdCardGenerationSection } from "@/components/onboarding/IdCardGenerationSection";
import { formatStatusLabel, sectionStatusToVariant } from "@/lib/status-ui";

type FormStatus = {
  section: string;
  label: string;
  fillStatus: "FILLED" | "NOT_FILLED";
  submittedAt?: string | null;
};

type OnboardingSummary = {
  status: string;
  progress: { completionPercent: number; filledFields: number; totalFields: number };
  tokenExpiresAt: string | null;
  tokenExpired: boolean;
  sections: FormStatus[];
};

type ProfileIdCardSnapshot = {
  pdfPath?: string;
  fileName?: string;
  generatedAt?: string | null;
  emailStatus?: string | null;
  emailSentAt?: string | null;
};

export function OnboardingProfileSection({
  candidateId,
  lifecycleStage,
  decision,
  onboarding,
  profileIdCard,
  onUpdated,
}: {
  candidateId: string;
  lifecycleStage: string;
  decision: string | null;
  onboarding: OnboardingSummary | null;
  profileIdCard?: ProfileIdCardSnapshot;
  onUpdated?: () => Promise<void>;
}) {
  const [detail, setDetail] = useState<OnboardingSummary | null>(onboarding);

  useEffect(() => {
    if (decision !== "SELECTED") return;
    void fetch(`/api/onboarding/${candidateId}`, { cache: "no-store" })
      .then((r) => r.json())
      .then((json) => {
        if (json.ok) {
          setDetail({
            status: json.data.onboarding?.status ?? "PENDING",
            progress: json.data.progress ?? { completionPercent: 0, filledFields: 0, totalFields: 2 },
            tokenExpiresAt: json.data.onboarding?.tokenExpiresAt ?? null,
            tokenExpired: json.data.onboarding?.tokenExpired ?? false,
            sections: (json.data.sections ?? []).map(
              (s: { section: string; label: string; fillStatus: string; submittedAt?: string | null }) => ({
                section: s.section,
                label: s.label,
                fillStatus: s.fillStatus === "FILLED" ? "FILLED" : "NOT_FILLED",
                submittedAt: s.submittedAt,
              })
            ),
          });
        }
      });
  }, [candidateId, decision, onboarding]);

  if (decision !== "SELECTED") {
    return (
      <PageSection title="Onboarding forms" description="Track whether joining and ID card forms are completed.">
        <p className="muted">Candidate must be marked Selected before onboarding forms apply.</p>
      </PageSection>
    );
  }

  const data = detail ?? onboarding;

  return (
    <PageSection
      title="Onboarding forms"
      description="Onboarding links are sent with the offer letter email and PDF. Forms expire 3 days after the offer is sent."
    >
      {!data ? (
        <>
          <p className="muted">No onboarding record yet — links are created when the offer letter is sent.</p>
          <IdCardGenerationSection
            candidateId={candidateId}
            formsReady={false}
            lifecycleStage={lifecycleStage}
            profileIdCard={profileIdCard}
            onUpdated={onUpdated}
          />
        </>
      ) : (
        <>
          <div className="onboarding-progress-bar-wrap">
            <div className="onboarding-progress-labels">
              <span>
                Forms completed: <strong>{data.progress.filledFields}/{data.progress.totalFields}</strong> (
                {data.progress.completionPercent}%)
              </span>
              <Badge variant={data.status === "COMPLETED" ? "success" : "info"}>
                {formatStatusLabel(data.status)}
              </Badge>
            </div>
            <div className="onboarding-progress-bar">
              <div className="onboarding-progress-fill" style={{ width: `${data.progress.completionPercent}%` }} />
            </div>
          </div>

          {data.tokenExpiresAt ? (
            <p className="muted" style={{ marginBottom: "1rem" }}>
              Form links expire on <strong>{data.tokenExpiresAt}</strong>
              {data.tokenExpired ? (
                <>
                  {" "}
                  <Badge variant="danger">Expired</Badge>
                </>
              ) : null}
              . Resend the offer letter to issue fresh links.
            </p>
          ) : null}

          <div className="onboarding-section-status-row">
            {data.sections.map((s) => (
              <div key={s.section} className="comm-action-card" style={{ minWidth: "12rem" }}>
                <strong>{s.label}</strong>
                <p style={{ margin: "0.5rem 0" }}>
                  <Badge variant={sectionStatusToVariant(s.fillStatus)}>{formatStatusLabel(s.fillStatus)}</Badge>
                </p>
                {s.submittedAt ? (
                  <p className="muted comm-action-meta">Submitted {new Date(s.submittedAt).toLocaleString()}</p>
                ) : (
                  <p className="muted comm-action-meta">Awaiting candidate submission</p>
                )}
              </div>
            ))}
          </div>

          <p className="muted" style={{ marginTop: "1rem" }}>
            Full candidate data is available in the <strong>Profile Data</strong> tab.
          </p>

          <IdCardGenerationSection
            candidateId={candidateId}
            formsReady={data.sections.every((s) => s.fillStatus === "FILLED")}
            lifecycleStage={lifecycleStage}
            profileIdCard={profileIdCard}
            onUpdated={onUpdated}
          />
        </>
      )}
    </PageSection>
  );
}

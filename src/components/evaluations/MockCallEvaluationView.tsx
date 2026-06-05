import Link from "next/link";
import { MOCK_CALL_CRITERIA, MOCK_CALL_TOTAL_MAX } from "@/lib/mock-call";
import { formatStatusLabel } from "@/lib/status-ui";

type EvaluationData = {
  communicationSkills: number;
  confidenceLevel: number;
  productUnderstanding: number;
  salesPitch: number;
  objectionHandling: number;
  finalScore: number;
  remarks: string;
  evaluatorName: string;
  evaluatedAt: string;
};

export function MockCallEvaluationView({
  evaluation,
  showHiringLink = true,
}: {
  evaluation: EvaluationData;
  showHiringLink?: boolean;
}) {
  return (
    <div className="mock-eval-view">
      <div className="mock-eval-total evaluated">
        <span>Final score</span>
        <strong>
          {evaluation.finalScore} / {MOCK_CALL_TOTAL_MAX}
        </strong>
      </div>

      <div className="mock-eval-breakdown">
        {MOCK_CALL_CRITERIA.map((criterion) => {
          const score = Number(evaluation[criterion.key as keyof EvaluationData] ?? 0);
          const pct = Math.round((score / criterion.max) * 100);
          return (
            <div key={criterion.key} className="mock-eval-breakdown-row">
              <div className="mock-eval-breakdown-head">
                <span>{criterion.label}</span>
                <strong>
                  {score}/{criterion.max}
                </strong>
              </div>
              <div className="mock-eval-score-bar" aria-hidden>
                <span className="mock-eval-score-bar-fill" style={{ width: `${pct}%` }} />
              </div>
            </div>
          );
        })}
      </div>

      <dl className="detail-grid">
        <div>
          <dt>Evaluator name</dt>
          <dd>{evaluation.evaluatorName}</dd>
        </div>
        <div>
          <dt>Evaluation date</dt>
          <dd>{new Date(evaluation.evaluatedAt).toLocaleDateString()}</dd>
        </div>
        <div>
          <dt>Status</dt>
          <dd>{formatStatusLabel("EVALUATED")}</dd>
        </div>
        <div className="span-3">
          <dt>Remarks</dt>
          <dd>{evaluation.remarks || "—"}</dd>
        </div>
      </dl>

      {showHiringLink ? (
        <p className="mock-eval-hiring-note">
          Eligible for{" "}
          <Link href="/hiring-decisions" className="profile-link">
            Hiring Decision →
          </Link>
        </p>
      ) : null}
    </div>
  );
}

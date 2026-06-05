"use client";

import Link from "next/link";

export type PipelineStageStat = {
  id: string;
  label: string;
  count: number;
  color: string;
  href?: string;
};

export function PipelineProgress({
  stages,
  showConversion,
}: {
  stages: PipelineStageStat[];
  showConversion?: boolean;
}) {
  const max = Math.max(...stages.map((s) => s.count), 1);
  const total = stages.reduce((sum, s) => sum + s.count, 0);

  if (total === 0) {
    return (
      <div className="pipeline-empty">
        <p className="pipeline-empty-title">No pipeline data yet</p>
        <p className="pipeline-empty-desc">Start adding candidates to see your hiring funnel.</p>
        <Link href="/candidates?add=1" className="btn-sm">
          + Add Candidate
        </Link>
      </div>
    );
  }

  return (
    <div className="pipeline-progress">
      {stages.map((stage, i) => {
        const prev = i > 0 ? stages[i - 1].count : null;
        const conversion =
          showConversion && prev != null && prev > 0 ? Math.round((stage.count / prev) * 100) : null;
        const width = Math.max((stage.count / max) * 100, stage.count > 0 ? 8 : 0);

        const inner = (
          <>
            <div className="pipeline-progress-meta">
              <span className="pipeline-progress-label">{stage.label}</span>
              <span className="pipeline-progress-count">{stage.count}</span>
            </div>
            <div className="pipeline-progress-track">
              <div
                className="pipeline-progress-fill"
                style={{ width: `${width}%`, background: stage.color }}
              />
            </div>
            {conversion != null ? (
              <span className="pipeline-progress-conv">{conversion}% from prev</span>
            ) : null}
          </>
        );

        return stage.href ? (
          <Link key={stage.id} href={stage.href} className="pipeline-progress-item pipeline-progress-link">
            {inner}
          </Link>
        ) : (
          <div key={stage.id} className="pipeline-progress-item">
            {inner}
          </div>
        );
      })}
    </div>
  );
}

import Link from "next/link";
import {
  HR_WORKFLOW_METRICS,
  type FunnelConversion,
  type WorkflowMetricKey,
} from "@/lib/dashboard-workflow";

export type HrWorkflowStats = {
  workflow: Record<WorkflowMetricKey, number>;
  funnelConversions: FunnelConversion[];
};

export function HrWorkflowDashboard({ stats }: { stats: HrWorkflowStats }) {
  const { workflow, funnelConversions } = stats;
  const conversionByPair = new Map(
    funnelConversions.map((c) => [`${c.from}->${c.to}`, c] as const)
  );

  const linearMetrics = HR_WORKFLOW_METRICS.filter((m) => !m.branch);
  const branchMetrics = HR_WORKFLOW_METRICS.filter((m) => m.branch);

  return (
    <div className="stack-lg">
      <div>
        <p className="stat-section-label">HR workflow funnel</p>
        <p className="muted hr-workflow-intro">
          Snapshot counts show candidates at each stage now. Conversion rates use cumulative reach — how many
          progressed to the next step relative to the prior step.
        </p>
      </div>

      <div className="hr-workflow-funnel">
        {linearMetrics.map((metric, index) => {
          const next = linearMetrics[index + 1];
          const conversion = next ? conversionByPair.get(`${metric.key}->${next.key}`) : null;

          return (
            <div key={metric.key} className="hr-workflow-funnel-step">
              <Link href={metric.href} className={`stat-tile hr-workflow-card ${metric.accent}`}>
                <span className="stat-tile-label">{metric.label}</span>
                <span className="stat-tile-value">{workflow[metric.key]}</span>
              </Link>
              {conversion ? (
                <div className="hr-workflow-conversion" title={`${conversion.fromLabel} → ${conversion.toLabel}`}>
                  <span className="hr-workflow-conversion-rate">
                    {conversion.rate === null ? "—" : `${conversion.rate}%`}
                  </span>
                  <span className="hr-workflow-conversion-arrow" aria-hidden>
                    →
                  </span>
                </div>
              ) : null}
            </div>
          );
        })}
      </div>

      {branchMetrics.length > 0 ? (
        <div>
          <p className="stat-section-label">Hiring outcomes</p>
          <div className="stats-grid stats-grid-2">
            {branchMetrics.map((metric) => (
              <Link key={metric.key} href={metric.href} className={`stat-tile ${metric.accent}`}>
                <span className="stat-tile-label">{metric.label}</span>
                <span className="stat-tile-value">{workflow[metric.key]}</span>
              </Link>
            ))}
          </div>
        </div>
      ) : null}

      <div>
        <p className="stat-section-label">Stage conversion detail</p>
        <div className="hr-conversion-table-wrap">
          <table className="data-table hr-conversion-table">
            <thead>
              <tr>
                <th>From</th>
                <th>To</th>
                <th>Reached prior</th>
                <th>Reached next</th>
                <th>Conversion</th>
              </tr>
            </thead>
            <tbody>
              {funnelConversions.map((row) => (
                <tr key={`${row.from}-${row.to}`}>
                  <td>{row.fromLabel}</td>
                  <td>{row.toLabel}</td>
                  <td>{row.fromCount}</td>
                  <td>{row.toCount}</td>
                  <td>
                    <strong>{row.rate === null ? "—" : `${row.rate}%`}</strong>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

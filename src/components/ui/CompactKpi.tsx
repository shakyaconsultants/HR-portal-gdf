export function CompactKpi({
  label,
  value,
  trend,
  trendUp,
}: {
  label: string;
  value: number | string;
  trend?: string;
  trendUp?: boolean;
}) {
  return (
    <article className="kpi-compact">
      <span className="kpi-compact-label">{label}</span>
      <span className="kpi-compact-value">{value}</span>
      {trend ? (
        <span className={`kpi-compact-trend ${trendUp ? "up" : trendUp === false ? "down" : ""}`}>
          {trend}
        </span>
      ) : null}
    </article>
  );
}

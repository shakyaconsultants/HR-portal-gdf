"use client";

import Link from "next/link";
import { LIFECYCLE_PIPELINE } from "@/lib/lifecycle";

export function LifecycleStageCards({ counts }: { counts: Record<string, number> }) {
  return (
    <div className="stats-grid lifecycle-stage-grid">
      {LIFECYCLE_PIPELINE.map((stage) => (
        <Link key={stage.slug} href={stage.href} className="stat-tile accent-indigo">
          <span className="stat-tile-label">
            <span className="nav-step">{stage.order}</span> {stage.label}
          </span>
          <span className="stat-tile-value">{counts[stage.stage] ?? 0}</span>
        </Link>
      ))}
    </div>
  );
}

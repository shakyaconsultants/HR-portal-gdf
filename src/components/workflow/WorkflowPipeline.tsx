"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LIFECYCLE_PIPELINE } from "@/lib/lifecycle";

function isStageActive(pathname: string, href: string) {
  const base = href.split("?")[0];
  return pathname === base || pathname.startsWith(`${base}/`);
}

export function WorkflowPipeline() {
  const pathname = usePathname();

  return (
    <div className="workflow-pipeline lifecycle-pipeline" aria-label="Candidate lifecycle stages">
      {LIFECYCLE_PIPELINE.map((step, index) => {
        const active = isStageActive(pathname, step.href);
        return (
          <span key={step.slug} className="workflow-pipeline-item">
            {index > 0 && <span className="workflow-pipeline-arrow">→</span>}
            <Link href={step.href} className={active ? "active" : ""} title={step.label}>
              <span className="workflow-pipeline-step">{step.order}</span>
              {step.shortLabel}
            </Link>
          </span>
        );
      })}
    </div>
  );
}

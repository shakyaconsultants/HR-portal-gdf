"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { WorkflowPipeline } from "@/components/workflow/WorkflowPipeline";
import { PageSection } from "@/components/ui/PageSection";
import { Badge } from "@/components/ui/Badge";
import { formatStatusLabel, statusToVariant } from "@/lib/status-ui";
import { LIFECYCLE_PIPELINE, getLifecycleMeta } from "@/lib/lifecycle";

type QueueItem = {
  id: string;
  registrationId?: string;
  fullName: string;
  lifecycleStage: string;
  status: string;
};

const QUEUE_CONFIG = [
  { stage: "LEAD", href: "/leads" },
  { stage: "REGISTRATION_SUBMITTED", href: "/registrations" },
  { stage: "VERIFICATION", href: "/verification" },
  { stage: "BATCH_ASSIGNMENT", href: "/batches?tab=assignment" },
  { stage: "FINAL_MOCK_CALL", href: "/evaluations" },
  { stage: "HIRING_DECISION", href: "/hiring-decisions" },
  { stage: "OFFER_LETTER", href: "/communications?tab=offer" },
  { stage: "JOINING_INSTRUCTIONS", href: "/communications?tab=joining" },
] as const;

function QueueCard({ title, href, items }: { title: string; href: string; items: QueueItem[] }) {
  return (
    <div className="queue-card">
      <h3>
        <Link href={href}>{title}</Link> <span className="queue-count">{items.length}</span>
      </h3>
      {items.length === 0 ? (
        <p className="muted">Nothing pending</p>
      ) : (
        <ul>
          {items.map((item) => (
            <li key={item.id}>
              <Link href={`/candidates/${item.id}`}>
                <strong>{item.fullName}</strong>
                <span>
                  {item.registrationId ?? "—"} · {formatStatusLabel(item.lifecycleStage)}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export function DashboardClient() {
  const [queues, setQueues] = useState<Record<string, QueueItem[]> | null>(null);
  const [recent, setRecent] = useState<QueueItem[]>([]);

  useEffect(() => {
    void fetch("/api/dashboard/queues", { cache: "no-store" })
      .then((r) => r.json())
      .then((j) => {
        setQueues(j.data?.queues ?? null);
        setRecent(j.data?.recentCandidates ?? []);
      });
  }, []);

  if (!queues) {
    return <div className="loading-line" />;
  }

  return (
    <div className="stack-lg">
      <WorkflowPipeline />

      <PageSection
        title="Lifecycle queues"
        description="Each queue maps to a lifecycle stage. Open the stage page or jump into a candidate profile."
      >
        <div className="queues-grid">
          {QUEUE_CONFIG.map(({ stage, href }) => (
            <QueueCard
              key={stage}
              title={getLifecycleMeta(stage).label}
              href={href}
              items={queues[stage] ?? []}
            />
          ))}
        </div>
      </PageSection>

      <PageSection title="Latest candidates" description="Newest records across all lifecycle stages.">
        <div className="data-table-wrap">
          <table className="data-table">
            <thead>
              <tr>
                <th>ID</th>
                <th>Name</th>
                <th>Lifecycle</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {recent.map((c) => (
                <tr key={c.id}>
                  <td>{c.registrationId ?? "—"}</td>
                  <td>{c.fullName}</td>
                  <td>
                    <Badge variant={statusToVariant(c.lifecycleStage)}>{formatStatusLabel(c.lifecycleStage)}</Badge>
                  </td>
                  <td>
                    <Link href={`/candidates/${c.id}`} className="profile-link">
                      Open profile →
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </PageSection>
    </div>
  );
}

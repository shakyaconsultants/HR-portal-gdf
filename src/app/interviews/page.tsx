import { Suspense } from "react";
import { AppShell } from "@/components/AppShell";
import { InterviewsClient } from "@/app/interviews/InterviewsClient";

export default function InterviewsPage() {
  return (
    <AppShell
      title="Interviews"
      subtitle="Upcoming and completed interviews for active leads."
      breadcrumbs={[
        { label: "Dashboard", href: "/dashboard" },
        { label: "Lead Management", href: "/leads" },
        { label: "Interviews" },
      ]}
      compact
    >
      <Suspense fallback={<div className="loading-line" />}>
        <InterviewsClient />
      </Suspense>
    </AppShell>
  );
}

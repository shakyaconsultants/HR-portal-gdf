import { Suspense } from "react";
import { AppShell } from "@/components/AppShell";
import { CandidatesManagementClient } from "@/app/candidates/CandidatesManagementClient";

export default function CandidatesPage() {
  return (
    <AppShell
      title="Candidates"
      subtitle="Registered candidates — verification through onboarding."
      breadcrumbs={[{ label: "Dashboard", href: "/dashboard" }, { label: "Candidates" }]}
      compact
    >
      <Suspense fallback={<div className="loading-line" />}>
        <CandidatesManagementClient />
      </Suspense>
    </AppShell>
  );
}

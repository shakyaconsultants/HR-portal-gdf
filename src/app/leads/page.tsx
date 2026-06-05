import { Suspense } from "react";
import { AppShell } from "@/components/AppShell";
import { LeadsManagementClient } from "@/app/leads/LeadsManagementClient";

export default function LeadsPage() {
  return (
    <AppShell
      title="Leads"
      subtitle="Manage recruitment leads through interview, LOI, and registration."
      breadcrumbs={[
        { label: "Dashboard", href: "/dashboard" },
        { label: "Lead Management", href: "/leads" },
        { label: "Leads" },
      ]}
      compact
    >
      <Suspense fallback={<div className="loading-line" />}>
        <LeadsManagementClient />
      </Suspense>
    </AppShell>
  );
}

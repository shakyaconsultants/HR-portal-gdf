import { Suspense } from "react";
import { AppShell } from "@/components/AppShell";
import { LeadProfileClient } from "@/app/leads/[id]/LeadProfileClient";

type Props = { params: Promise<{ id: string }> };

export default async function LeadProfilePage({ params }: Props) {
  const { id } = await params;
  return (
    <AppShell
      title="Lead Profile"
      subtitle="Recruitment details, interviews, LOI, and communications."
      breadcrumbs={[
        { label: "Dashboard", href: "/dashboard" },
        { label: "Lead Management", href: "/leads" },
        { label: "Leads", href: "/leads" },
        { label: "Profile" },
      ]}
      compact
    >
      <Suspense fallback={<div className="loading-line" />}>
        <LeadProfileClient leadId={id} />
      </Suspense>
    </AppShell>
  );
}

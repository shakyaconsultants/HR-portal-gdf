import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { AppShell } from "@/components/AppShell";
import { EnterpriseDashboard } from "@/components/enterprise/EnterpriseDashboard";
import { appApiUrl } from "@/lib/app-url";
import type { HrWorkflowStats } from "@/components/HrWorkflowDashboard";

type DashboardStats = HrWorkflowStats & {
  lifecycleCounts: Record<string, number>;
  totalCandidates: number;
  activeBatches: number;
  candidatesInTraining: number;
  employees: number;
  pendingVerification: number;
  pendingHiringDecision: number;
  onboardingAwaitingReview: number;
  mockCallPending: number;
  totalActiveLeads: number;
  leadsInterviewScheduled: number;
  leadsSelected: number;
  leadsRejected: number;
  leadsAwaitingRegistration: number;
  leadCounts: Record<string, number>;
};

async function getStats(): Promise<DashboardStats> {
  const cookieHeader = (await cookies()).toString();
  const res = await fetch(appApiUrl("/api/dashboard/stats"), {
    headers: { cookie: cookieHeader },
    cache: "no-store",
  });
  if (!res.ok) {
    if (res.status === 401) redirect("/");
    throw new Error("Unable to load dashboard stats");
  }
  const json = await res.json();
  return json.data as DashboardStats;
}

export default async function DashboardPage() {
  const stats = await getStats();

  return (
    <AppShell
      title="Dashboard"
      subtitle="Separate lead recruitment and candidate processing metrics."
      breadcrumbs={[{ label: "Dashboard" }]}
      compact
    >
      <EnterpriseDashboard initialStats={stats} />
    </AppShell>
  );
}

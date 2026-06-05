import { redirect } from "next/navigation";
import { AppShell } from "@/components/AppShell";
import { EnterpriseDashboard } from "@/components/enterprise/EnterpriseDashboard";
import { getCookieUser, requireRole } from "@/lib/auth";
import { getDashboardStats } from "@/lib/dashboard-stats";
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

export default async function DashboardPage() {
  const user = await getCookieUser();
  if (!user) redirect("/");
  if (!requireRole(user.role, ["ADMIN", "HR", "TRAINER"])) redirect("/");

  const stats = (await getDashboardStats()) as DashboardStats;

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

import { Suspense } from "react";
import { AppShell } from "@/components/AppShell";
import { EmployeesClient } from "@/app/employees/EmployeesClient";

export default function EmployeesPage() {
  return (
    <AppShell
      title="Employees"
      subtitle="Workforce directory, status metrics, and candidate transfers."
      breadcrumbs={[{ label: "Dashboard", href: "/dashboard" }, { label: "Employees" }]}
      compact
    >
      <Suspense fallback={<div className="loading-line" />}>
        <EmployeesClient />
      </Suspense>
    </AppShell>
  );
}

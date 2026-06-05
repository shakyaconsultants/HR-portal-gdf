import { Suspense } from "react";
import { AppShell } from "@/components/AppShell";
import { TrainingClient } from "@/app/training/TrainingClient";

export default function TrainingPage() {
  return (
    <AppShell
      breadcrumbs={[{ label: "Dashboard", href: "/dashboard" }, { label: "Training" }]}
      compact
      title="Training Batches"
      subtitle="Manage batches, assignments, and in-training candidates."
    >
      <Suspense fallback={<div className="loading-line" />}>
        <TrainingClient />
      </Suspense>
    </AppShell>
  );
}

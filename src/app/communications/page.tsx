import { Suspense } from "react";
import { AppShell } from "@/components/AppShell";
import { WorkflowPipeline } from "@/components/workflow/WorkflowPipeline";
import { CommunicationWorkflowClient } from "@/app/communications/CommunicationWorkflowClient";

export default function CommunicationsPage() {
  return (
    <AppShell
      title="Communication Workflow"
      subtitle="SMTP-powered email templates — Interview Invitation, Letter Of Intent, Offer Letter, Joining Instructions."
    >
      <WorkflowPipeline />
      <Suspense fallback={<div className="loading-line" />}>
        <CommunicationWorkflowClient />
      </Suspense>
    </AppShell>
  );
}

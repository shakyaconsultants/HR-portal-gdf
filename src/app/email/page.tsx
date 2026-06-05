import { Suspense } from "react";
import { AppShell } from "@/components/AppShell";
import { EmailManagementClient } from "@/app/email/EmailManagementClient";

export default function EmailManagementPage() {
  return (
    <AppShell
      title="Email Management"
      subtitle="Centralized email templates, organization branding, logs, and retry for failed sends."
    >
      <Suspense fallback={<div className="loading-line" />}>
        <EmailManagementClient />
      </Suspense>
    </AppShell>
  );
}

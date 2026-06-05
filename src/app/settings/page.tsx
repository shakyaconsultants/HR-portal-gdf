import { AppShell } from "@/components/AppShell";
import { SettingsClient } from "@/app/settings/SettingsClient";

export default function SettingsPage() {
  return (
    <AppShell
      title="Settings"
      subtitle="Organization, branding, SMTP, templates, and communication logs."
      breadcrumbs={[{ label: "Dashboard", href: "/dashboard" }, { label: "Settings" }]}
      compact
    >
      <SettingsClient />
    </AppShell>
  );
}

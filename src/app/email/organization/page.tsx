import { AppShell } from "@/components/AppShell";
import { OrganizationSettingsClient } from "@/app/email/organization/OrganizationSettingsClient";

export default function OrganizationSettingsPage() {
  return (
    <AppShell title="Organization Settings" subtitle="Company branding and HR contact details for all email templates.">
      <OrganizationSettingsClient />
    </AppShell>
  );
}

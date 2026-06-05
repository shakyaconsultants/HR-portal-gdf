import { Suspense } from "react";
import { AppShell } from "@/components/AppShell";
import { LetterOfIntentClient } from "@/app/letter-of-intent/LetterOfIntentClient";

export default function LetterOfIntentPage() {
  return (
    <AppShell
      title="LOI Queue"
      subtitle="Send LOI emails with registration links to interview-selected leads."
      breadcrumbs={[
        { label: "Dashboard", href: "/dashboard" },
        { label: "Lead Management", href: "/leads" },
        { label: "LOI Queue" },
      ]}
      compact
    >
      <Suspense fallback={<div className="loading-line" />}>
        <LetterOfIntentClient />
      </Suspense>
    </AppShell>
  );
}

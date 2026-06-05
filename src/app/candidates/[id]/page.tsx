import { Suspense } from "react";
import { AppShell } from "@/components/AppShell";
import { CandidateProfileClient } from "@/app/candidates/[id]/CandidateProfileClient";

type Props = { params: Promise<{ id: string }> };

export default async function CandidateProfilePage({ params }: Props) {
  const { id } = await params;
  return (
    <AppShell
      title="Candidate Profile"
      subtitle="Lifecycle hub — documents, verification, training, communications, and activity."
      breadcrumbs={[
        { label: "Dashboard", href: "/dashboard" },
        { label: "Candidates", href: "/candidates" },
        { label: "Profile" },
      ]}
      compact
    >
      <Suspense fallback={<div className="loading-line" />}>
        <CandidateProfileClient candidateId={id} />
      </Suspense>
    </AppShell>
  );
}

import { AppShell } from "@/components/AppShell";
import { BatchDetailClient } from "@/app/batches/[id]/BatchDetailClient";

type Props = { params: Promise<{ id: string }> };

export default async function BatchDetailPage({ params }: Props) {
  const { id } = await params;

  return (
    <AppShell
      title="Batch detail"
      subtitle="Primary training unit — manage assigned candidates, transfers, and outcomes."
    >
      <BatchDetailClient batchId={id} />
    </AppShell>
  );
}

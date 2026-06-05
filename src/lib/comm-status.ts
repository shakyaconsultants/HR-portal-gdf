import { EMAIL_TEMPLATE_TYPES } from "@/lib/constants";
import { sanitizeDeliveryError } from "@/lib/delivery-errors";

export type CommStatusSummary = {
  sent: boolean;
  lastSentAt: string | null;
  status: string | null;
  sentByName: string | null;
  logId: string | null;
  errorMessage: string | null;
};

function emptySummary(): CommStatusSummary {
  return {
    sent: false,
    lastSentAt: null,
    status: null,
    sentByName: null,
    logId: null,
    errorMessage: null,
  };
}

/** Build per-type communication status from sorted communication logs (newest first). */
export function mapCommStatusFromLogs(
  logs: Array<{
    id?: string;
    _id?: { toString(): string };
    type: string;
    status: string;
    sentAt?: string | Date | null;
    createdAt?: string | Date | null;
    sentByName?: string | null;
    errorMessage?: string | null;
  }>
) {
  const byType: Record<string, CommStatusSummary> = Object.fromEntries(
    EMAIL_TEMPLATE_TYPES.map((t) => [t, emptySummary()])
  );

  for (const type of EMAIL_TEMPLATE_TYPES) {
    const latest = logs.find((l) => l.type === type);
    if (!latest) continue;
    const logId = latest.id ?? latest._id?.toString() ?? null;
    const sentAt = latest.sentAt ?? latest.createdAt;
    byType[type] = {
      sent: latest.status === "SENT",
      lastSentAt: sentAt ? new Date(sentAt).toISOString() : null,
      status: latest.status,
      sentByName: latest.sentByName ?? null,
      logId,
      errorMessage: latest.errorMessage ? sanitizeDeliveryError(latest.errorMessage) : null,
    };
  }

  return byType;
}

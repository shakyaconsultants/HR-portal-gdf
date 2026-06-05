import "server-only";
import { Types } from "mongoose";
import type { CommunicationType, DeliveryStatus } from "@/lib/constants";
import { COMMUNICATION_LOG_TYPES } from "@/lib/constants";

type CommunicationLogType = (typeof COMMUNICATION_LOG_TYPES)[number];
import type { EmailAttachmentInput } from "@/lib/email";
import {
  sendTemplatedEmail,
  retryFailedEmail,
  type EmailAttachmentMeta,
} from "@/lib/email-service";
import { communicationTypeLabel } from "@/lib/email-templates";

export { communicationTypeLabel };
export { retryFailedEmail, type EmailAttachmentMeta };

export async function sendWorkflowEmail(params: {
  candidateId?: string | Types.ObjectId;
  leadId?: string | Types.ObjectId;
  type: CommunicationType | CommunicationLogType;
  to: string;
  subject?: string;
  textBody?: string;
  htmlBody?: string;
  attachments?: EmailAttachmentInput[];
  attachmentMeta?: EmailAttachmentMeta[];
  sentBy: { userId: string; name: string };
  relatedId?: string | Types.ObjectId | null;
  relatedModel?: string;
  extras?: import("@/lib/email-renderer").EmailRenderExtras;
}): Promise<{ logId: string; status: DeliveryStatus; errorMessage?: string }> {
  return sendTemplatedEmail({
    candidateId: params.candidateId,
    leadId: params.leadId,
    type: params.type,
    to: params.to,
    sentBy: params.sentBy,
    relatedId: params.relatedId,
    relatedModel: params.relatedModel,
    extras: params.extras,
    subjectOverride: params.subject,
    bodyOverride: params.textBody,
    htmlBodyOverride: params.htmlBody,
    attachments: params.attachments,
    attachmentMeta: params.attachmentMeta,
  });
}

/** @deprecated Use renderEmailFromTemplate via sendWorkflowEmail */
export function buildCommunicationContent() {
  throw new Error("buildCommunicationContent is deprecated. Use DB email templates.");
}

/** @deprecated Use renderEmailFromTemplate */
export function buildEmailHtml() {
  throw new Error("buildEmailHtml is deprecated. Use DB email templates.");
}

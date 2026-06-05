import "server-only";
import { Types } from "mongoose";
import type { CommunicationType, DeliveryStatus } from "@/lib/constants";
import { COMMUNICATION_LOG_TYPES } from "@/lib/constants";
import { connectDb } from "@/lib/db";
import { sendEmail, type EmailAttachmentInput } from "@/lib/email";
import { sanitizeDeliveryError } from "@/lib/delivery-errors";
import { readStoredFileBuffer } from "@/lib/file-storage";
import { isHtmlOnlyEmailType } from "@/lib/email-policy";
import { renderEmailFromTemplate, type EmailRenderExtras } from "@/lib/email-renderer";
import { CommunicationLog } from "@/models/CommunicationLog";

type CommunicationLogType = (typeof COMMUNICATION_LOG_TYPES)[number];

export type EmailAttachmentMeta = {
  fileName: string;
  mimeType: string;
  storagePath: string;
  size: number;
};

const MAX_EMAIL_RETRIES = 3;

async function resolveTemplateAttachments(
  templateAttachments: Array<{ fileName: string; mimeType: string; storagePath: string }>
) {
  const inputs: EmailAttachmentInput[] = [];
  const meta: EmailAttachmentMeta[] = [];

  for (const att of templateAttachments) {
    let size = 0;
    try {
      const content = await readStoredFileBuffer(att.storagePath);
      size = content.length;
      inputs.push({
        fileName: att.fileName,
        mimeType: att.mimeType,
        content,
      });
    } catch {
      inputs.push({
        fileName: att.fileName,
        mimeType: att.mimeType,
        filePath: att.storagePath,
      });
    }
    meta.push({
      fileName: att.fileName,
      mimeType: att.mimeType,
      storagePath: att.storagePath,
      size,
    });
  }

  return { inputs, meta };
}

async function deliverEmail(logId: Types.ObjectId) {
  const log = await CommunicationLog.findById(logId);
  if (!log) throw new Error("Email log not found");

  const extraAttachments: EmailAttachmentInput[] = (log.attachments ?? []).map((att) => ({
    fileName: att.fileName,
    mimeType: att.mimeType,
    filePath: att.storagePath || undefined,
  }));

  const result = await sendEmail({
    to: log.sentToEmail,
    subject: log.subject,
    text: log.body,
    html: log.htmlBody,
    attachments: extraAttachments.length > 0 ? extraAttachments : undefined,
  });

  const sentAt = new Date();

  if (result.ok) {
    await CommunicationLog.updateOne(
      { _id: logId },
      {
        $set: {
          status: "SENT",
          sentAt,
          messageId: result.messageId,
          errorMessage: "",
        },
      }
    );
    return { status: "SENT" as DeliveryStatus, messageId: result.messageId };
  }

  await CommunicationLog.updateOne(
    { _id: logId },
    {
      $set: {
        status: "FAILED",
        sentAt,
        errorMessage: sanitizeDeliveryError(result.error),
      },
      $inc: { retryCount: 1 },
    }
  );

  return { status: "FAILED" as DeliveryStatus, errorMessage: sanitizeDeliveryError(result.error) };
}

export async function sendTemplatedEmail(params: {
  candidateId?: string | Types.ObjectId;
  leadId?: string | Types.ObjectId;
  type: CommunicationType | CommunicationLogType;
  to: string;
  sentBy: { userId: string; name: string };
  relatedId?: string | Types.ObjectId | null;
  relatedModel?: string;
  extras?: EmailRenderExtras;
  subjectOverride?: string;
  bodyOverride?: string;
  htmlBodyOverride?: string;
  attachments?: EmailAttachmentInput[];
  attachmentMeta?: EmailAttachmentMeta[];
}): Promise<{ logId: string; status: DeliveryStatus; errorMessage?: string }> {
  await connectDb();

  const rendered =
    params.htmlBodyOverride && params.subjectOverride && params.bodyOverride
      ? {
          subject: params.subjectOverride,
          textBody: params.bodyOverride,
          htmlBody: params.htmlBodyOverride,
          templateAttachments: [] as Array<{ fileName: string; mimeType: string; storagePath: string }>,
        }
      : await renderEmailFromTemplate({
          type: params.type,
          candidateId: params.candidateId,
          leadId: params.leadId,
          extras: params.extras,
          subjectOverride: params.subjectOverride,
          bodyOverride: params.bodyOverride,
        });

  const htmlOnly = isHtmlOnlyEmailType(params.type);
  if (htmlOnly && (params.attachments?.length ?? 0) > 0) {
    throw new Error(`${params.type} emails must be HTML only and cannot include attachments.`);
  }

  const templateAtt = htmlOnly
    ? { inputs: [] as EmailAttachmentInput[], meta: [] as EmailAttachmentMeta[] }
    : await resolveTemplateAttachments(rendered.templateAttachments ?? []);
  const allAttachments = [...templateAtt.inputs, ...(params.attachments ?? [])];
  const attachmentMeta = [
    ...templateAtt.meta,
    ...(params.attachmentMeta ??
      (params.attachments ?? []).map((att) => ({
        fileName: att.fileName,
        mimeType: att.mimeType,
        storagePath: att.filePath ?? "",
        size: att.content?.length ?? 0,
      }))),
  ];

  const logPayload: Record<string, unknown> = {
    type: params.type,
    subject: rendered.subject,
    body: rendered.textBody,
    htmlBody: rendered.htmlBody,
    attachments: attachmentMeta,
    sentBy: params.sentBy.userId,
    sentByName: params.sentBy.name,
    sentToEmail: params.to,
    status: "PENDING",
    retryCount: 0,
    relatedId: params.relatedId ?? null,
    relatedModel: params.relatedModel ?? "",
  };
  if (params.candidateId) logPayload.candidateId = params.candidateId;
  if (params.leadId) logPayload.leadId = params.leadId;

  const pendingLog = await CommunicationLog.create(logPayload);

  if (allAttachments.length > 0) {
    await CommunicationLog.updateOne({ _id: pendingLog._id }, { $set: { attachments: attachmentMeta } });
  }

  try {
    const delivery = await deliverEmail(pendingLog._id);
    return {
      logId: pendingLog._id.toString(),
      status: delivery.status,
      errorMessage: "errorMessage" in delivery ? delivery.errorMessage : undefined,
    };
  } catch (error) {
    const raw = error instanceof Error ? error.message : "Unknown email delivery error";
    console.error("sendTemplatedEmail delivery failed:", raw);
    const message = sanitizeDeliveryError(raw);
    await CommunicationLog.updateOne(
      { _id: pendingLog._id },
      { $set: { status: "FAILED", sentAt: new Date(), errorMessage: message }, $inc: { retryCount: 1 } }
    );
    return { logId: pendingLog._id.toString(), status: "FAILED" as DeliveryStatus, errorMessage: message };
  }
}

export async function retryFailedEmail(
  logId: string,
  actor: { userId: string; name: string }
): Promise<{ logId: string; status: DeliveryStatus; errorMessage?: string }> {
  await connectDb();
  if (!Types.ObjectId.isValid(logId)) throw new Error("Invalid log id");

  const log = await CommunicationLog.findById(logId);
  if (!log) throw new Error("Email log not found");
  if (log.status !== "FAILED") throw new Error("Only failed emails can be retried");
  if ((log.retryCount ?? 0) >= MAX_EMAIL_RETRIES) {
    throw new Error(`Maximum retry attempts (${MAX_EMAIL_RETRIES}) reached`);
  }

  await CommunicationLog.updateOne(
    { _id: log._id },
    {
      $set: {
        status: "PENDING",
        sentBy: actor.userId,
        sentByName: actor.name,
        errorMessage: "",
      },
    }
  );

  const delivery = await deliverEmail(log._id);
  return {
    logId: log._id.toString(),
    status: delivery.status,
    errorMessage: "errorMessage" in delivery ? delivery.errorMessage : undefined,
  };
}

export { MAX_EMAIL_RETRIES };

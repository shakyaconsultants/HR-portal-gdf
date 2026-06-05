import "server-only";
import nodemailer from "nodemailer";
import { getSmtpConfig } from "@/lib/smtp";
import { sanitizeDeliveryError } from "@/lib/delivery-errors";
import { readStoredFileBuffer } from "@/lib/file-storage";

export type EmailAttachmentInput = {
  fileName: string;
  mimeType: string;
  /** Absolute or project-relative path on disk */
  filePath?: string;
  content?: Buffer;
};

export type SendEmailInput = {
  to: string;
  subject: string;
  text: string;
  html: string;
  attachments?: EmailAttachmentInput[];
};

export type SendEmailResult =
  | { ok: true; messageId: string }
  | { ok: false; error: string };

async function resolveAttachmentContent(attachment: EmailAttachmentInput) {
  if (attachment.content) return attachment.content;
  if (attachment.filePath) {
    try {
      return await readStoredFileBuffer(attachment.filePath);
    } catch {
      throw new Error(
        `Attachment ${attachment.fileName} is missing. Regenerate the document and try again.`
      );
    }
  }
  throw new Error(`Attachment ${attachment.fileName} has no content or file path.`);
}

export async function sendEmail(input: SendEmailInput): Promise<SendEmailResult> {
  const config = getSmtpConfig();
  if (!config) {
    return { ok: false, error: "SMTP is not configured. Set SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS, SMTP_FROM." };
  }

  try {
    const transporter = nodemailer.createTransport({
      host: config.host,
      port: config.port,
      secure: config.port === 465,
      requireTLS: config.port === 587,
      auth: {
        user: config.user,
        pass: config.pass,
      },
      connectionTimeout: 30_000,
      greetingTimeout: 30_000,
      socketTimeout: 60_000,
      tls: {
        minVersion: "TLSv1.2",
      },
    });

    const nodemailerAttachments = input.attachments?.length
      ? await Promise.all(
          input.attachments.map(async (att) => ({
            filename: att.fileName,
            content: await resolveAttachmentContent(att),
            contentType: att.mimeType,
          }))
        )
      : undefined;

    const info = await transporter.sendMail({
      from: `"GDF Finance Advisory" <${config.from}>`,
      replyTo: config.from,
      to: input.to,
      subject: input.subject,
      text: input.text,
      html: input.html,
      attachments: nodemailerAttachments,
    });

    return { ok: true, messageId: info.messageId ?? "sent" };
  } catch (error) {
    const raw = error instanceof Error ? error.message : "Unknown SMTP error";
    console.error("sendEmail failed:", raw);
    return { ok: false, error: sanitizeDeliveryError(raw) };
  }
}

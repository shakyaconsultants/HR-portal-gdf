import { COMPANY } from "@/lib/company";
import type { CommunicationType } from "@/lib/constants";

function escapeHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function textToHtmlParagraphs(text: string) {
  return text
    .split(/\n{2,}/)
    .map((block) => `<p style="margin:0 0 12px;line-height:1.6;">${escapeHtml(block).replace(/\n/g, "<br/>")}</p>`)
    .join("");
}

export function wrapEmailHtml(params: {
  title: string;
  bodyHtml: string;
  footer?: string;
}) {
  return `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"/><title>${escapeHtml(params.title)}</title></head>
<body style="margin:0;padding:0;background:#f4f6f8;font-family:Segoe UI,Arial,sans-serif;color:#1e293b;">
  <table width="100%" cellpadding="0" cellspacing="0" style="padding:24px 12px;">
    <tr><td align="center">
      <table width="600" cellpadding="0" cellspacing="0" style="background:#ffffff;border:1px solid #e2e8f0;border-radius:8px;overflow:hidden;">
        <tr><td style="background:#4338ca;color:#ffffff;padding:20px 24px;">
          <div style="font-size:20px;font-weight:700;">${escapeHtml(COMPANY.name)}</div>
          <div style="font-size:13px;opacity:0.9;margin-top:4px;">${escapeHtml(COMPANY.tagline)}</div>
        </td></tr>
        <tr><td style="padding:24px;">${params.bodyHtml}</td></tr>
        <tr><td style="padding:16px 24px;background:#f8fafc;border-top:1px solid #e2e8f0;font-size:12px;color:#64748b;">
          ${escapeHtml(params.footer ?? `${COMPANY.name} · ${COMPANY.address.line3}`)}
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;
}

export function textBodyToHtml(text: string) {
  return textToHtmlParagraphs(text);
}

export function communicationTypeLabel(type: CommunicationType | string) {
  const labels: Record<string, string> = {
    INTERVIEW_INVITATION: "Interview Invitation",
    LETTER_OF_INTENT: "Letter Of Intent",
    OFFER_LETTER: "Offer Letter",
    JOINING_INSTRUCTIONS: "Joining Instructions",
    ONBOARDING_INVITATION: "Onboarding Invitation",
    TRAINING_COMPLETION: "Training Completion Letter",
  };
  return labels[type] ?? type;
}

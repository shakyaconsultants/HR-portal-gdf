import { getAppBaseUrl } from "@/lib/app-url";

function escapeHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/** Gmail-compatible responsive email layout (table-based, inline styles). */
export function buildResponsiveEmailHtml(params: {
  subject: string;
  companyName: string;
  companyTagline?: string;
  logoUrl?: string;
  showLogo?: boolean;
  bodyHtml: string;
  actionButton?: { label: string; url: string } | null;
  footerHtml?: string;
}) {
  const title = escapeHtml(params.subject);
  const company = escapeHtml(params.companyName);
  const tagline = params.companyTagline ? escapeHtml(params.companyTagline) : "";
  const logoBlock =
    params.showLogo !== false && params.logoUrl
      ? `<tr>
          <td align="center" style="padding:28px 28px 8px;">
            <img src="${params.logoUrl}" alt="${company}" width="88" height="88" style="display:block;width:88px;height:88px;border:0;border-radius:14px;" />
          </td>
        </tr>`
      : "";

  const ctaBlock =
    params.actionButton?.url && params.actionButton?.label
      ? `<tr>
          <td align="center" style="padding:8px 28px 28px;">
            <table cellpadding="0" cellspacing="0" border="0" role="presentation">
              <tr>
                <td align="center" bgcolor="#1a4d8c" style="border-radius:8px;">
                  <a href="${escapeHtml(params.actionButton.url)}" target="_blank" style="display:inline-block;padding:15px 32px;font-family:Arial,Helvetica,sans-serif;font-size:16px;font-weight:700;color:#ffffff;text-decoration:none;border-radius:8px;mso-padding-alt:0;">
                    ${escapeHtml(params.actionButton.label)}
                  </a>
                </td>
              </tr>
            </table>
          </td>
        </tr>`
      : "";

  const footer = params.footerHtml ?? `${company}${tagline ? ` · ${tagline}` : ""}`;

  return `<!DOCTYPE html>
<html lang="en" xmlns="http://www.w3.org/1999/xhtml" xmlns:v="urn:schemas-microsoft-com:vml" xmlns:o="urn:schemas-microsoft-com:office:office">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <meta http-equiv="X-UA-Compatible" content="IE=edge" />
  <meta name="x-apple-disable-message-reformatting" />
  <title>${title}</title>
  <!--[if mso]>
  <noscript><xml><o:OfficeDocumentSettings><o:PixelsPerInch>96</o:PixelsPerInch></o:OfficeDocumentSettings></xml></noscript>
  <![endif]-->
  <style>
    body { margin:0 !important; padding:0 !important; width:100% !important; -webkit-text-size-adjust:100%; -ms-text-size-adjust:100%; }
    table { border-collapse:collapse; mso-table-lspace:0; mso-table-rspace:0; }
    img { border:0; height:auto; line-height:100%; outline:none; text-decoration:none; }
    a { color:#1a4d8c; }
    @media only screen and (max-width:620px) {
      .email-container { width:100% !important; }
      .email-content { padding:22px 18px !important; }
    }
  </style>
</head>
<body style="margin:0;padding:0;background-color:#eef1f5;font-family:Arial,Helvetica,sans-serif;color:#1e293b;">
  <div style="display:none;max-height:0;overflow:hidden;mso-hide:all;">${title}</div>
  <table width="100%" cellpadding="0" cellspacing="0" border="0" role="presentation" style="background-color:#eef1f5;">
    <tr>
      <td align="center" style="padding:28px 16px;">
        <table class="email-container" width="600" cellpadding="0" cellspacing="0" border="0" role="presentation" style="max-width:600px;width:100%;background-color:#ffffff;border:1px solid #dbe2ea;border-radius:12px;overflow:hidden;box-shadow:0 8px 30px rgba(11,31,58,0.08);">
          <tr>
            <td style="background:linear-gradient(135deg,#0b1f3a 0%,#1a4d8c 100%);padding:22px 28px;">
              <div style="font-family:Arial,Helvetica,sans-serif;font-size:20px;font-weight:700;color:#ffffff;line-height:1.3;">${company}</div>
              ${tagline ? `<div style="font-family:Arial,Helvetica,sans-serif;font-size:13px;color:#d4e4f7;margin-top:6px;">${tagline}</div>` : ""}
            </td>
          </tr>
          ${logoBlock}
          <tr>
            <td class="email-content" style="padding:28px;font-family:Arial,Helvetica,sans-serif;font-size:15px;line-height:1.65;color:#334155;">
              ${params.bodyHtml}
            </td>
          </tr>
          ${ctaBlock}
          <tr>
            <td style="padding:18px 28px;background-color:#f8fafc;border-top:1px solid #e2e8f0;font-family:Arial,Helvetica,sans-serif;font-size:12px;line-height:1.55;color:#64748b;">
              ${footer}
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

export function textToEmailHtmlParagraphs(text: string) {
  return text
    .split(/\n{2,}/)
    .map((block) => {
      const escaped = escapeHtml(block).replace(/\n/g, "<br/>");
      return `<p style="margin:0 0 16px;font-family:Arial,Helvetica,sans-serif;font-size:15px;line-height:1.65;color:#334155;">${escaped}</p>`;
    })
    .join("");
}

/** @deprecated Use getCompanyLogoForEmail() for outbound messages. */
export function resolveLogoUrl(logoPath: string, baseUrl = getAppBaseUrl()) {
  if (!logoPath) return `${baseUrl}/gdf-logo.svg`;
  if (logoPath.startsWith("http://") || logoPath.startsWith("https://")) return logoPath;
  return `${baseUrl}${logoPath.startsWith("/") ? logoPath : `/${logoPath}`}`;
}

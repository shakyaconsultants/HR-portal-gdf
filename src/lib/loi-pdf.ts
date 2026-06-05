import { readFile } from "fs/promises";
import path from "path";
import { PDFDocument, rgb, StandardFonts } from "pdf-lib";
import { COMPANY } from "@/lib/company";
import { readStoredFileBuffer } from "@/lib/file-storage";
import { getOrganizationSettings } from "@/lib/organization-settings";

export type LoiPdfInput = {
  candidateName: string;
  candidateEmail: string;
  referenceNumber: string;
  issueDate: Date;
};

const BRAND = {
  primary: rgb(0.11, 0.31, 0.58),
  text: rgb(0.15, 0.15, 0.18),
  muted: rgb(0.4, 0.4, 0.45),
};

function wrapText(text: string, maxChars: number) {
  const words = text.split(/\s+/);
  const lines: string[] = [];
  let current = "";
  for (const word of words) {
    const next = current ? `${current} ${word}` : word;
    if (next.length > maxChars) {
      if (current) lines.push(current);
      current = word;
    } else {
      current = next;
    }
  }
  if (current) lines.push(current);
  return lines;
}

/** pdf-lib supports PNG/JPG only — skip SVG and fall back to text header. */
async function tryEmbedLogo(pdfDoc: PDFDocument) {
  const pngCandidates = ["gdf-logo.png", "logo.png"];
  for (const file of pngCandidates) {
    try {
      const bytes = await readFile(path.join(process.cwd(), "public", file));
      return await pdfDoc.embedPng(bytes);
    } catch {
      // try next candidate
    }
  }
  return null;
}

async function resolveLoiTemplateUrl() {
  const settings = await getOrganizationSettings();
  return String(settings.loiTemplateUrl ?? "").trim();
}

async function buildFromCompanyTemplate(input: LoiPdfInput, templateUrl: string) {
  const templateBytes = await readStoredFileBuffer(templateUrl);
  const pdfDoc = await PDFDocument.load(templateBytes);
  const page = pdfDoc.getPages()[0];
  const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
  const { height } = page.getSize();

  const dateLabel = input.issueDate.toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  });

  const overlays: { text: string; x: number; y: number; size: number; bold?: boolean }[] = [
    { text: `Ref: ${input.referenceNumber}`, x: 72, y: height - 120, size: 10 },
    { text: `Date: ${dateLabel}`, x: 72, y: height - 136, size: 10 },
    { text: input.candidateName, x: 72, y: height - 200, size: 11, bold: true },
    { text: input.candidateEmail, x: 72, y: height - 216, size: 10 },
  ];

  for (const item of overlays) {
    page.drawText(item.text, {
      x: item.x,
      y: item.y,
      size: item.size,
      font: item.bold ? fontBold : font,
      color: BRAND.text,
    });
  }

  return pdfDoc.save();
}

async function buildBrandedLoi(input: LoiPdfInput) {
  const pdfDoc = await PDFDocument.create();
  const page = pdfDoc.addPage([595.28, 841.89]);
  const { width, height } = page.getSize();
  const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
  const logo = await tryEmbedLogo(pdfDoc);

  let y = height - 48;

  if (logo) {
    const logoDims = logo.scale(0.18);
    page.drawImage(logo, {
      x: 50,
      y: y - logoDims.height,
      width: logoDims.width,
      height: logoDims.height,
    });
    y -= logoDims.height + 12;
  } else {
    page.drawText(COMPANY.name, { x: 50, y, size: 22, font: fontBold, color: BRAND.primary });
    y -= 28;
  }

  page.drawText(COMPANY.tagline, { x: 50, y, size: 10, font, color: BRAND.muted });
  y -= 16;
  const addressLines = [
    COMPANY.address.line1,
    COMPANY.address.line2,
    COMPANY.address.line3,
    COMPANY.address.line4,
  ];
  for (const line of addressLines) {
    page.drawText(line, { x: 50, y, size: 9, font, color: BRAND.muted });
    y -= 12;
  }

  page.drawLine({
    start: { x: 50, y: y - 8 },
    end: { x: width - 50, y: y - 8 },
    thickness: 1.5,
    color: BRAND.primary,
  });
  y -= 36;

  const dateLabel = input.issueDate.toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  });

  page.drawText(`Ref: ${input.referenceNumber}`, { x: 50, y, size: 10, font, color: BRAND.text });
  page.drawText(`Date: ${dateLabel}`, { x: width - 180, y, size: 10, font, color: BRAND.text });
  y -= 36;

  page.drawText("LETTER OF INTENT", {
    x: 50,
    y,
    size: 14,
    font: fontBold,
    color: BRAND.primary,
  });
  y -= 28;

  page.drawText("To,", { x: 50, y, size: 11, font, color: BRAND.text });
  y -= 16;
  page.drawText(input.candidateName, { x: 50, y, size: 11, font: fontBold, color: BRAND.text });
  y -= 14;
  page.drawText(input.candidateEmail, { x: 50, y, size: 10, font, color: BRAND.muted });
  y -= 28;

  const paragraphs = [
    `Dear ${input.candidateName},`,
    `We are pleased to inform you that you have been selected for the ${COMPANY.name} ${COMPANY.tagline}. Based on your interview performance, we intend to offer you a training and employment pathway with our organisation.`,
    `This Letter of Intent confirms our interest in onboarding you as a trainee subject to successful completion of registration, document verification, training, and final evaluation as per company policy.`,
    `Please complete the Candidate Registration Form using the link shared in your email. Submit all required documents within 7 working days of receiving this letter.`,
    `Upon registration, you will proceed through verification, batch assignment, and structured training before the final hiring decision.`,
    `We look forward to welcoming you to the ${COMPANY.name} team.`,
  ];

  for (const paragraph of paragraphs) {
    const lines = wrapText(paragraph, 88);
    for (const line of lines) {
      page.drawText(line, { x: 50, y, size: 11, font, color: BRAND.text });
      y -= 14;
    }
    y -= 8;
  }

  y -= 12;
  page.drawText("For " + COMPANY.name, { x: 50, y, size: 11, font: fontBold, color: BRAND.text });
  y -= 40;
  page.drawText("Authorised Signatory", { x: 50, y, size: 10, font, color: BRAND.muted });
  y -= 14;
  page.drawText("Human Resources Department", { x: 50, y, size: 10, font, color: BRAND.muted });

  page.drawText(
    "This is a system-generated Letter of Intent. For queries contact HR at the address above.",
    { x: 50, y: 40, size: 8, font, color: BRAND.muted }
  );

  return pdfDoc.save();
}

export async function generateLoiPdf(input: LoiPdfInput) {
  const templateUrl = await resolveLoiTemplateUrl();
  let usedCompanyTemplate = false;
  let pdfBytes: Uint8Array;

  if (templateUrl) {
    try {
      pdfBytes = await buildFromCompanyTemplate(input, templateUrl);
      usedCompanyTemplate = true;
      return { pdfBytes, usedCompanyTemplate };
    } catch {
      // fall through to branded default
    }
  }

  pdfBytes = await buildBrandedLoi(input);
  return { pdfBytes, usedCompanyTemplate };
}

export function buildLoiReferenceNumber() {
  const stamp = new Date().toISOString().slice(0, 10).replace(/-/g, "");
  const rand = Math.floor(1000 + Math.random() * 9000);
  return `LOI-${stamp}-${rand}`;
}

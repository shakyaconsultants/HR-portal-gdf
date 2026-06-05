import { readFile } from "fs/promises";
import path from "path";
import { PDFDocument, rgb, StandardFonts } from "pdf-lib";
import { COMPANY } from "@/lib/company";

export type OfferPdfInput = {
  candidateName: string;
  designation: string;
  department: string;
  ctc: string;
  joiningDate: string;
  reportingManager: string;
  offerDate: string;
  referenceNumber: string;
  joiningFormLink?: string;
  idCardFormLink?: string;
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

export async function generateOfferPdf(input: OfferPdfInput) {
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
  y -= 32;

  page.drawLine({
    start: { x: 50, y: y - 8 },
    end: { x: width - 50, y: y - 8 },
    thickness: 1.5,
    color: BRAND.primary,
  });
  y -= 36;

  page.drawText(`Ref: ${input.referenceNumber}`, { x: 50, y, size: 10, font, color: BRAND.text });
  page.drawText(`Date: ${input.offerDate}`, { x: width - 200, y, size: 10, font, color: BRAND.text });
  y -= 36;

  page.drawText("OFFER OF EMPLOYMENT", {
    x: 50,
    y,
    size: 14,
    font: fontBold,
    color: BRAND.primary,
  });
  y -= 28;

  const paragraphs = [
    `Dear ${input.candidateName},`,
    `We are pleased to offer you the position of ${input.designation} in the ${input.department} department at ${COMPANY.name}.`,
    `Your Cost to Company (CTC) will be ${input.ctc}, subject to applicable statutory deductions and company policies.`,
    `Your tentative date of joining will be ${input.joiningDate}. You will report to ${input.reportingManager}.`,
    `This offer is subject to successful completion of background verification, document submission, and onboarding formalities as communicated by HR.`,
    `Please confirm your acceptance of this offer within five (5) business days from the date of this letter.`,
    `We look forward to welcoming you to our team.`,
  ];

  for (const paragraph of paragraphs) {
    const lines = wrapText(paragraph, 88);
    for (const line of lines) {
      page.drawText(line, { x: 50, y, size: 11, font, color: BRAND.text });
      y -= 14;
    }
    y -= 8;
  }

  if (input.joiningFormLink || input.idCardFormLink) {
    y -= 8;
    page.drawText("Onboarding forms (complete within 3 days):", {
      x: 50,
      y,
      size: 11,
      font: fontBold,
      color: BRAND.primary,
    });
    y -= 16;
    if (input.joiningFormLink) {
      const lines = wrapText(`Joining Form: ${input.joiningFormLink}`, 88);
      for (const line of lines) {
        page.drawText(line, { x: 50, y, size: 9, font, color: BRAND.text });
        y -= 12;
      }
    }
    if (input.idCardFormLink) {
      const lines = wrapText(`ID Card Form: ${input.idCardFormLink}`, 88);
      for (const line of lines) {
        page.drawText(line, { x: 50, y, size: 9, font, color: BRAND.text });
        y -= 12;
      }
    }
    y -= 4;
  }

  y -= 12;
  page.drawText("For " + COMPANY.name, { x: 50, y, size: 11, font: fontBold, color: BRAND.text });
  y -= 40;
  page.drawText("Authorised Signatory", { x: 50, y, size: 10, font, color: BRAND.muted });
  y -= 14;
  page.drawText("Human Resources Department", { x: 50, y, size: 10, font, color: BRAND.muted });

  page.drawText(
    "This is a system-generated Offer Letter. For queries contact the HR department.",
    { x: 50, y: 40, size: 8, font, color: BRAND.muted }
  );

  return pdfDoc.save();
}

export function buildOfferReferenceNumber() {
  const stamp = new Date().toISOString().slice(0, 10).replace(/-/g, "");
  const rand = Math.floor(1000 + Math.random() * 9000);
  return `OFFER-${stamp}-${rand}`;
}

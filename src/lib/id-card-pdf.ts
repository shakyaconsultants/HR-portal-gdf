import { readFile } from "fs/promises";
import path from "path";
import QRCode from "qrcode";
import { PDFDocument, PDFPage, PDFFont, rgb, StandardFonts } from "pdf-lib";
import { appApiUrl } from "@/lib/app-url";
import { COMPANY } from "@/lib/company";
import { readStoredFileBuffer } from "@/lib/file-storage";

export type IdCardPdfInput = {
  fullName: string;
  designation: string;
  department: string;
  employeeId: string;
  email: string;
  phone: string;
  photoPath?: string;
  issueDate?: string;
  emergencyContactName?: string;
  emergencyContactPhone?: string;
  verificationUrl?: string;
};

/** Corporate palette */
const NAVY = rgb(11 / 255, 46 / 255, 107 / 255);
const GOLD = rgb(212 / 255, 175 / 255, 55 / 255);
const TEXT = rgb(0.12, 0.14, 0.18);
const MUTED = rgb(0.42, 0.45, 0.52);
const LIGHT = rgb(0.96, 0.97, 0.98);
const BORDER = rgb(0.88, 0.9, 0.93);
const WHITE = rgb(1, 1, 1);

/** ISO/IEC 7810 ID-1 portrait (PVC card). */
const CARD_W = 153.07;
const CARD_H = 242.65;
const MARGIN = 8;
const CONTENT_W = CARD_W - MARGIN * 2;
const COL = CONTENT_W / 12;

type Fonts = { regular: PDFFont; bold: PDFFont };

function col(start: number, span = 1) {
  return { x: MARGIN + COL * start, w: COL * span };
}

function fitText(text: string, maxLen: number) {
  const t = text.trim();
  return t.length > maxLen ? `${t.slice(0, maxLen - 1)}…` : t;
}

function parseDate(issueDate?: string) {
  if (issueDate) {
    const d = new Date(issueDate);
    if (!Number.isNaN(d.getTime())) return d;
  }
  return new Date();
}

function formatDate(d: Date) {
  return d.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
}

function validityDate(issueDate?: string) {
  const d = parseDate(issueDate);
  d.setFullYear(d.getFullYear() + 3);
  return formatDate(d);
}

function formatDepartment(dept: string) {
  const d = dept.trim();
  if (!d || d === "—") return "General Department";
  return /department/i.test(d) ? d : `${d} Department`;
}

function formatDesignation(designation: string) {
  const d = designation.trim();
  return d && d !== "—" ? d : "Associate";
}

function centerX(font: PDFFont, text: string, size: number, area: { x: number; w: number }) {
  const tw = font.widthOfTextAtSize(text, size);
  return area.x + Math.max(0, (area.w - tw) / 2);
}

async function tryEmbedLogo(pdfDoc: PDFDocument) {
  for (const file of ["gdf-logo.png", "logo.png"]) {
    try {
      const bytes = await readFile(path.join(process.cwd(), "public", file));
      return await pdfDoc.embedPng(bytes);
    } catch {
      // try next
    }
  }
  return null;
}

async function tryEmbedPhoto(pdfDoc: PDFDocument, photoPath?: string) {
  if (!photoPath?.trim()) return null;
  try {
    const bytes = await readStoredFileBuffer(photoPath);
    try {
      return await pdfDoc.embedPng(bytes);
    } catch {
      return await pdfDoc.embedJpg(bytes);
    }
  } catch {
    return null;
  }
}

async function generateQrImage(pdfDoc: PDFDocument, data: string, pxSize: number) {
  const dataUrl = await QRCode.toDataURL(data, {
    width: pxSize,
    margin: 0,
    color: { dark: "#0B2E6B", light: "#FFFFFF" },
    errorCorrectionLevel: "M",
  });
  const base64 = dataUrl.split(",")[1] ?? "";
  const bytes = Uint8Array.from(Buffer.from(base64, "base64"));
  return pdfDoc.embedPng(bytes);
}

function drawLogoMark(page: PDFPage, x: number, y: number, size: number, fonts: Fonts) {
  page.drawRectangle({ x, y, width: size, height: size, color: GOLD, borderColor: NAVY, borderWidth: 0.5 });
  page.drawText("GDF", {
    x: x + (size - fonts.bold.widthOfTextAtSize("GDF", 7)) / 2,
    y: y + size / 2 - 3,
    size: 7,
    font: fonts.bold,
    color: WHITE,
  });
}

function drawGoldRule(page: PDFPage, y: number) {
  page.drawLine({
    start: { x: MARGIN, y },
    end: { x: CARD_W - MARGIN, y },
    thickness: 1.2,
    color: GOLD,
  });
}

function drawCardChrome(page: PDFPage) {
  page.drawRectangle({
    x: 1.2,
    y: 1.2,
    width: CARD_W - 2.4,
    height: CARD_H - 2.4,
    borderColor: BORDER,
    borderWidth: 0.6,
    color: WHITE,
  });
  page.drawRectangle({
    x: 0,
    y: 0,
    width: CARD_W,
    height: CARD_H,
    borderColor: rgb(0.78, 0.8, 0.84),
    borderWidth: 0.4,
    color: WHITE,
  });
}

function drawSectionLabel(page: PDFPage, label: string, x: number, y: number, fonts: Fonts) {
  page.drawText(label.toUpperCase(), {
    x,
    y,
    size: 5,
    font: fonts.bold,
    color: NAVY,
  });
}

function drawFrontPage(
  page: PDFPage,
  input: IdCardPdfInput,
  fonts: Fonts,
  logo: Awaited<ReturnType<typeof tryEmbedLogo>>,
  photo: Awaited<ReturnType<typeof tryEmbedPhoto>>,
  qrFront: Awaited<ReturnType<typeof generateQrImage>>
) {
  drawCardChrome(page);

  const headerArea = col(0, 12);
  const headerH = 28;
  const headerY = CARD_H - MARGIN - headerH;

  const logoSize = 18;
  const logoY = headerY + (headerH - logoSize) / 2;
  if (logo) {
    const dims = logo.scale(logoSize / logo.width);
    page.drawImage(logo, { x: headerArea.x, y: logoY, width: dims.width, height: dims.height });
    page.drawText(fitText(COMPANY.shortName, 24), {
      x: headerArea.x + logoSize + 5,
      y: headerY + 14,
      size: 6.8,
      font: fonts.bold,
      color: NAVY,
    });
    page.drawText("Employee Identity Card", {
      x: headerArea.x + logoSize + 5,
      y: headerY + 5,
      size: 4.8,
      font: fonts.regular,
      color: MUTED,
    });
  } else {
    drawLogoMark(page, headerArea.x, logoY, logoSize, fonts);
    page.drawText(fitText(COMPANY.shortName, 24), {
      x: headerArea.x + logoSize + 5,
      y: headerY + 14,
      size: 6.8,
      font: fonts.bold,
      color: NAVY,
    });
    page.drawText("Employee Identity Card", {
      x: headerArea.x + logoSize + 5,
      y: headerY + 5,
      size: 4.8,
      font: fonts.regular,
      color: MUTED,
    });
  }

  drawGoldRule(page, headerY - 4);

  const photoW = 64;
  const photoH = 80;
  const photoX = (CARD_W - photoW) / 2;
  const photoY = headerY - 12 - photoH;

  page.drawRectangle({
    x: photoX - 1.5,
    y: photoY - 1.5,
    width: photoW + 3,
    height: photoH + 3,
    color: LIGHT,
    borderColor: GOLD,
    borderWidth: 0.8,
  });
  page.drawRectangle({
    x: photoX,
    y: photoY,
    width: photoW,
    height: photoH,
    color: LIGHT,
    borderColor: NAVY,
    borderWidth: 0.4,
  });

  if (photo) {
    page.drawImage(photo, { x: photoX + 1, y: photoY + 1, width: photoW - 2, height: photoH - 2 });
  } else {
    const ph = "Photo";
    page.drawText(ph, {
      x: centerX(fonts.regular, ph, 7, { x: photoX, w: photoW }),
      y: photoY + photoH / 2 - 3,
      size: 7,
      font: fonts.regular,
      color: MUTED,
    });
  }

  const infoArea = col(1, 10);
  let y = photoY - 14;
  const name = fitText(input.fullName, 34);

  page.drawText(name, {
    x: centerX(fonts.bold, name, 11, infoArea),
    y,
    size: 11,
    font: fonts.bold,
    color: NAVY,
  });
  y -= 13;

  const empId = fitText(input.employeeId || "—", 24);
  page.drawText(empId, {
    x: centerX(fonts.bold, empId, 8.5, infoArea),
    y,
    size: 8.5,
    font: fonts.bold,
    color: GOLD,
  });
  y -= 12;

  const designation = fitText(formatDesignation(input.designation), 32);
  page.drawText(designation, {
    x: centerX(fonts.regular, designation, 7.5, infoArea),
    y,
    size: 7.5,
    font: fonts.regular,
    color: TEXT,
  });
  y -= 11;

  const department = fitText(formatDepartment(input.department), 34);
  page.drawText(department, {
    x: centerX(fonts.regular, department, 7, infoArea),
    y,
    size: 7,
    font: fonts.regular,
    color: MUTED,
  });

  const qrSize = 34;
  const qrY = MARGIN + 28;
  const qrX = (CARD_W - qrSize) / 2;
  page.drawImage(qrFront, { x: qrX, y: qrY, width: qrSize, height: qrSize });
  page.drawText("Scan to verify", {
    x: centerX(fonts.regular, "Scan to verify", 4.5, { x: MARGIN, w: CONTENT_W }),
    y: qrY - 6,
    size: 4.5,
    font: fonts.regular,
    color: MUTED,
  });

  const tagline = COMPANY.idCardTagline;
  page.drawText(tagline, {
    x: centerX(fonts.regular, tagline, 5.2, { x: MARGIN, w: CONTENT_W }),
    y: MARGIN + 10,
    size: 5.2,
    font: fonts.regular,
    color: MUTED,
  });
}

function drawBackPage(
  page: PDFPage,
  input: IdCardPdfInput,
  fonts: Fonts,
  logo: Awaited<ReturnType<typeof tryEmbedLogo>>,
  qrBack: Awaited<ReturnType<typeof generateQrImage>>
) {
  drawCardChrome(page);

  const headerH = 26;
  const headerY = CARD_H - MARGIN - headerH;
  const logoSize = 16;
  const logoY = headerY + (headerH - logoSize) / 2;

  if (logo) {
    const dims = logo.scale(logoSize / logo.width);
    page.drawImage(logo, {
      x: (CARD_W - dims.width) / 2,
      y: logoY,
      width: dims.width,
      height: dims.height,
    });
  } else {
    drawLogoMark(page, (CARD_W - logoSize) / 2, logoY, logoSize, fonts);
  }

  drawGoldRule(page, headerY - 3);

  const area = col(0, 12);
  let y = headerY - 14;

  page.drawText(fitText(COMPANY.name, 42), {
    x: centerX(fonts.bold, fitText(COMPANY.name, 42), 7.2, area),
    y,
    size: 7.2,
    font: fonts.bold,
    color: NAVY,
  });
  y -= 14;

  drawSectionLabel(page, "Registered Office", area.x, y, fonts);
  y -= 9;
  const address = `${COMPANY.address.line1}, ${COMPANY.address.line3}`;
  page.drawText(fitText(address, 58), { x: area.x, y, size: 6, font: fonts.regular, color: TEXT, maxWidth: area.w });
  y -= 9;
  page.drawText(fitText(COMPANY.address.line4, 40), { x: area.x, y, size: 6, font: fonts.regular, color: MUTED });

  y -= 12;
  drawGoldRule(page, y);
  y -= 11;

  drawSectionLabel(page, "Contact", area.x, y, fonts);
  y -= 9;
  page.drawText(`Email: ${fitText(COMPANY.hrEmail, 36)}`, { x: area.x, y, size: 6, font: fonts.regular, color: TEXT });
  y -= 9;
  page.drawText(`Web: ${COMPANY.website}`, { x: area.x, y, size: 6, font: fonts.regular, color: TEXT });
  y -= 9;
  page.drawText(`Phone: ${COMPANY.hrPhone}`, { x: area.x, y, size: 6, font: fonts.regular, color: TEXT });

  y -= 12;
  drawSectionLabel(page, "Emergency Contact", area.x, y, fonts);
  y -= 9;
  const ecName = fitText(input.emergencyContactName || "—", 28);
  const ecPhone = fitText(input.emergencyContactPhone || input.phone, 18);
  page.drawText(`${ecName} · ${ecPhone}`, {
    x: area.x,
    y,
    size: 6,
    font: fonts.regular,
    color: TEXT,
    maxWidth: area.w,
  });

  y -= 14;
  page.drawRectangle({
    x: area.x,
    y: y - 28,
    width: area.w,
    height: 30,
    color: LIGHT,
    borderColor: BORDER,
    borderWidth: 0.5,
  });
  drawSectionLabel(page, "Important", area.x + 4, y - 8, fonts);
  const notice =
    "This card remains property of GDF Finance Advisory Pvt Ltd and must be returned upon request.";
  page.drawText(notice, {
    x: area.x + 4,
    y: y - 18,
    size: 5.5,
    font: fonts.regular,
    color: MUTED,
    maxWidth: area.w - 8,
    lineHeight: 7,
  });

  y -= 42;
  const footerArea = col(0, 8);
  page.drawText(`Issued: ${formatDate(parseDate(input.issueDate))}`, {
    x: footerArea.x,
    y,
    size: 5.5,
    font: fonts.regular,
    color: TEXT,
  });
  y -= 9;
  page.drawText(`Valid until: ${validityDate(input.issueDate)}`, {
    x: footerArea.x,
    y,
    size: 5.5,
    font: fonts.regular,
    color: TEXT,
  });

  page.drawLine({
    start: { x: footerArea.x, y: y - 8 },
    end: { x: footerArea.x + 58, y: y - 8 },
    thickness: 0.4,
    color: TEXT,
  });
  page.drawText("HR Authorized Signature", {
    x: footerArea.x,
    y: y - 14,
    size: 4.8,
    font: fonts.regular,
    color: MUTED,
  });

  const qrSize = 30;
  page.drawImage(qrBack, {
    x: col(9, 3).x + 2,
    y: MARGIN + 18,
    width: qrSize,
    height: qrSize,
  });
  page.drawText("Scan to verify", {
    x: col(9, 3).x,
    y: MARGIN + 12,
    size: 4.2,
    font: fonts.regular,
    color: MUTED,
  });
}

export async function generateIdCardPdf(input: IdCardPdfInput): Promise<Uint8Array> {
  const pdfDoc = await PDFDocument.create();
  const fonts: Fonts = {
    regular: await pdfDoc.embedFont(StandardFonts.Helvetica),
    bold: await pdfDoc.embedFont(StandardFonts.HelveticaBold),
  };
  const logo = await tryEmbedLogo(pdfDoc);
  const photo = await tryEmbedPhoto(pdfDoc, input.photoPath);

  const verifyUrl =
    input.verificationUrl ??
    appApiUrl(`/api/employees/verify?code=${encodeURIComponent(input.employeeId)}`);

  const qrFront = await generateQrImage(pdfDoc, verifyUrl, 120);
  const qrBack = await generateQrImage(pdfDoc, verifyUrl, 100);

  const frontPage = pdfDoc.addPage([CARD_W, CARD_H]);
  drawFrontPage(frontPage, input, fonts, logo, photo, qrFront);

  const backPage = pdfDoc.addPage([CARD_W, CARD_H]);
  drawBackPage(backPage, input, fonts, logo, qrBack);

  return pdfDoc.save();
}

export function buildIdCardFileName(registrationId?: string | null) {
  const stamp = new Date().toISOString().slice(0, 10).replace(/-/g, "");
  const ref = (registrationId ?? "CAND").replace(/[^a-zA-Z0-9]/g, "").slice(0, 12);
  return `ID-CARD-${ref}-${stamp}.pdf`;
}

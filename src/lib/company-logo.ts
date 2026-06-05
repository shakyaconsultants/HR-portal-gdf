import { readFileSync } from "fs";
import path from "path";
import { getAppBaseUrl } from "@/lib/app-url";
import { COMPANY } from "@/lib/company";

/** Inline SVG logo — always loads in email clients (no external fetch). */
const EMBEDDED_LOGO_SVG = `<svg xmlns="http://www.w3.org/2000/svg" width="120" height="120" viewBox="0 0 120 120" role="img" aria-label="GDF Finance Advisory">
  <defs>
    <linearGradient id="g" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#0b1f3a"/>
      <stop offset="100%" stop-color="#1a4d8c"/>
    </linearGradient>
  </defs>
  <rect width="120" height="120" rx="18" fill="url(#g)"/>
  <path d="M60 22 L88 60 L60 98 L32 60 Z" fill="none" stroke="#c9a227" stroke-width="4"/>
  <text x="60" y="68" text-anchor="middle" font-family="Arial,Helvetica,sans-serif" font-size="28" font-weight="700" fill="#ffffff">GDF</text>
</svg>`;

export function getEmbeddedCompanyLogoDataUri() {
  return `data:image/svg+xml;base64,${Buffer.from(EMBEDDED_LOGO_SVG).toString("base64")}`;
}

/** Public site logo path (served from /public). */
export function getPublicCompanyLogoPath() {
  return COMPANY.logoPath;
}

/** Absolute URL for web UI; emails should use the embedded data URI instead. */
export function getPublicCompanyLogoUrl(baseUrl = getAppBaseUrl()) {
  const logoPath = getPublicCompanyLogoPath();
  return `${baseUrl}${logoPath.startsWith("/") ? logoPath : `/${logoPath}`}`;
}

let cachedPublicLogoDataUri: string | null = null;

/** Prefer the file in /public when present; otherwise use the embedded SVG. */
export function getCompanyLogoForEmail() {
  if (cachedPublicLogoDataUri) return cachedPublicLogoDataUri;

  try {
    const filePath = path.join(process.cwd(), "public", getPublicCompanyLogoPath().replace(/^\//, ""));
    const ext = path.extname(filePath).toLowerCase();
    if (ext === ".svg") {
      const svg = readFileSync(filePath, "utf8");
      cachedPublicLogoDataUri = `data:image/svg+xml;base64,${Buffer.from(svg).toString("base64")}`;
      return cachedPublicLogoDataUri;
    }
    if ([".png", ".jpg", ".jpeg", ".webp", ".gif"].includes(ext)) {
      const buf = readFileSync(filePath);
      const mime =
        ext === ".png"
          ? "image/png"
          : ext === ".webp"
            ? "image/webp"
            : ext === ".gif"
              ? "image/gif"
              : "image/jpeg";
      cachedPublicLogoDataUri = `data:${mime};base64,${buf.toString("base64")}`;
      return cachedPublicLogoDataUri;
    }
  } catch {
    // fall through to embedded logo
  }

  cachedPublicLogoDataUri = getEmbeddedCompanyLogoDataUri();
  return cachedPublicLogoDataUri;
}

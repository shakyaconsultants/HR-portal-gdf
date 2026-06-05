/**
 * Public site URL helpers — for shareable links only (emails, QR codes, registration URLs).
 *
 * Server components and API routes must NOT HTTP-fetch their own /api routes.
 * Call lib/service functions directly (e.g. getDashboardStats) instead.
 */

function parseOrigin(raw: string) {
  let candidate = raw.trim().replace(/\/+$/, "");
  const originMatch = candidate.match(/^(https?:\/\/[^/]+)/i);
  if (originMatch) {
    candidate = originMatch[1];
  }

  try {
    const withProtocol = /^https?:\/\//i.test(candidate) ? candidate : `https://${candidate}`;
    return new URL(withProtocol).origin;
  } catch {
    return null;
  }
}

/** Public origin for links sent to users (emails, PDFs, QR codes). */
export function getPublicAppBaseUrl() {
  const explicit = process.env.NEXT_PUBLIC_APP_URL?.trim();
  if (explicit) {
    const origin = parseOrigin(explicit);
    if (origin) return origin;
  }

  const productionUrl = process.env.VERCEL_PROJECT_PRODUCTION_URL?.trim();
  if (productionUrl) {
    const origin = parseOrigin(productionUrl);
    if (origin) return origin;
  }

  const vercelUrl = process.env.VERCEL_URL?.trim();
  if (vercelUrl) {
    const origin = parseOrigin(vercelUrl);
    if (origin) return origin;
  }

  return "http://localhost:3000";
}

/** @deprecated Prefer getPublicAppBaseUrl — name kept for existing imports. */
export const getAppBaseUrl = getPublicAppBaseUrl;

/** Resolve public origin from the active HTTP request when env is unset. */
export async function getPublicAppBaseUrlFromRequest() {
  try {
    const { headers } = await import("next/headers");
    const headerList = await headers();
    const host = headerList.get("x-forwarded-host") ?? headerList.get("host");
    if (host) {
      const proto = headerList.get("x-forwarded-proto") ?? (process.env.NODE_ENV === "production" ? "https" : "http");
      const origin = parseOrigin(`${proto}://${host}`);
      if (origin) return origin;
    }
  } catch {
    // headers() unavailable outside a request context
  }

  return getPublicAppBaseUrl();
}

/** Absolute public URL for a path (e.g. /apply/token, /api/employees/verify). */
export function publicAppPath(path: string, baseUrl = getPublicAppBaseUrl()) {
  const normalizedPath = path.startsWith("/") ? path : `/${path}`;
  return `${baseUrl}${normalizedPath}`;
}

/** Public URL using request host when available (best for QR/links generated during API calls). */
export async function publicAppPathFromRequest(path: string) {
  const base = await getPublicAppBaseUrlFromRequest();
  return publicAppPath(path, base);
}

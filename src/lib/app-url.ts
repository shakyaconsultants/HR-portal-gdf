/** Normalized app base URL for server/client fetches and share links. */
export function getAppBaseUrl() {
  const raw = process.env.NEXT_PUBLIC_APP_URL?.trim();
  if (!raw) return "http://localhost:3000";

  let candidate = raw.replace(/\/+$/, "");
  // Recover from accidental paste e.g. http://localhost:3000image.png
  const originMatch = candidate.match(/^(https?:\/\/[^/]+)/i);
  if (originMatch) {
    candidate = originMatch[1];
  }

  try {
    const url = new URL(candidate);
    return url.origin;
  } catch {
    return "http://localhost:3000";
  }
}

export function appApiUrl(path: string) {
  const base = getAppBaseUrl();
  const normalizedPath = path.startsWith("/") ? path : `/${path}`;
  return `${base}${normalizedPath}`;
}

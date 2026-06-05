export const REGISTRATION_LINK_VALIDITY_DAYS = 3;

export function computeRegistrationExpiry(from: Date = new Date()) {
  const expires = new Date(from);
  expires.setDate(expires.getDate() + REGISTRATION_LINK_VALIDITY_DAYS);
  return expires;
}

export function formatRegistrationExpiryDate(date: Date | string) {
  return new Date(date).toLocaleString("en-IN", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "Asia/Kolkata",
  });
}

export function isRegistrationExpired(
  expiresAt: Date | string | null | undefined,
  now: Date = new Date()
) {
  if (!expiresAt) return false;
  return new Date(expiresAt).getTime() < now.getTime();
}

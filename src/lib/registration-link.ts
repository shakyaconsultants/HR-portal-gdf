import { randomBytes } from "crypto";
import { getAppBaseUrl } from "@/lib/app-url";

export function generateRegistrationToken() {
  return randomBytes(24).toString("base64url");
}

export function buildRegistrationLink(token: string, baseUrl = getAppBaseUrl()) {
  return `${baseUrl}/apply/${token}`;
}

export function isValidRegistrationToken(token: string) {
  return typeof token === "string" && token.length >= 16;
}

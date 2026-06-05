import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";
import { NextRequest, NextResponse } from "next/server";
import { UserRole } from "@/lib/constants";

export const AUTH_COOKIE = "tp_auth";

export type AuthPayload = {
  userId: string;
  role: UserRole;
  name: string;
  email: string;
};

function getSecretKey() {
  const secret = process.env.JWT_SECRET?.trim();
  if (!secret) {
    throw new Error("Missing JWT_SECRET in environment.");
  }
  return new TextEncoder().encode(secret);
}

export const authCookieOptions = {
  httpOnly: true,
  sameSite: "lax" as const,
  secure: process.env.NODE_ENV === "production",
  path: "/",
  maxAge: 60 * 60 * 24 * 7,
};

export async function signAuthToken(payload: AuthPayload) {
  return new SignJWT({ ...payload })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("7d")
    .sign(getSecretKey());
}

export async function verifyAuthToken(token: string): Promise<AuthPayload> {
  const { payload } = await jwtVerify(token, getSecretKey());
  return payload as unknown as AuthPayload;
}

export function attachAuthCookie(response: NextResponse, token: string) {
  response.cookies.set(AUTH_COOKIE, token, authCookieOptions);
  return response;
}

export async function setAuthCookie(token: string) {
  const cookieStore = await cookies();
  cookieStore.set(AUTH_COOKIE, token, authCookieOptions);
}

export async function clearAuthCookie() {
  const cookieStore = await cookies();
  cookieStore.set(AUTH_COOKIE, "", { ...authCookieOptions, maxAge: 0 });
}

export async function getRequestUser(request: NextRequest): Promise<AuthPayload | null> {
  const token = request.cookies.get(AUTH_COOKIE)?.value;
  if (!token) {
    return null;
  }
  try {
    return await verifyAuthToken(token);
  } catch {
    return null;
  }
}

export function requireRole(role: UserRole, allowedRoles: UserRole[]) {
  return allowedRoles.includes(role);
}

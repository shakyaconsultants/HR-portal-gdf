import { NextRequest, NextResponse } from "next/server";
import { getRequestUser, requireRole } from "@/lib/auth";
import { UserRole } from "@/lib/constants";

export function apiOk(data: unknown, status = 200) {
  return NextResponse.json({ ok: true, data }, { status });
}

export function apiError(message: string, status = 400, code?: string) {
  return NextResponse.json({ ok: false, message, code }, { status });
}

export async function requireAuth(request: NextRequest, allowedRoles?: UserRole[]) {
  const authUser = await getRequestUser(request);
  if (!authUser) {
    return { error: apiError("Unauthorized", 401), user: null };
  }

  if (allowedRoles && !requireRole(authUser.role, allowedRoles)) {
    return { error: apiError("Forbidden", 403), user: null };
  }

  return { error: null, user: authUser };
}

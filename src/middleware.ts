import { NextRequest, NextResponse } from "next/server";
import { getRequestUser } from "@/lib/auth";

const protectedRoutes = [
  "/dashboard",
  "/leads",
  "/interviews",
  "/letter-of-intent",
  "/registrations",
  "/verification",
  "/batches",
  "/evaluations",
  "/hiring-decisions",
  "/communications",
  "/email",
  "/onboarding",
  "/employees",
  "/candidates",
  "/settings",
  "/training",
];

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const isProtected = protectedRoutes.some((route) => pathname === route || pathname.startsWith(`${route}/`));
  if (!isProtected) {
    return NextResponse.next();
  }

  const user = await getRequestUser(request);
  if (!user) {
    const loginUrl = new URL("/", request.url);
    loginUrl.searchParams.set("reason", "session");
    return NextResponse.redirect(loginUrl);
  }
  return NextResponse.next();
}

export const config = {
  matcher: [
    "/dashboard",
    "/dashboard/:path*",
    "/leads",
    "/leads/:path*",
    "/interviews",
    "/interviews/:path*",
    "/letter-of-intent",
    "/letter-of-intent/:path*",
    "/registrations",
    "/registrations/:path*",
    "/verification",
    "/verification/:path*",
    "/batches",
    "/batches/:path*",
    "/evaluations",
    "/evaluations/:path*",
    "/hiring-decisions",
    "/hiring-decisions/:path*",
    "/communications",
    "/communications/:path*",
    "/email",
    "/email/:path*",
    "/onboarding",
    "/onboarding/:path*",
    "/employees",
    "/employees/:path*",
    "/candidates",
    "/candidates/:path*",
    "/settings",
    "/settings/:path*",
    "/training",
    "/training/:path*",
  ],
};

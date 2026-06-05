import { NextRequest } from "next/server";
import { apiError, apiOk } from "@/lib/api";
import { getRequestUser } from "@/lib/auth";

export async function GET(request: NextRequest) {
  const user = await getRequestUser(request);
  if (!user) {
    return apiError("Unauthorized", 401);
  }
  return apiOk({ user });
}


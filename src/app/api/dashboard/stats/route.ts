import { NextRequest } from "next/server";
import { apiOk, requireAuth } from "@/lib/api";
import { getDashboardStats } from "@/lib/dashboard-stats";

export async function GET(request: NextRequest) {
  const auth = await requireAuth(request, ["ADMIN", "HR", "TRAINER"]);
  if (auth.error) {
    return auth.error;
  }

  const stats = await getDashboardStats();
  return apiOk(stats);
}

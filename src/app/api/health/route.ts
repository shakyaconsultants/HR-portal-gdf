import { pingDb } from "@/lib/db";
import { apiError, apiOk } from "@/lib/api";
import { getServerConfigError } from "@/lib/config";

export async function GET() {
  const configError = getServerConfigError();
  if (configError) {
    return apiError(configError, 503, "CONFIG");
  }

  const ok = await pingDb();
  if (!ok) {
    return apiError("Database connection failed.", 503, "DB_UNAVAILABLE");
  }

  return apiOk({ database: "connected" });
}


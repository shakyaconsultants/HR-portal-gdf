import { apiOk } from "@/lib/api";
import { clearAuthCookie } from "@/lib/auth";

export async function POST() {
  await clearAuthCookie();
  return apiOk({ loggedOut: true });
}


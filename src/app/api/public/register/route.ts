import { NextRequest } from "next/server";
import { apiError } from "@/lib/api";

/** Direct access to /apply without a token is not permitted. */
export async function POST(_request: NextRequest) {
  return apiError(
    "Registration requires the unique link sent with your Letter of Intent. Open that link to complete the form.",
    403
  );
}

export async function GET() {
  return apiError(
    "Registration requires the unique link sent with your Letter of Intent.",
    403
  );
}

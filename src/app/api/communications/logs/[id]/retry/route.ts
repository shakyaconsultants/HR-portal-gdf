import { Types } from "mongoose";
import { NextRequest } from "next/server";
import { connectDb } from "@/lib/db";
import { apiError, apiOk, requireAuth } from "@/lib/api";
import { sanitizeDeliveryError } from "@/lib/delivery-errors";
import { retryFailedEmail } from "@/lib/email-service";

type Params = { params: Promise<{ id: string }> };

export async function POST(request: NextRequest, { params }: Params) {
  const auth = await requireAuth(request, ["ADMIN", "HR"]);
  if (auth.error || !auth.user) return auth.error;

  const { id } = await params;
  if (!Types.ObjectId.isValid(id)) return apiError("Invalid log id", 422);

  await connectDb();

  try {
    const result = await retryFailedEmail(id, {
      userId: auth.user.userId,
      name: auth.user.name,
    });
    return apiOk(
      {
        ...result,
        errorMessage: result.errorMessage ? sanitizeDeliveryError(result.errorMessage) : "",
        delivered: result.status === "SENT",
      },
      200
    );
  } catch (error) {
    const raw = error instanceof Error ? error.message : "Unable to retry email";
    return apiError(sanitizeDeliveryError(raw), 409);
  }
}

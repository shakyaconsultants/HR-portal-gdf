import { Types } from "mongoose";
import { NextRequest } from "next/server";
import { connectDb } from "@/lib/db";
import { apiError, apiOk, requireAuth } from "@/lib/api";
import { sanitizeDeliveryError } from "@/lib/delivery-errors";
import {
  generateAndTransferIdCard,
  getIdCardStatus,
  sendIdCardEmail,
} from "@/lib/id-card-service";

type Params = { params: Promise<{ candidateId: string }> };

export async function GET(_request: NextRequest, { params }: Params) {
  const auth = await requireAuth(_request, ["ADMIN", "HR"]);
  if (auth.error) return auth.error;

  const { candidateId } = await params;
  if (!Types.ObjectId.isValid(candidateId)) return apiError("Invalid candidate id", 422);

  await connectDb();
  const status = await getIdCardStatus(candidateId);
  if (!status) return apiError("Candidate not found", 404);

  return apiOk(status);
}

export async function POST(request: NextRequest, { params }: Params) {
  const auth = await requireAuth(request, ["ADMIN", "HR"]);
  if (auth.error || !auth.user) return auth.error;

  const { candidateId } = await params;
  if (!Types.ObjectId.isValid(candidateId)) return apiError("Invalid candidate id", 422);

  const body = (await request.json()) as { action?: string };
  const action = body.action === "send" ? "send" : "generate";

  try {
    if (action === "generate") {
      const result = await generateAndTransferIdCard(candidateId, {
        userId: auth.user.userId,
        name: auth.user.name,
        role: auth.user.role,
      });
      return apiOk(
        {
          ...result,
          message: "ID card generated. Candidate transferred to Employee.",
          employeesUrl: "/employees",
        },
        201
      );
    }

    const result = await sendIdCardEmail(candidateId, {
      userId: auth.user.userId,
      name: auth.user.name,
      role: auth.user.role,
    });
    return apiOk({ ...result, message: "ID card sent to candidate email." });
  } catch (error) {
    const raw = error instanceof Error ? error.message : "Unable to process ID card request";
    return apiError(sanitizeDeliveryError(raw), 409);
  }
}

import { Types } from "mongoose";
import { NextRequest } from "next/server";
import { connectDb } from "@/lib/db";
import { apiError, apiOk, requireAuth } from "@/lib/api";
import { sanitizeDeliveryError } from "@/lib/delivery-errors";
import { CommunicationLog } from "@/models/CommunicationLog";

type Params = { params: Promise<{ candidateId: string }> };

export async function GET(request: NextRequest, { params }: Params) {
  const auth = await requireAuth(request, ["ADMIN", "HR"]);
  if (auth.error) return auth.error;

  const { candidateId } = await params;
  if (!Types.ObjectId.isValid(candidateId)) return apiError("Invalid candidate id", 422);

  await connectDb();

  const items = await CommunicationLog.find({ candidateId })
    .sort({ sentAt: -1, createdAt: -1 })
    .limit(50)
    .lean();

  return apiOk({
    items: items.map((h) => ({
      id: h._id.toString(),
      type: h.type,
      subject: h.subject,
      sentToEmail: h.sentToEmail,
      status: h.status,
      sentByName: h.sentByName,
      sentAt: h.sentAt ?? h.createdAt,
      attachmentCount: h.attachments?.length ?? 0,
      attachments: (h.attachments ?? []).map((a) => ({
        fileName: a.fileName,
        storagePath: a.storagePath,
        mimeType: a.mimeType,
      })),
      hasHtml: Boolean(h.htmlBody),
      errorMessage: h.errorMessage ? sanitizeDeliveryError(h.errorMessage) : "",
    })),
  });
}

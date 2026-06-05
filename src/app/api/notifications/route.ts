import { Types } from "mongoose";
import { NextRequest } from "next/server";
import { connectDb } from "@/lib/db";
import { apiError, apiOk, requireAuth } from "@/lib/api";
import { StaffNotification } from "@/models/StaffNotification";

export async function GET(request: NextRequest) {
  const auth = await requireAuth(request, ["ADMIN", "HR"]);
  if (auth.error || !auth.user) return auth.error;

  await connectDb();

  const unreadOnly = request.nextUrl.searchParams.get("unread") === "true";
  const limit = Math.min(Number(request.nextUrl.searchParams.get("limit") ?? 20), 50);

  const filter: Record<string, unknown> = {
    audienceRoles: auth.user.role,
  };
  if (unreadOnly) {
    filter.readBy = { $ne: new Types.ObjectId(auth.user.userId) };
  }

  const items = await StaffNotification.find(filter)
    .sort({ createdAt: -1 })
    .limit(limit)
    .lean();

  const unreadCount = await StaffNotification.countDocuments({
    audienceRoles: auth.user.role,
    readBy: { $ne: new Types.ObjectId(auth.user.userId) },
  });

  return apiOk({
    unreadCount,
    items: items.map((n) => ({
      id: n._id.toString(),
      type: n.type,
      title: n.title,
      message: n.message,
      candidateId: n.candidateId.toString(),
      registrationId: n.registrationId,
      read: n.readBy?.some((id) => id.toString() === auth.user!.userId) ?? false,
      createdAt: n.createdAt,
    })),
  });
}

export async function PATCH(request: NextRequest) {
  const auth = await requireAuth(request, ["ADMIN", "HR"]);
  if (auth.error || !auth.user) return auth.error;

  await connectDb();
  const body = await request.json();
  const ids = Array.isArray(body.ids) ? body.ids.filter((id: string) => Types.ObjectId.isValid(id)) : [];
  const markAll = body.all === true;

  if (!markAll && ids.length === 0) {
    return apiError("Provide ids or all: true", 422);
  }

  const userId = new Types.ObjectId(auth.user.userId);
  const filter: Record<string, unknown> = markAll
    ? { audienceRoles: auth.user.role, readBy: { $ne: userId } }
    : { _id: { $in: ids }, audienceRoles: auth.user.role };

  await StaffNotification.updateMany(filter, { $addToSet: { readBy: userId } });

  return apiOk({ marked: true });
}

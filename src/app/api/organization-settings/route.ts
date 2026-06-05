import { Types } from "mongoose";
import { NextRequest } from "next/server";
import { connectDb } from "@/lib/db";
import { apiError, apiOk, requireAuth } from "@/lib/api";
import { getOrganizationSettings, ensureOrganizationSettings } from "@/lib/organization-settings";
import { isSmtpConfigured } from "@/lib/smtp";
import { updateOrganizationSettingsSchema } from "@/lib/validators";
import { OrganizationSettings } from "@/models/OrganizationSettings";

function serializeSettings(doc: Awaited<ReturnType<typeof getOrganizationSettings>>) {
  return {
    companyName: doc.companyName,
    companyTagline: doc.companyTagline,
    companyAddressLine1: doc.companyAddressLine1,
    companyAddressLine2: doc.companyAddressLine2,
    companyAddressLine3: doc.companyAddressLine3,
    companyAddressLine4: doc.companyAddressLine4,
    hrName: doc.hrName,
    hrDesignation: doc.hrDesignation,
    hrEmail: doc.hrEmail,
    hrPhone: doc.hrPhone,
    companyLogoPath: doc.companyLogoPath,
    updatedAt: doc.updatedAt,
  };
}

export async function GET(request: NextRequest) {
  const auth = await requireAuth(request, ["ADMIN", "HR"]);
  if (auth.error) return auth.error;

  await connectDb();
  const settings = await getOrganizationSettings();

  return apiOk({
    settings: serializeSettings(settings),
    smtpConfigured: isSmtpConfigured(),
  });
}

export async function PATCH(request: NextRequest) {
  const auth = await requireAuth(request, ["ADMIN", "HR"]);
  if (auth.error || !auth.user) return auth.error;

  await connectDb();
  const body = await request.json();
  const parsed = updateOrganizationSettingsSchema.safeParse(body);
  if (!parsed.success) {
    return apiError(parsed.error.issues[0]?.message ?? "Invalid settings", 422);
  }

  await ensureOrganizationSettings();
  const updated = await OrganizationSettings.findOneAndUpdate(
    { key: "default" },
    { $set: { ...parsed.data, updatedBy: new Types.ObjectId(auth.user.userId) } },
    { new: true }
  ).lean();

  if (!updated) return apiError("Unable to update settings", 500);

  return apiOk({ settings: serializeSettings(updated) });
}

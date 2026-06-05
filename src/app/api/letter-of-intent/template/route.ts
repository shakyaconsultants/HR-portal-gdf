import { Types } from "mongoose";
import { NextRequest } from "next/server";
import { connectDb } from "@/lib/db";
import { apiError, apiOk, requireAuth } from "@/lib/api";
import { storeUploadedFile } from "@/lib/file-storage";
import { getOrganizationSettings, ensureOrganizationSettings } from "@/lib/organization-settings";
import { OrganizationSettings } from "@/models/OrganizationSettings";

export async function GET(request: NextRequest) {
  const auth = await requireAuth(request, ["ADMIN", "HR"]);
  if (auth.error) return auth.error;

  await connectDb();
  const settings = await getOrganizationSettings();
  const templateUrl = String(settings.loiTemplateUrl ?? "").trim();
  const hasTemplate = Boolean(templateUrl);

  return apiOk({
    hasTemplate,
    templatePath: hasTemplate ? templateUrl : null,
    message: hasTemplate
      ? "Company LOI format template is active. Generated PDFs overlay candidate details on this template."
      : "No company template uploaded. Branded default LOI format will be used.",
  });
}

export async function POST(request: NextRequest) {
  const auth = await requireAuth(request, ["ADMIN", "HR"]);
  if (auth.error || !auth.user) return auth.error;

  await connectDb();
  const formData = await request.formData();
  const file = formData.get("template");

  if (!(file instanceof File) || file.size === 0) {
    return apiError("Upload a PDF file as the company LOI format template.", 422);
  }

  if (file.type !== "application/pdf" && !file.name.toLowerCase().endsWith(".pdf")) {
    return apiError("Template must be a PDF file.", 422);
  }

  const stored = await storeUploadedFile(file, "templates/loi", "loi-company-format");

  await ensureOrganizationSettings();
  await OrganizationSettings.findOneAndUpdate(
    { key: "default" },
    {
      $set: {
        loiTemplateUrl: stored.url,
        updatedBy: new Types.ObjectId(auth.user.userId),
      },
    }
  );

  return apiOk({
    uploaded: true,
    templatePath: stored.url,
    uploadedBy: auth.user.name,
  });
}

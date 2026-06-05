import { Types } from "mongoose";
import { NextRequest } from "next/server";
import { connectDb } from "@/lib/db";
import { apiError, apiOk, requireAuth } from "@/lib/api";
import type { EmailTemplateType } from "@/lib/constants";
import { EMAIL_TEMPLATE_TYPES } from "@/lib/constants";
import { mergeTemplateVariables } from "@/lib/email-renderer";
import { updateEmailTemplateSchema } from "@/lib/validators";
import { EmailTemplate } from "@/models/EmailTemplate";

type Params = { params: Promise<{ type: string }> };

export async function GET(_request: NextRequest, { params }: Params) {
  const auth = await requireAuth(_request, ["ADMIN", "HR"]);
  if (auth.error) return auth.error;

  const { type } = await params;
  if (!EMAIL_TEMPLATE_TYPES.includes(type as (typeof EMAIL_TEMPLATE_TYPES)[number])) {
    return apiError("Invalid template type", 422);
  }

  await connectDb();
  const template = await EmailTemplate.findOne({ type: type as EmailTemplateType }).lean();
  if (!template) return apiError("Template not found", 404);

  return apiOk({
    id: template._id.toString(),
    type: template.type,
    name: template.name,
    subject: template.subject,
    htmlBody: template.htmlBody,
    textBody: template.textBody,
    showLogo: template.showLogo,
    actionButton: template.actionButton,
    attachments: template.attachments ?? [],
    variables: template.variables ?? [],
    isActive: template.isActive,
    updatedAt: template.updatedAt,
  });
}

export async function PATCH(request: NextRequest, { params }: Params) {
  const auth = await requireAuth(request, ["ADMIN", "HR"]);
  if (auth.error || !auth.user) return auth.error;

  const { type } = await params;
  if (!EMAIL_TEMPLATE_TYPES.includes(type as (typeof EMAIL_TEMPLATE_TYPES)[number])) {
    return apiError("Invalid template type", 422);
  }

  await connectDb();
  const body = await request.json();
  const parsed = updateEmailTemplateSchema.safeParse(body);
  if (!parsed.success) {
    return apiError(parsed.error.issues[0]?.message ?? "Invalid template data", 422);
  }

  const existing = await EmailTemplate.findOne({ type: type as EmailTemplateType });
  if (!existing) return apiError("Template not found", 404);

  const patch = parsed.data;
  if (patch.subject !== undefined) existing.subject = patch.subject;
  if (patch.name !== undefined) existing.name = patch.name;
  if (patch.htmlBody !== undefined) existing.htmlBody = patch.htmlBody;
  if (patch.textBody !== undefined) existing.textBody = patch.textBody;
  if (patch.showLogo !== undefined) existing.showLogo = patch.showLogo;
  if (patch.actionButton !== undefined) existing.actionButton = patch.actionButton;
  if (patch.attachments !== undefined) existing.set("attachments", patch.attachments);
  if (patch.isActive !== undefined) existing.isActive = patch.isActive;

  existing.variables = mergeTemplateVariables(
    existing.subject,
    existing.htmlBody,
    existing.textBody,
    existing.actionButton?.url ?? "",
    existing.actionButton?.label ?? ""
  );
  existing.updatedBy = new Types.ObjectId(auth.user.userId);
  await existing.save();

  return apiOk({
    id: existing._id.toString(),
    type: existing.type,
    name: existing.name,
    subject: existing.subject,
    updatedAt: existing.updatedAt,
  });
}

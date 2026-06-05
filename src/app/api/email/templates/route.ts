import { NextRequest } from "next/server";
import { connectDb } from "@/lib/db";
import { apiOk, requireAuth } from "@/lib/api";
import { ensureEmailTemplatesSeeded } from "@/lib/email-seed";
import { listAvailableVariables } from "@/lib/email-renderer";
import { EmailTemplate } from "@/models/EmailTemplate";

export async function GET(request: NextRequest) {
  const auth = await requireAuth(request, ["ADMIN", "HR"]);
  if (auth.error) return auth.error;

  await connectDb();
  await ensureEmailTemplatesSeeded();

  const templates = await EmailTemplate.find().sort({ type: 1 }).lean();

  return apiOk({
    variables: listAvailableVariables(),
    templates: templates.map((t) => ({
      id: t._id.toString(),
      type: t.type,
      name: t.name,
      subject: t.subject,
      htmlBody: t.htmlBody,
      textBody: t.textBody,
      showLogo: t.showLogo,
      actionButton: t.actionButton,
      attachments: t.attachments ?? [],
      variables: t.variables ?? [],
      isActive: t.isActive,
      updatedAt: t.updatedAt,
    })),
  });
}

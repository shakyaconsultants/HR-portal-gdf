import { Types } from "mongoose";
import { NextRequest } from "next/server";
import { connectDb } from "@/lib/db";
import { apiError, apiOk, requireAuth } from "@/lib/api";
import { getCompanyLogoForEmail } from "@/lib/company-logo";
import { buildResponsiveEmailHtml } from "@/lib/email-layout";
import { substituteEmailVariables } from "@/lib/email-variables";
import { buildEmailVariableContext, getActiveEmailTemplate } from "@/lib/email-renderer";
import { getOrganizationSettings } from "@/lib/organization-settings";
import { emailPreviewSchema } from "@/lib/validators";
import { Candidate } from "@/models/Candidate";

export async function POST(request: NextRequest) {
  const auth = await requireAuth(request, ["ADMIN", "HR"]);
  if (auth.error) return auth.error;

  await connectDb();
  const body = await request.json();
  const parsed = emailPreviewSchema.safeParse(body);
  if (!parsed.success) {
    return apiError(parsed.error.issues[0]?.message ?? "Invalid preview request", 422);
  }

  const org = await getOrganizationSettings();
  const dbTemplate = await getActiveEmailTemplate(parsed.data.type);

  const candidateId = parsed.data.candidateId;
  const context =
    candidateId && Types.ObjectId.isValid(candidateId)
      ? await buildEmailVariableContext(candidateId)
      : {
          candidateName: "Sample Candidate",
          candidateEmail: "candidate@example.com",
          registrationLink: "https://example.com/apply/sample",
          registrationExpiryDate: "Saturday, 7 June 2026, 04:30 pm",
          onboardingLink: "https://example.com/onboard/sample",
          joiningDate: "15 July 2026",
          interviewDate: "Monday, 10 June 2026",
          interviewTime: "10:30 AM",
          interviewMode: "Google Meet",
          designation: "Sales Trainee",
          ctc: "₹3,00,000",
          companyName: org.companyName,
          companyAddress: `${org.companyAddressLine3}, ${org.companyAddressLine4}`,
          companyTagline: org.companyTagline,
          hrName: org.hrName,
          hrDesignation: org.hrDesignation,
          hrEmail: org.hrEmail || "hr@example.com",
          hrPhone: org.hrPhone || "+91 98765 43210",
        };

  const subject = substituteEmailVariables(
    parsed.data.subject ?? dbTemplate?.subject ?? "Email Preview",
    context
  );
  const innerHtml = substituteEmailVariables(
    parsed.data.htmlBody ?? dbTemplate?.htmlBody ?? "<p>Preview body</p>",
    context
  );
  const textBody = substituteEmailVariables(
    parsed.data.textBody ?? dbTemplate?.textBody ?? "",
    context
  );

  const actionButtonConfig = parsed.data.actionButton ?? dbTemplate?.actionButton;
  const actionButton =
    actionButtonConfig?.enabled && actionButtonConfig.url
      ? {
          label: substituteEmailVariables(actionButtonConfig.label, context),
          url: substituteEmailVariables(actionButtonConfig.url, context),
        }
      : null;

  const htmlBody = buildResponsiveEmailHtml({
    subject,
    companyName: org.companyName,
    companyTagline: org.companyTagline,
    logoUrl: getCompanyLogoForEmail(),
    showLogo: parsed.data.showLogo ?? dbTemplate?.showLogo ?? true,
    bodyHtml: innerHtml,
    actionButton,
  });

  return apiOk({ subject, textBody, htmlBody, context });
}

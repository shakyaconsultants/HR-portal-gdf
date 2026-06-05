import "server-only";
import { Types } from "mongoose";
import type { CommunicationType, EmailTemplateType } from "@/lib/constants";
import { connectDb } from "@/lib/db";
import { formatInterviewMode } from "@/lib/interview-display";
import { buildOnboardingLinks } from "@/lib/onboarding";
import { buildRegistrationLink } from "@/lib/registration-link";
import {
  EMAIL_VARIABLE_KEYS,
  extractVariablesFromText,
  formatCompanyAddress,
  substituteEmailVariables,
  type EmailVariableContext,
} from "@/lib/email-variables";
import { getCompanyLogoForEmail } from "@/lib/company-logo";
import { formatRegistrationExpiryDate } from "@/lib/registration-expiry";
import { buildResponsiveEmailHtml, textToEmailHtmlParagraphs } from "@/lib/email-layout";
import { ensureEmailTemplatesSeeded } from "@/lib/email-seed";
import { getOrganizationSettings } from "@/lib/organization-settings";
import { Candidate } from "@/models/Candidate";
import { Lead } from "@/models/Lead";
import { EmailTemplate } from "@/models/EmailTemplate";
import { Interview } from "@/models/Interview";
import { Onboarding } from "@/models/Onboarding";

export type EmailRenderExtras = {
  registrationLink?: string;
  registrationExpiryDate?: string;
  onboardingLink?: string;
  joiningFormLink?: string;
  idCardFormLink?: string;
  joiningDate?: string;
  interviewId?: string;
  candidateName?: string;
  designation?: string;
  department?: string;
  ctc?: string;
  reportingManager?: string;
  offerDate?: string;
};

export async function buildEmailVariableContextFromLead(
  leadId: string | Types.ObjectId,
  extras: EmailRenderExtras = {}
): Promise<EmailVariableContext> {
  await connectDb();
  const lead = await Lead.findById(leadId).lean();
  if (!lead) throw new Error("Lead not found");

  const org = await getOrganizationSettings();

  const interview =
    extras.interviewId && Types.ObjectId.isValid(extras.interviewId)
      ? await Interview.findById(extras.interviewId).lean()
      : await Interview.findOne({ leadId: lead._id }).sort({ interviewDate: -1 }).lean();

  const registrationLink =
    extras.registrationLink ??
    (lead.registrationToken ? buildRegistrationLink(lead.registrationToken) : "");

  const registrationExpiryDate =
    extras.registrationExpiryDate ??
    (lead.registrationTokenExpiresAt
      ? formatRegistrationExpiryDate(lead.registrationTokenExpiresAt)
      : "");

  const interviewDate = interview?.interviewDate
    ? new Date(interview.interviewDate).toLocaleDateString("en-IN", {
        weekday: "long",
        year: "numeric",
        month: "long",
        day: "numeric",
      })
    : "";

  return {
    candidateName: extras.candidateName ?? lead.fullName,
    candidateEmail: lead.email,
    registrationLink,
    registrationExpiryDate,
    onboardingLink: extras.onboardingLink ?? "",
    joiningDate: extras.joiningDate ?? "",
    interviewDate,
    interviewTime: interview?.interviewTime ?? "",
    interviewMode: interview?.mode ? formatInterviewMode(interview.mode) : "",
    designation: extras.designation ?? "Trainee",
    department: extras.department ?? "",
    ctc: extras.ctc ?? "As discussed",
    reportingManager: extras.reportingManager ?? "",
    offerDate: extras.offerDate ?? "",
    companyName: org.companyName,
    companyAddress: formatCompanyAddress(org),
    companyTagline: org.companyTagline ?? "",
    hrName: org.hrName,
    hrDesignation: org.hrDesignation,
    hrEmail: org.hrEmail,
    hrPhone: org.hrPhone,
  };
}

export async function buildEmailVariableContext(
  candidateId: string | Types.ObjectId,
  extras: EmailRenderExtras = {}
): Promise<EmailVariableContext> {
  await connectDb();
  const candidate = await Candidate.findById(candidateId).lean();
  if (!candidate) throw new Error("Candidate not found");

  const org = await getOrganizationSettings();

  const [onboarding, interview] = await Promise.all([
    Onboarding.findOne({ candidateId: candidate._id }).select("accessToken").lean(),
    extras.interviewId && Types.ObjectId.isValid(extras.interviewId)
      ? Interview.findById(extras.interviewId).lean()
      : Interview.findOne({ candidateId: candidate._id }).sort({ interviewDate: -1 }).lean(),
  ]);

  const registrationLink =
    extras.registrationLink ??
    (candidate.registrationToken ? buildRegistrationLink(candidate.registrationToken) : "");

  const onboardingLinks = onboarding?.accessToken ? buildOnboardingLinks(onboarding.accessToken) : null;
  const onboardingLink = extras.onboardingLink ?? onboardingLinks?.hub ?? "";
  const joiningFormLink = extras.joiningFormLink ?? onboardingLinks?.joiningForm ?? "";
  const idCardFormLink = extras.idCardFormLink ?? onboardingLinks?.idCard ?? "";

  const interviewDate = interview?.interviewDate
    ? new Date(interview.interviewDate).toLocaleDateString("en-IN", {
        weekday: "long",
        year: "numeric",
        month: "long",
        day: "numeric",
      })
    : "";

  const ctcValue = candidate.finalCtc ?? candidate.proposedCtc;

  return {
    candidateName: extras.candidateName ?? candidate.fullName,
    candidateEmail: candidate.email,
    registrationLink,
    registrationExpiryDate: extras.registrationExpiryDate ?? "",
    onboardingLink,
    joiningFormLink,
    idCardFormLink,
    joiningDate: extras.joiningDate ?? "",
    interviewDate,
    interviewTime: interview?.interviewTime ?? "",
    interviewMode: interview?.mode ? formatInterviewMode(interview.mode) : "",
    designation: extras.designation ?? candidate.preferredRole ?? "Trainee",
    department: extras.department ?? "",
    ctc: extras.ctc ?? (ctcValue != null ? `₹${ctcValue.toLocaleString("en-IN")}` : "As discussed"),
    reportingManager: extras.reportingManager ?? "",
    offerDate: extras.offerDate ?? "",
    companyName: org.companyName,
    companyAddress: formatCompanyAddress(org),
    companyTagline: org.companyTagline ?? "",
    hrName: org.hrName,
    hrDesignation: org.hrDesignation,
    hrEmail: org.hrEmail,
    hrPhone: org.hrPhone,
  };
}

export async function getActiveEmailTemplate(type: CommunicationType | string) {
  await ensureEmailTemplatesSeeded();
  return EmailTemplate.findOne({ type: type as EmailTemplateType, isActive: true }).lean();
}

export async function renderEmailFromTemplate(params: {
  type: CommunicationType | string;
  candidateId?: string | Types.ObjectId;
  leadId?: string | Types.ObjectId;
  extras?: EmailRenderExtras;
  subjectOverride?: string;
  bodyOverride?: string;
}) {
  const template = await getActiveEmailTemplate(params.type);
  const context = params.leadId
    ? await buildEmailVariableContextFromLead(params.leadId, params.extras ?? {})
    : await buildEmailVariableContext(params.candidateId!, params.extras ?? {});
  const org = await getOrganizationSettings();

  const subjectSource = params.subjectOverride ?? template?.subject ?? `Message from ${org.companyName}`;
  const textSource =
    params.bodyOverride ??
    template?.textBody ??
    `Dear {{candidateName}},\n\nThis is a message from {{companyName}}.`;

  const subject = substituteEmailVariables(subjectSource, context);
  const textBody = substituteEmailVariables(textSource, context);

  const innerHtmlSource = template?.htmlBody
    ? substituteEmailVariables(template.htmlBody, context)
    : textToEmailHtmlParagraphs(textBody);

  const actionButton =
    template?.actionButton?.enabled && template.actionButton.url
      ? {
          label: substituteEmailVariables(template.actionButton.label, context),
          url: substituteEmailVariables(template.actionButton.url, context),
        }
      : null;

  const footerParts = [
    org.companyName,
    formatCompanyAddress(org),
    org.hrName ? `${org.hrName}${org.hrDesignation ? `, ${org.hrDesignation}` : ""}` : "",
    org.hrEmail ? org.hrEmail : "",
    org.hrPhone ? org.hrPhone : "",
  ].filter(Boolean);

  const htmlBody = buildResponsiveEmailHtml({
    subject,
    companyName: org.companyName,
    companyTagline: org.companyTagline,
    logoUrl: getCompanyLogoForEmail(),
    showLogo: template?.showLogo ?? true,
    bodyHtml: innerHtmlSource,
    actionButton,
    footerHtml: footerParts.join(" · "),
  });

  return {
    subject,
    textBody,
    htmlBody,
    context,
    templateId: template?._id?.toString() ?? null,
    templateAttachments: template?.attachments ?? [],
  };
}

export function listAvailableVariables() {
  return [...EMAIL_VARIABLE_KEYS];
}

export function mergeTemplateVariables(...texts: string[]) {
  const vars = new Set<string>(EMAIL_VARIABLE_KEYS);
  for (const text of texts) {
    for (const v of extractVariablesFromText(text)) vars.add(v);
  }
  return [...vars];
}

import "server-only";
import type { EmailTemplateType } from "@/lib/constants";
import { EMAIL_VARIABLE_KEYS } from "@/lib/email-variables";
import { EmailTemplate } from "@/models/EmailTemplate";

const COMPANY = "GDF Finance Advisory Pvt Ltd";

type SeedTemplate = {
  type: EmailTemplateType;
  name: string;
  subject: string;
  htmlBody: string;
  textBody: string;
  showLogo: boolean;
  actionButton?: { enabled: boolean; label: string; url: string };
};

export const DEFAULT_EMAIL_TEMPLATES: SeedTemplate[] = [
  {
    type: "INTERVIEW_INVITATION",
    name: "Interview Invitation",
    subject: `Interview Invitation – ${COMPANY}`,
    textBody: `Dear {{candidateName}},

Thank you for your interest in joining ${COMPANY}.

We are pleased to invite you for the next stage of our recruitment process.

Interview Details:

Date: {{interviewDate}}

Time: {{interviewTime}}

Mode: {{interviewMode}}

Please ensure your availability.

We look forward to speaking with you.

Regards,

{{hrName}}

{{hrDesignation}}`,
    htmlBody: `<p>Dear <strong>{{candidateName}}</strong>,</p>
<p>Thank you for your interest in joining <strong>${COMPANY}</strong>.</p>
<p>We are pleased to invite you for the next stage of our recruitment process.</p>
<p><strong>Interview Details:</strong></p>
<table cellpadding="0" cellspacing="0" style="margin:12px 0 20px;width:100%;font-size:15px;">
  <tr><td style="padding:6px 0;color:#64748b;width:80px;">Date</td><td style="padding:6px 0;"><strong>{{interviewDate}}</strong></td></tr>
  <tr><td style="padding:6px 0;color:#64748b;">Time</td><td style="padding:6px 0;"><strong>{{interviewTime}}</strong></td></tr>
  <tr><td style="padding:6px 0;color:#64748b;">Mode</td><td style="padding:6px 0;"><strong>{{interviewMode}}</strong></td></tr>
</table>
<p>Please ensure your availability.</p>
<p>We look forward to speaking with you.</p>
<p>Regards,<br/><br/>{{hrName}}<br/>{{hrDesignation}}</p>`,
    showLogo: true,
    actionButton: { enabled: false, label: "", url: "" },
  },
  {
    type: "LETTER_OF_INTENT",
    name: "Letter Of Intent",
    subject: `Letter of Intent – ${COMPANY}`,
    textBody: `Dear {{candidateName}},

Congratulations on successfully clearing the interview process with ${COMPANY}.

We are pleased to proceed with your candidature for the Financial Advisor role, subject to registration, document verification, training, evaluation, and onboarding formalities.

Please complete your secure candidate registration using the link below:

{{registrationLink}}

Important: This secure registration link will expire on {{registrationExpiryDate}} (valid for 3 days from the date this email was sent). Please submit all information and required documents before the deadline.

If the link expires, contact our HR team to request a new Letter of Intent.

Regards,

{{hrName}}
{{hrDesignation}}
${COMPANY}
{{companyAddress}}`,
    htmlBody: `<p>Dear <strong>{{candidateName}}</strong>,</p>
<p><strong>Congratulations</strong> on successfully clearing the interview process with <strong>${COMPANY}</strong>.</p>
<p>We are pleased to proceed with your candidature for the <strong>Financial Advisor</strong> role, subject to registration, document verification, training, evaluation, and onboarding formalities.</p>
<p>Please complete your <strong>secure candidate registration</strong> using the button below. You will need to upload identity and education documents as part of this step.</p>
<table cellpadding="0" cellspacing="0" role="presentation" style="width:100%;margin:20px 0;background:#f8fafc;border:1px solid #e2e8f0;border-radius:8px;">
  <tr>
    <td style="padding:16px 18px;font-family:Arial,Helvetica,sans-serif;font-size:14px;line-height:1.6;color:#334155;">
      <strong style="color:#0b1f3a;">Link validity:</strong> This secure registration link expires on<br/>
      <strong style="color:#0b1f3a;font-size:15px;">{{registrationExpiryDate}}</strong><br/>
      <span style="color:#64748b;">(3 days from the date this email was sent)</span>
    </td>
  </tr>
</table>
<p>Please ensure all information and documents are accurate and complete before the deadline.</p>
<p>If you need assistance or the link has expired, reply to this email or contact our HR team.</p>
<p style="margin-top:24px;">Regards,<br/><br/><strong>{{hrName}}</strong><br/>{{hrDesignation}}<br/>${COMPANY}</p>`,
    showLogo: true,
    actionButton: { enabled: true, label: "Complete Secure Registration", url: "{{registrationLink}}" },
  },
  {
    type: "OFFER_LETTER",
    name: "Offer Letter",
    subject: `Offer of Employment – ${COMPANY}`,
    textBody: `Dear {{candidateName}},

We are pleased to offer you the position of {{designation}} in the {{department}} department with ${COMPANY}.

Proposed CTC: {{ctc}}
Tentative joining date: {{joiningDate}}
Reporting Manager: {{reportingManager}}

Please review the attached offer letter PDF and complete your onboarding forms:

Onboarding hub: {{onboardingLink}}
Joining Form: {{joiningFormLink}}
ID Card Form: {{idCardFormLink}}

Your lead and registration details are already on file — only complete the remaining onboarding fields.

Regards,
{{hrName}}
{{hrDesignation}}`,
    htmlBody: `<p>Dear <strong>{{candidateName}}</strong>,</p>
<p>We are pleased to offer you the position of <strong>{{designation}}</strong> in the <strong>{{department}}</strong> department with <strong>${COMPANY}</strong>.</p>
<p><strong>Proposed CTC:</strong> {{ctc}}<br/><strong>Tentative joining date:</strong> {{joiningDate}}<br/><strong>Reporting Manager:</strong> {{reportingManager}}</p>
<p>Please review the <strong>attached offer letter PDF</strong> and complete your onboarding forms using the secure links below. Information from your lead profile and registration is already saved — you only need to fill the remaining fields.</p>
<ul>
  <li><a href="{{joiningFormLink}}">Joining Form</a></li>
  <li><a href="{{idCardFormLink}}">ID Card Form</a></li>
</ul>
<p>Regards,<br/><br/>{{hrName}}<br/>{{hrDesignation}}</p>`,
    showLogo: true,
    actionButton: { enabled: true, label: "Open Onboarding Portal", url: "{{onboardingLink}}" },
  },
  {
    type: "JOINING_INSTRUCTIONS",
    name: "Joining Instructions",
    subject: `Joining Instructions – ${COMPANY}`,
    textBody: `Dear {{candidateName}},

Congratulations on successfully completing the evaluation process.

Your tentative joining date is:

{{joiningDate}}

Please ensure that all required documents and onboarding activities are completed before your joining date.

Additional instructions and onboarding requirements will be shared through the onboarding portal.

We look forward to welcoming you to our team.

Regards,

{{hrName}}

{{hrDesignation}}`,
    htmlBody: `<p>Dear <strong>{{candidateName}}</strong>,</p>
<p>Congratulations on successfully completing the evaluation process.</p>
<p>Your tentative joining date is:</p>
<p style="font-size:18px;font-weight:700;margin:16px 0;">{{joiningDate}}</p>
<p>Please ensure that all required documents and onboarding activities are completed before your joining date.</p>
<p>Additional instructions and onboarding requirements will be shared through the onboarding portal.</p>
<p>We look forward to welcoming you to our team.</p>
<p>Regards,<br/><br/>{{hrName}}<br/>{{hrDesignation}}</p>`,
    showLogo: true,
    actionButton: { enabled: false, label: "", url: "" },
  },
  {
    type: "ONBOARDING_INVITATION",
    name: "Onboarding Invitation",
    subject: "Complete Your Employee Onboarding",
    textBody: `Dear {{candidateName}},

Welcome to ${COMPANY}.

Please complete your onboarding using the secure links below:

Onboarding hub: {{onboardingLink}}
Joining Form: {{joiningFormLink}}
ID Card Form: {{idCardFormLink}}

Your lead and registration details are already on file. Only complete the remaining onboarding fields.

Regards,
{{hrName}}
{{hrDesignation}}`,
    htmlBody: `<p>Dear <strong>{{candidateName}}</strong>,</p>
<p>Welcome to <strong>${COMPANY}</strong>.</p>
<p>Please complete both onboarding forms using the links below. Details from your lead profile and registration are already saved.</p>
<ul>
  <li><a href="{{joiningFormLink}}">Joining Form</a></li>
  <li><a href="{{idCardFormLink}}">ID Card Form</a></li>
</ul>
<p>Regards,<br/><br/>{{hrName}}<br/>{{hrDesignation}}</p>`,
    showLogo: true,
    actionButton: { enabled: true, label: "Start Onboarding", url: "{{onboardingLink}}" },
  },
];

/** Upserts all canonical email templates (updates subject/body to latest defaults). */
export async function syncEmailTemplates() {
  for (const seed of DEFAULT_EMAIL_TEMPLATES) {
    await EmailTemplate.findOneAndUpdate(
      { type: seed.type },
      {
        $set: {
          name: seed.name,
          subject: seed.subject,
          htmlBody: seed.htmlBody,
          textBody: seed.textBody,
          showLogo: seed.showLogo,
          actionButton: seed.actionButton ?? { enabled: false, label: "", url: "" },
          variables: [...EMAIL_VARIABLE_KEYS],
          isActive: true,
          attachments: [],
        },
        $setOnInsert: {
          type: seed.type,
        },
      },
      { upsert: true }
    );
  }
}

export async function ensureEmailTemplatesSeeded() {
  await syncEmailTemplates();
}

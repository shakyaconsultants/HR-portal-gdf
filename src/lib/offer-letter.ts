import "server-only";
import { sendWorkflowEmail } from "@/lib/communications";

export async function sendOfferLetterEmail(params: {
  candidateId: string;
  to: string;
  pdfFileName: string;
  pdfBytes: Buffer;
  pdfPublicPath: string;
  sentBy: { userId: string; name: string };
  offerLetterId: string;
  extras: {
    designation: string;
    department: string;
    ctc: string;
    joiningDate: string;
    reportingManager: string;
    offerDate: string;
    candidateName: string;
    onboardingLink?: string;
    joiningFormLink?: string;
    idCardFormLink?: string;
  };
}) {
  return sendWorkflowEmail({
    candidateId: params.candidateId,
    type: "OFFER_LETTER",
    to: params.to,
    sentBy: params.sentBy,
    relatedId: params.offerLetterId,
    relatedModel: "OfferLetter",
    extras: {
      joiningDate: params.extras.joiningDate,
      designation: params.extras.designation,
      department: params.extras.department,
      ctc: params.extras.ctc,
      reportingManager: params.extras.reportingManager,
      offerDate: params.extras.offerDate,
      candidateName: params.extras.candidateName,
      onboardingLink: params.extras.onboardingLink,
      joiningFormLink: params.extras.joiningFormLink,
      idCardFormLink: params.extras.idCardFormLink,
    },
    attachments: [
      {
        fileName: params.pdfFileName,
        mimeType: "application/pdf",
        content: params.pdfBytes,
      },
    ],
    attachmentMeta: [
      {
        fileName: params.pdfFileName,
        mimeType: "application/pdf",
        storagePath: params.pdfPublicPath,
        size: params.pdfBytes.length,
      },
    ],
  });
}

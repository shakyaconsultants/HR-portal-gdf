import "server-only";
import { buildRegistrationLink } from "@/lib/registration-link";
import { sendWorkflowEmail } from "@/lib/communications";

export function getRegistrationLink(token: string) {
  return buildRegistrationLink(token);
}

export async function sendLoiEmail(params: {
  leadId: string;
  to: string;
  registrationLink: string;
  registrationExpiryDate: string;
  sentBy: { userId: string; name: string };
  loiId: string;
}) {
  return sendWorkflowEmail({
    leadId: params.leadId,
    type: "LETTER_OF_INTENT",
    to: params.to,
    sentBy: params.sentBy,
    relatedId: params.loiId,
    relatedModel: "LetterOfIntent",
    extras: {
      registrationLink: params.registrationLink,
      registrationExpiryDate: params.registrationExpiryDate,
    },
  });
}

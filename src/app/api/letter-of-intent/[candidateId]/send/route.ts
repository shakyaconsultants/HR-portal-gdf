import { Types } from "mongoose";
import { NextRequest } from "next/server";
import { connectDb } from "@/lib/db";
import { apiError, apiOk, requireAuth } from "@/lib/api";
import { sanitizeDeliveryError } from "@/lib/delivery-errors";
import { Lead } from "@/models/Lead";
import { LetterOfIntent } from "@/models/LetterOfIntent";
import { buildLoiReferenceNumber } from "@/lib/loi-pdf";
import { getRegistrationLink, sendLoiEmail } from "@/lib/loi";
import { renderEmailFromTemplate } from "@/lib/email-renderer";
import { generateRegistrationToken } from "@/lib/registration-link";
import { computeRegistrationExpiry, formatRegistrationExpiryDate } from "@/lib/registration-expiry";

type Params = { params: Promise<{ candidateId: string }> };

/** Route param is leadId (legacy path name retained). */
export async function POST(request: NextRequest, { params }: Params) {
  const auth = await requireAuth(request, ["ADMIN", "HR"]);
  if (auth.error || !auth.user) return auth.error;

  const { candidateId: leadId } = await params;
  if (!Types.ObjectId.isValid(leadId)) return apiError("Invalid lead id", 422);

  await connectDb();

  const lead = await Lead.findOne({ _id: leadId, convertedAt: null })
    .select("fullName email phone leadStatus")
    .lean();
  if (!lead) return apiError("Lead not found", 404);

  if (lead.leadStatus !== "SELECTED") {
    return apiError("Only selected leads can receive a Letter of Intent.", 409);
  }

  const referenceNumber = buildLoiReferenceNumber();
  const registrationToken = generateRegistrationToken();
  const registrationLink = getRegistrationLink(registrationToken);
  const sentAt = new Date();
  const registrationTokenExpiresAt = computeRegistrationExpiry(sentAt);
  const registrationExpiryDate = formatRegistrationExpiryDate(registrationTokenExpiresAt);

  const rendered = await renderEmailFromTemplate({
    type: "LETTER_OF_INTENT",
    leadId,
    extras: { registrationLink, registrationExpiryDate },
  });

  const loi = await LetterOfIntent.create({
    leadId,
    referenceNumber,
    registrationLink,
    emailSubject: rendered.subject,
    emailBody: rendered.textBody,
    sentToEmail: lead.email,
    sentAt,
    sentBy: auth.user.userId,
    sentByName: auth.user.name,
    emailStatus: "PENDING",
  });

  const sendResult = await sendLoiEmail({
    leadId,
    to: lead.email,
    registrationLink,
    registrationExpiryDate,
    sentBy: auth.user,
    loiId: loi._id.toString(),
  });

  await LetterOfIntent.updateOne({ _id: loi._id }, { $set: { emailStatus: sendResult.status } });

  if (sendResult.status === "SENT") {
    await Lead.updateOne(
      { _id: leadId },
      {
        $set: {
          leadStatus: "AWAITING_REGISTRATION",
          registrationToken,
          registrationTokenExpiresAt,
        },
      }
    );
  }

  return apiOk(
    {
      id: loi._id.toString(),
      leadId,
      referenceNumber,
      registrationLink,
      registrationTokenExpiresAt,
      registrationExpiryDate,
      sentAt,
      sentByName: auth.user.name,
      emailStatus: sendResult.status,
      errorMessage: sendResult.errorMessage ? sanitizeDeliveryError(sendResult.errorMessage) : "",
      leadStatus: sendResult.status === "SENT" ? "AWAITING_REGISTRATION" : lead.leadStatus,
      delivered: sendResult.status === "SENT",
    },
    201
  );
}

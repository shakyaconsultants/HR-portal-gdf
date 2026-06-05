import { Types } from "mongoose";
import { storeBuffer } from "@/lib/file-storage";
import { NextRequest } from "next/server";
import { connectDb } from "@/lib/db";
import { apiError, apiOk, requireAuth } from "@/lib/api";
import { sendWorkflowEmail } from "@/lib/communications";
import { renderEmailFromTemplate } from "@/lib/email-renderer";
import { sendOfferLetterEmail } from "@/lib/offer-letter";
import { ensureOnboardingInvite } from "@/lib/onboarding-server";
import { pickOfferUpdate } from "@/lib/candidate-field-scopes";
import { assertCanSendCommunication } from "@/lib/communication-prerequisites";
import { sanitizeDeliveryError } from "@/lib/delivery-errors";
import { buildOfferReferenceNumber, generateOfferPdf } from "@/lib/offer-pdf";
import { sendCommunicationSchema } from "@/lib/validators";
import { Candidate } from "@/models/Candidate";
import { CommunicationLog } from "@/models/CommunicationLog";
import { CandidateTimeline } from "@/models/CandidateTimeline";
import { OfferLetter } from "@/models/OfferLetter";

function formatDisplayDate(value: string) {
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return value;
  return d.toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric" });
}

export async function GET(request: NextRequest) {
  const auth = await requireAuth(request, ["ADMIN", "HR"]);
  if (auth.error) return auth.error;

  await connectDb();
  const candidateId = request.nextUrl.searchParams.get("candidateId");
  const status = request.nextUrl.searchParams.get("status");
  const type = request.nextUrl.searchParams.get("type");

  const filter: Record<string, unknown> = {};
  if (candidateId && Types.ObjectId.isValid(candidateId)) {
    filter.candidateId = candidateId;
  }
  if (status) filter.status = status;
  if (type) filter.type = type;

  const items = await CommunicationLog.find(filter)
    .sort({ sentAt: -1, createdAt: -1 })
    .limit(200)
    .populate({ path: "candidateId", select: "fullName registrationId" })
    .lean();

  return apiOk({
    items: items.map((item) => {
      const candidate =
        item.candidateId && typeof item.candidateId === "object" && "fullName" in item.candidateId
          ? (item.candidateId as { fullName: string; registrationId?: string })
          : null;
      return {
        id: item._id.toString(),
        candidateId: candidate ? String((item.candidateId as { _id?: Types.ObjectId })._id ?? item.candidateId) : String(item.candidateId),
        candidateName: candidate?.fullName ?? "Unknown",
        registrationId: candidate?.registrationId ?? null,
        type: item.type,
        subject: item.subject,
        sentToEmail: item.sentToEmail,
        status: item.status,
        sentByName: item.sentByName,
        sentAt: item.sentAt ?? item.createdAt,
        attachmentCount: item.attachments?.length ?? 0,
        errorMessage: item.errorMessage ? sanitizeDeliveryError(item.errorMessage) : "",
        retryCount: item.retryCount ?? 0,
      };
    }),
  });
}

export async function POST(request: NextRequest) {
  try {
  const auth = await requireAuth(request, ["ADMIN", "HR"]);
  if (auth.error || !auth.user) return auth.error;

  await connectDb();
  const body = await request.json();
  const parsed = sendCommunicationSchema.safeParse(body);
  if (!parsed.success) {
    return apiError(parsed.error.issues[0]?.message ?? "Invalid payload", 422);
  }
  if (!Types.ObjectId.isValid(parsed.data.candidateId)) {
    return apiError("Invalid candidate id", 422);
  }

  const candidate = await Candidate.findById(parsed.data.candidateId)
    .select("email fullName registrationId decision lifecycleStage")
    .lean();
  if (!candidate) return apiError("Candidate not found", 404);

  const adminResend = parsed.data.resend === true && auth.user.role === "ADMIN";

  if (parsed.data.type === "OFFER_LETTER" || parsed.data.type === "JOINING_INSTRUCTIONS") {
    if (candidate.decision !== "SELECTED") {
      return apiError("Offer and joining communications require a Selected hiring decision.", 403);
    }

    const prereq = await assertCanSendCommunication(parsed.data.candidateId, parsed.data.type);
    if (!prereq.ok) return apiError(prereq.message, 409);

    if (!adminResend) {
      if (parsed.data.type === "OFFER_LETTER" && candidate.lifecycleStage !== "OFFER_LETTER") {
        return apiError("Candidate must be in Offer Letter lifecycle stage.", 409);
      }
      if (parsed.data.type === "JOINING_INSTRUCTIONS" && candidate.lifecycleStage !== "JOINING_INSTRUCTIONS") {
        return apiError("Candidate must be in Joining Instructions lifecycle stage.", 409);
      }
    } else if (parsed.data.type === "JOINING_INSTRUCTIONS" && candidate.lifecycleStage === "OFFER_LETTER") {
      return apiError(
        "Complete the offer letter step first. Joining instructions unlock after the offer letter is delivered.",
        409
      );
    }
  }

  let result: { logId: string; status: string; errorMessage?: string };

  if (parsed.data.type === "OFFER_LETTER") {
    const offer = parsed.data.offerDetails!;
    const referenceNumber = buildOfferReferenceNumber();
    const joiningDateLabel = formatDisplayDate(offer.joiningDate);
    const offerDateLabel = formatDisplayDate(offer.offerDate);

    const invite = await ensureOnboardingInvite(
      parsed.data.candidateId,
      {
        userId: auth.user.userId,
        name: auth.user.name,
        role: auth.user.role,
      },
      { skipEmail: true, regenerate: true }
    );
    const onboardingLinks = invite?.links;

    const pdfBytes = await generateOfferPdf({
      candidateName: offer.candidateName,
      designation: offer.designation,
      department: offer.department,
      ctc: offer.ctc,
      joiningDate: joiningDateLabel,
      reportingManager: offer.reportingManager,
      offerDate: offerDateLabel,
      referenceNumber,
      joiningFormLink: onboardingLinks?.joiningForm ?? "",
      idCardFormLink: onboardingLinks?.idCard ?? "",
    });

    const pdfFileName = `${referenceNumber}.pdf`;
    const storedPdf = await storeBuffer(
      Buffer.from(pdfBytes),
      `offers/${parsed.data.candidateId}`,
      pdfFileName,
      "application/pdf"
    );
    const pdfPath = storedPdf.url;

    await Candidate.updateOne(
      { _id: parsed.data.candidateId },
      {
        $set: pickOfferUpdate({
          designation: offer.designation,
          department: offer.department,
          joiningDate: new Date(offer.joiningDate),
        }),
      }
    );

    const rendered = await renderEmailFromTemplate({
      type: "OFFER_LETTER",
      candidateId: parsed.data.candidateId,
      extras: {
        candidateName: offer.candidateName,
        designation: offer.designation,
        department: offer.department,
        ctc: offer.ctc,
        joiningDate: joiningDateLabel,
        reportingManager: offer.reportingManager,
        offerDate: offerDateLabel,
        onboardingLink: onboardingLinks?.hub ?? "",
        joiningFormLink: onboardingLinks?.joiningForm ?? "",
        idCardFormLink: onboardingLinks?.idCard ?? "",
      },
    });

    const sentAt = new Date();
    const offerRecord = await OfferLetter.create({
      candidateId: parsed.data.candidateId,
      referenceNumber,
      candidateName: offer.candidateName,
      designation: offer.designation,
      department: offer.department,
      ctc: offer.ctc,
      joiningDate: offer.joiningDate,
      reportingManager: offer.reportingManager,
      offerDate: offer.offerDate,
      pdfPath,
      pdfFileName,
      emailSubject: rendered.subject,
      emailBody: rendered.textBody,
      sentToEmail: candidate.email,
      sentAt,
      sentBy: auth.user.userId,
      sentByName: auth.user.name,
      emailStatus: "PENDING",
    });

    const sendResult = await sendOfferLetterEmail({
      candidateId: parsed.data.candidateId,
      to: candidate.email,
      pdfFileName,
      pdfBytes: Buffer.from(pdfBytes),
      pdfPublicPath: pdfPath,
      sentBy: auth.user,
      offerLetterId: offerRecord._id.toString(),
      extras: {
        ...offer,
        onboardingLink: onboardingLinks?.hub ?? "",
        joiningFormLink: onboardingLinks?.joiningForm ?? "",
        idCardFormLink: onboardingLinks?.idCard ?? "",
      },
    });

    await OfferLetter.updateOne(
      { _id: offerRecord._id },
      { $set: { emailStatus: sendResult.status, communicationLogId: sendResult.logId } }
    );

    result = sendResult;
  } else {
    result = await sendWorkflowEmail({
      candidateId: parsed.data.candidateId,
      type: parsed.data.type,
      to: candidate.email,
      sentBy: auth.user,
      subject: parsed.data.subject,
      textBody: parsed.data.body,
      extras:
        parsed.data.type === "JOINING_INSTRUCTIONS" && parsed.data.joiningDate
          ? { joiningDate: formatDisplayDate(parsed.data.joiningDate) }
          : undefined,
    });
  }

  const lifecycleUpdate =
    result.status === "SENT" && !adminResend
      ? parsed.data.type === "OFFER_LETTER"
        ? "JOINING_INSTRUCTIONS"
        : null
      : null;

  await Promise.all([
    lifecycleUpdate
      ? Candidate.updateOne({ _id: parsed.data.candidateId }, { $set: { lifecycleStage: lifecycleUpdate } })
      : Promise.resolve(),
    CandidateTimeline.create({
      candidateId: parsed.data.candidateId,
      action: result.status === "SENT" ? `${parsed.data.type}_SENT` : `${parsed.data.type}_FAILED`,
      actorRole: auth.user.role,
      actorName: auth.user.name,
      remarks:
        parsed.data.type === "OFFER_LETTER"
          ? `Offer letter PDF generated — ${result.status}${result.errorMessage ? `: ${sanitizeDeliveryError(result.errorMessage)}` : ""}`
          : `${parsed.data.type} email — ${result.status}${result.errorMessage ? `: ${sanitizeDeliveryError(result.errorMessage)}` : ""}`,
    }),
  ]);

  return apiOk(
    {
      id: result.logId,
      candidateId: parsed.data.candidateId,
      type: parsed.data.type,
      status: result.status,
      errorMessage: result.errorMessage ? sanitizeDeliveryError(result.errorMessage) : "",
      sentByName: auth.user.name,
      eligibleForHiringDecision: false,
      delivered: result.status === "SENT",
    },
    201
  );
  } catch (error) {
    console.error("POST /api/communications failed", error);
    const raw =
      error instanceof Error && error.message.includes("PNG")
        ? "Could not generate the offer letter PDF."
        : error instanceof Error
          ? error.message
          : "Unable to send communication.";
    return apiError(sanitizeDeliveryError(raw), 500);
  }
}

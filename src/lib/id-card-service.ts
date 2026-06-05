import "server-only";
import { Types } from "mongoose";
import { publicAppPathFromRequest } from "@/lib/app-url";
import { connectDb } from "@/lib/db";
import { isCommunicationDelivered } from "@/lib/communication-prerequisites";
import { sendEmail } from "@/lib/email";
import { storeBuffer } from "@/lib/file-storage";
import { buildIdCardFileName, generateIdCardPdf } from "@/lib/id-card-pdf";
import { deriveOnboardingStatus, getSectionStatus, isSectionFilled } from "@/lib/onboarding";
import { promoteCandidateToEmployee } from "@/lib/transfer-to-employee";
import { sanitizeDeliveryError } from "@/lib/delivery-errors";
import { Candidate } from "@/models/Candidate";
import { Employee } from "@/models/Employee";
import { Onboarding } from "@/models/Onboarding";
import { CandidateTimeline } from "@/models/CandidateTimeline";

function candidateObjectId(candidateId: string) {
  return new Types.ObjectId(candidateId);
}

export async function assertCanGenerateIdCard(candidateId: string): Promise<{ ok: true } | { ok: false; message: string }> {
  await connectDb();
  const onboarding = await Onboarding.findOne({ candidateId }).lean();
  if (!onboarding) {
    return { ok: false, message: "Onboarding record not found. Send the offer letter first." };
  }

  if (!isSectionFilled(onboarding, "JOINING_FORM")) {
    return { ok: false, message: "Joining form must be completed before generating an ID card." };
  }
  if (!isSectionFilled(onboarding, "ID_CARD")) {
    return { ok: false, message: "ID card form must be completed before generating the ID card." };
  }

  const offerOk = await isCommunicationDelivered(candidateId, "OFFER_LETTER");
  if (!offerOk) {
    return { ok: false, message: "Offer letter must be delivered before generating an ID card." };
  }

  return { ok: true };
}

export async function generateAndTransferIdCard(
  candidateId: string,
  actor: { userId: string; name: string; role: string }
) {
  const gate = await assertCanGenerateIdCard(candidateId);
  if (!gate.ok) throw new Error(gate.message);

  await connectDb();
  const candidate = await Candidate.findById(candidateId)
    .select(
      "fullName email phone designation department employeeId registrationId professionalPhotoPath fatherName fatherPhone motherName motherPhone"
    )
    .lean();
  if (!candidate) throw new Error("Candidate not found");

  const employeeIdLabel =
    candidate.employeeId && candidate.employeeId !== "N/A" && candidate.employeeId.trim()
      ? candidate.employeeId.trim()
      : candidate.registrationId ?? `GDF-${candidateId.slice(-6).toUpperCase()}`;

  const generatedAt = new Date();
  const verificationUrl = await publicAppPathFromRequest(
    `/api/employees/verify?code=${encodeURIComponent(employeeIdLabel)}`
  );
  const pdfBytes = await generateIdCardPdf({
    fullName: candidate.fullName,
    designation: candidate.designation ?? "",
    department: candidate.department ?? "",
    employeeId: employeeIdLabel,
    email: candidate.email,
    phone: candidate.phone,
    photoPath: candidate.professionalPhotoPath ?? "",
    issueDate: generatedAt.toISOString(),
    emergencyContactName: candidate.fatherName?.trim() || candidate.motherName?.trim() || "",
    emergencyContactPhone: candidate.fatherPhone?.trim() || candidate.motherPhone?.trim() || candidate.phone,
    verificationUrl,
  });

  const fileName = buildIdCardFileName(candidate.registrationId);
  const stored = await storeBuffer(
    Buffer.from(pdfBytes),
    `id-cards/${candidateId}`,
    fileName,
    "application/pdf"
  );
  const publicPath = stored.url;

  await Onboarding.updateOne(
    { candidateId },
    { $set: { status: "COMPLETED" } }
  );

  const updateResult = await Candidate.updateOne(
    { _id: candidateObjectId(candidateId) },
    {
      $set: {
        idCardPdfPath: publicPath,
        idCardPdfFileName: fileName,
        idCardGeneratedAt: generatedAt,
      },
    }
  );
  if (updateResult.matchedCount === 0) {
    throw new Error("Unable to save ID card path on candidate record.");
  }

  const employee = await promoteCandidateToEmployee(candidateId, actor);

  await CandidateTimeline.create({
    candidateId,
    action: "ID_CARD_GENERATED",
    actorRole: actor.role,
    actorName: actor.name,
    remarks: `ID card PDF generated — ${fileName}. Transferred to Employee (${employee.employeeCode}).`,
  });

  return {
    pdfPath: publicPath,
    fileName,
    generatedAt,
    employeeCode: employee.employeeCode,
    lifecycleStage: "EMPLOYEE" as const,
  };
}

export async function sendIdCardEmail(
  candidateId: string,
  actor: { userId: string; name: string; role: string }
) {
  await connectDb();
  const oid = candidateObjectId(candidateId);
  const candidate = await Candidate.findById(oid)
    .select("fullName email idCardPdfPath idCardPdfFileName designation")
    .lean();
  if (!candidate) throw new Error("Candidate not found");

  const pdfPath = String(candidate.idCardPdfPath ?? "").trim();
  const fileName = String(candidate.idCardPdfFileName ?? "").trim();

  if (!pdfPath) {
    throw new Error("Generate the ID card first before sending.");
  }

  const result = await sendEmail({
    to: candidate.email,
    subject: `Your GDF Employee ID Card — ${candidate.fullName}`,
    text: `Dear ${candidate.fullName},

Please find your employee identity card attached.

Designation: ${candidate.designation ?? "—"}
Welcome to the GDF team.

Regards,
GDF Finance Advisory HR`,
    html: `<p>Dear <strong>${candidate.fullName}</strong>,</p>
<p>Please find your <strong>employee identity card</strong> attached to this email.</p>
<p>Designation: <strong>${candidate.designation ?? "—"}</strong></p>
<p>Welcome to the GDF team.</p>
<p>Regards,<br/>GDF Finance Advisory HR</p>`,
    attachments: [
      {
        fileName: fileName || "employee-id-card.pdf",
        mimeType: "application/pdf",
        filePath: pdfPath,
      },
    ],
  });

  const status = result.ok ? "SENT" : "FAILED";
  await Candidate.updateOne(
    { _id: candidateId },
    {
      $set: {
        idCardEmailStatus: status,
        idCardEmailSentAt: new Date(),
        ...(result.ok ? {} : { idCardEmailError: sanitizeDeliveryError(result.error) }),
      },
    }
  );

  await CandidateTimeline.create({
    candidateId,
    action: result.ok ? "ID_CARD_EMAIL_SENT" : "ID_CARD_EMAIL_FAILED",
    actorRole: actor.role,
    actorName: actor.name,
    remarks: result.ok
      ? `ID card emailed to ${candidate.email}`
      : `ID card email failed: ${sanitizeDeliveryError(result.error)}`,
  });

  if (!result.ok) {
    throw new Error(sanitizeDeliveryError(result.error));
  }

  return { status: "SENT" as const, sentAt: new Date().toISOString() };
}

export async function getIdCardStatus(candidateId: string) {
  await connectDb();
  if (!Types.ObjectId.isValid(candidateId)) return null;

  const oid = candidateObjectId(candidateId);

  const [candidate, onboarding, employee] = await Promise.all([
    Candidate.findById(oid)
      .select(
        "lifecycleStage idCardPdfPath idCardPdfFileName idCardGeneratedAt idCardEmailStatus idCardEmailSentAt employeeId registrationId"
      )
      .lean(),
    Onboarding.findOne({ candidateId: oid }).lean(),
    Employee.findOne({ candidateId: oid }).select("_id employeeCode").lean(),
  ]);

  if (!candidate) return null;

  const pdfPath = String(candidate.idCardPdfPath ?? "").trim();
  const fileName = String(candidate.idCardPdfFileName ?? "").trim();
  const generatedAt = candidate.idCardGeneratedAt ?? null;

  const canGenerate = onboarding
    ? isSectionFilled(onboarding, "JOINING_FORM") && isSectionFilled(onboarding, "ID_CARD")
    : false;

  const generated = Boolean(pdfPath) || Boolean(employee) || candidate.lifecycleStage === "EMPLOYEE";

  return {
    canGenerate,
    generated,
    pdfPath,
    fileName,
    generatedAt,
    emailStatus: candidate.idCardEmailStatus ? String(candidate.idCardEmailStatus) : null,
    emailSentAt: candidate.idCardEmailSentAt ?? null,
    lifecycleStage: candidate.lifecycleStage,
    employeeCode: employee?.employeeCode ?? null,
    onboardingStatus: onboarding ? deriveOnboardingStatus(onboarding) : null,
    joiningFormFilled: onboarding ? isSectionFilled(onboarding, "JOINING_FORM") : false,
    idCardFormFilled: onboarding ? isSectionFilled(onboarding, "ID_CARD") : false,
    joiningFormStatus: onboarding ? getSectionStatus(onboarding, "JOINING_FORM") : "NOT_STARTED",
    idCardFormStatus: onboarding ? getSectionStatus(onboarding, "ID_CARD") : "NOT_STARTED",
  };
}

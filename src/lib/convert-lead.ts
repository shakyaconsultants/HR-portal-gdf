import { Types } from "mongoose";
import { storeUploadedFile } from "@/lib/file-storage";
import { REGISTRATION_DOCUMENT_TYPES, DocumentType, type ReferenceSource } from "@/lib/constants";
import { Candidate } from "@/models/Candidate";
import { CandidateDocument } from "@/models/CandidateDocument";
import { CandidateTimeline } from "@/models/CandidateTimeline";
import { Lead } from "@/models/Lead";
import { LeadDocument } from "@/models/LeadDocument";
import { VerificationRecord } from "@/models/VerificationRecord";
import { buildRegistrationCandidateUpdate } from "@/lib/candidate-field-scopes";
import { generateRegistrationId } from "@/lib/registration";
import { notifyHrNewRegistration } from "@/lib/notifications";
import type { z } from "zod";
import type { publicRegistrationSchema } from "@/lib/validators";

type RegistrationPayload = z.infer<typeof publicRegistrationSchema>;

async function copyLeadResume(leadId: Types.ObjectId, candidateId: Types.ObjectId) {
  const resume = await LeadDocument.findOne({ leadId, documentType: "RESUME" }).sort({ createdAt: -1 }).lean();
  if (!resume) return;

  await CandidateDocument.create({
    candidateId,
    documentType: "RESUME",
    fileName: resume.fileName,
    filePath: resume.filePath,
    mimeType: resume.mimeType,
    fileSize: resume.fileSize,
  });
}

async function saveRegistrationDocuments(
  candidateId: string,
  candidateObjectId: Types.ObjectId,
  formData: FormData
) {
  const savedDocs: string[] = [];
  for (const docType of REGISTRATION_DOCUMENT_TYPES) {
    const file = formData.get(`file_${docType}`);
    if (file && file instanceof File && file.size > 0) {
      const stored = await storeUploadedFile(file, `candidates/${candidateId}`, docType);
      await CandidateDocument.create({
        candidateId: candidateObjectId,
        documentType: docType as DocumentType,
        fileName: file.name,
        filePath: stored.url,
        mimeType: stored.mimeType,
        fileSize: stored.size,
      });
      savedDocs.push(docType);
    }
  }
  return savedDocs;
}

/** Creates a Candidate from a Lead when registration form is submitted. */
export async function convertLeadAndSubmitRegistration(
  lead: {
    _id: Types.ObjectId;
    email: string;
    fullName: string;
    phone: string;
    referenceSource?: string | null;
    referenceName?: string | null;
    remarks?: string | null;
  },
  parsed: RegistrationPayload,
  formData: FormData
) {
  if (await Lead.findOne({ _id: lead._id, convertedAt: { $ne: null } }).lean()) {
    throw new Error("Lead already converted.");
  }

  const registrationId = await generateRegistrationId();
  const submittedAt = new Date();

  const candidate = await Candidate.create({
    ...buildRegistrationCandidateUpdate(parsed),
    email: lead.email.toLowerCase(),
    registrationId,
    registrationSubmittedAt: submittedAt,
    convertedAt: submittedAt,
    leadId: lead._id,
    lifecycleStage: "REGISTRATION_SUBMITTED",
    verificationStage: "DOCUMENTS_RECEIVED",
    verificationRejected: false,
    notes: lead.remarks ?? "",
    referenceSource: (lead.referenceSource as ReferenceSource | null | undefined) ?? null,
    referenceName: lead.referenceName ?? "",
  });

  const candidateId = candidate._id.toString();
  const savedDocs = await saveRegistrationDocuments(candidateId, candidate._id, formData);
  await copyLeadResume(lead._id, candidate._id);

  await Lead.updateOne(
    { _id: lead._id },
    {
      $set: {
        convertedAt: submittedAt,
        candidateId: candidate._id,
      },
      $unset: { registrationToken: "" },
    }
  );

  await Promise.all([
    CandidateTimeline.create({
      candidateId: candidate._id,
      action: "LEAD_CONVERTED",
      actorRole: "CANDIDATE",
      actorName: parsed.fullName,
      remarks: `Converted from lead ${lead._id.toString()} on registration submission.`,
    }),
    CandidateTimeline.create({
      candidateId: candidate._id,
      action: "REGISTRATION_COMPLETED",
      actorRole: "CANDIDATE",
      actorName: parsed.fullName,
      remarks: `Registration completed via LOI link (${parsed.candidateType}). Documents: ${savedDocs.join(", ")}`,
    }),
    VerificationRecord.create({
      candidateId: candidate._id,
      previousStage: null,
      stage: "DOCUMENTS_RECEIVED",
      action: "SET_STAGE",
      remarks: "Registration completed — entered verification queue.",
      actorRole: "CANDIDATE",
      actorName: parsed.fullName,
    }),
    notifyHrNewRegistration({
      candidateId: candidate._id,
      registrationId,
      fullName: parsed.fullName,
      email: lead.email.toLowerCase(),
    }),
  ]);

  return { registrationId, candidateId, submittedAt, leadId: lead._id.toString() };
}

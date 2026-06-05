import { Types } from "mongoose";
import { REGISTRATION_DOCUMENT_TYPES, DocumentType } from "@/lib/constants";
import { storeUploadedFile } from "@/lib/file-storage";
import { Candidate } from "@/models/Candidate";
import { CandidateDocument } from "@/models/CandidateDocument";
import { CandidateTimeline } from "@/models/CandidateTimeline";
import { VerificationRecord } from "@/models/VerificationRecord";
import { buildRegistrationCandidateUpdate } from "@/lib/candidate-field-scopes";
import { generateRegistrationId } from "@/lib/registration";
import { notifyHrNewRegistration } from "@/lib/notifications";
import type { z } from "zod";
import type { publicRegistrationSchema } from "@/lib/validators";

type RegistrationPayload = z.infer<typeof publicRegistrationSchema>;

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

export async function submitRegistrationForCandidate(
  candidate: {
    _id: Types.ObjectId;
    email: string;
    registrationId?: string | null;
  },
  parsed: RegistrationPayload,
  formData: FormData
) {
  const registrationId = candidate.registrationId ?? (await generateRegistrationId());
  const candidateId = candidate._id.toString();
  const submittedAt = new Date();

  await Candidate.updateOne(
    { _id: candidate._id },
    {
      $set: {
        ...buildRegistrationCandidateUpdate(parsed),
        registrationId,
        registrationSubmittedAt: submittedAt,
        lifecycleStage: "REGISTRATION_SUBMITTED",
        verificationStage: "DOCUMENTS_RECEIVED",
        verificationRejected: false,
      },
      $unset: { registrationToken: "" },
    }
  );

  const savedDocs = await saveRegistrationDocuments(candidateId, candidate._id, formData);

  await Promise.all([
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
      email: candidate.email.toLowerCase(),
    }),
  ]);

  return { registrationId, candidateId, submittedAt };
}

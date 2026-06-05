import { Types } from "mongoose";
import { Candidate } from "@/models/Candidate";
import { CandidateDocument } from "@/models/CandidateDocument";
import { Interview } from "@/models/Interview";
import { LetterOfIntent } from "@/models/LetterOfIntent";
import { Lead } from "@/models/Lead";
import { LeadDocument } from "@/models/LeadDocument";
import type { LeadStatus } from "@/lib/constants";
import { CANDIDATE_REGISTRY_FILTER, PRE_REGISTRATION_LIFECYCLE_STAGES } from "@/lib/candidate-scope";

function mapLegacyLeadStatus(
  leadStatus: string | null | undefined,
  lifecycleStage: string
): LeadStatus {
  if (leadStatus === "NEW_LEAD") return "NEW_LEAD";
  if (leadStatus === "INTERVIEW_SCHEDULED" || lifecycleStage === "INTERVIEW_SCHEDULED") return "INTERVIEW_SCHEDULED";
  if (leadStatus === "INTERVIEW_COMPLETED" || lifecycleStage === "INTERVIEW_COMPLETED") return "INTERVIEW_COMPLETED";
  if (leadStatus === "SELECTED" || lifecycleStage === "INTERVIEW_SELECTED") {
    if (lifecycleStage === "AWAITING_REGISTRATION") return "AWAITING_REGISTRATION";
    if (lifecycleStage === "LETTER_OF_INTENT_SENT") return "LOI_SENT";
    return "SELECTED";
  }
  if (leadStatus === "REJECTED") return "REJECTED";
  if (leadStatus === "HOLD") return "HOLD";
  if (lifecycleStage === "AWAITING_REGISTRATION") return "AWAITING_REGISTRATION";
  if (lifecycleStage === "LETTER_OF_INTENT_SENT") return "LOI_SENT";
  return "NEW_LEAD";
}

async function relinkAndDeleteLegacyCandidate(
  candidateId: Types.ObjectId,
  leadId: Types.ObjectId
) {
  await Interview.updateMany({ candidateId }, { $set: { leadId } });
  await LetterOfIntent.updateMany({ candidateId }, { $set: { leadId } });
  await Candidate.deleteOne({ _id: candidateId });
}

/** Move pre-registration Candidate rows into the Lead collection. */
export async function migrateLegacyLeadsToLeadCollection() {
  const legacyRows = await Candidate.find({
    lifecycleStage: { $in: PRE_REGISTRATION_LIFECYCLE_STAGES },
  }).lean();

  if (legacyRows.length === 0) return;

  for (const row of legacyRows) {
    const existingLead = await Lead.findOne({ email: row.email, convertedAt: null }).lean();

    if (existingLead) {
      await relinkAndDeleteLegacyCandidate(row._id, existingLead._id);
      continue;
    }

    const lead = await Lead.create({
      fullName: row.fullName,
      email: row.email,
      phone: row.phone,
      referenceSource: row.referenceSource ?? "OTHER",
      referenceName: "",
      remarks: row.leadComments ?? "",
      leadStatus: mapLegacyLeadStatus(row.leadStatus, row.lifecycleStage),
      registrationToken: row.registrationToken ?? null,
      convertedAt: null,
      candidateId: null,
    });

    const resume = await CandidateDocument.findOne({
      candidateId: row._id,
      documentType: "RESUME",
    })
      .sort({ createdAt: -1 })
      .lean();

    if (resume) {
      await LeadDocument.create({
        leadId: lead._id,
        documentType: "RESUME",
        fileName: resume.fileName,
        filePath: resume.filePath,
        mimeType: resume.mimeType,
        fileSize: resume.fileSize,
      });
    }

    await relinkAndDeleteLegacyCandidate(row._id, lead._id);
  }
}

/** Backfill registrationSubmittedAt for legacy post-registration candidates. */
export async function backfillCandidateRegistrationTimestamps() {
  const rows = await Candidate.find({
    ...CANDIDATE_REGISTRY_FILTER,
    $or: [{ registrationSubmittedAt: null }, { registrationSubmittedAt: { $exists: false } }],
  })
    .select("createdAt updatedAt")
    .lean();

  for (const row of rows) {
    await Candidate.updateOne(
      { _id: row._id },
      { $set: { registrationSubmittedAt: row.updatedAt ?? row.createdAt ?? new Date() } }
    );
  }
}

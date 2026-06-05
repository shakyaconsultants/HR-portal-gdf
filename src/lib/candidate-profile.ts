import { connectDb } from "@/lib/db";
import { Candidate } from "@/models/Candidate";
import { CandidateDocument } from "@/models/CandidateDocument";
import { CandidateTimeline } from "@/models/CandidateTimeline";
import { Evaluation } from "@/models/Evaluation";
import { CommunicationLog } from "@/models/CommunicationLog";
import { Onboarding } from "@/models/Onboarding";
import {
  buildOnboardingLinks,
  computeOnboardingProgress,
  formatOnboardingExpiryDate,
  isOnboardingTokenExpired,
  sectionFillLabel,
  sectionLabel,
} from "@/lib/onboarding";
import { ONBOARDING_SECTIONS } from "@/lib/constants";
import { sanitizeDeliveryError } from "@/lib/delivery-errors";
import { BatchTransfer } from "@/models/BatchTransfer";
import { Types } from "mongoose";

type PopulatedBatch = {
  _id: Types.ObjectId;
  name: string;
  trainerName: string;
  startDate: Date;
  endDate: Date;
  status: string;
};

function isPopulatedBatch(batchId: unknown): batchId is PopulatedBatch {
  return (
    typeof batchId === "object" &&
    batchId !== null &&
    "name" in batchId &&
    typeof (batchId as PopulatedBatch).name === "string"
  );
}

export async function getCandidateProfile(candidateId: string) {
  await connectDb();
  if (!Types.ObjectId.isValid(candidateId)) {
    return null;
  }

  const candidate = await Candidate.findById(candidateId)
    .populate({ path: "batchId", select: "name trainerName startDate endDate status" })
    .lean();

  if (!candidate) {
    return null;
  }

  const [documents, timeline, evaluation, communications, onboarding, transfers] = await Promise.all([
    CandidateDocument.find({ candidateId }).sort({ createdAt: -1 }).lean(),
    CandidateTimeline.find({ candidateId }).sort({ createdAt: -1 }).limit(100).lean(),
    Evaluation.findOne({ candidateId }).lean(),
    CommunicationLog.find({ candidateId }).sort({ createdAt: -1 }).limit(50).lean(),
    Onboarding.findOne({ candidateId }).lean(),
    BatchTransfer.find({ candidateId })
      .populate({ path: "fromBatchId", select: "name" })
      .populate({ path: "toBatchId", select: "name" })
      .sort({ createdAt: -1 })
      .limit(20)
      .lean(),
  ]);

  return {
    candidate: {
      id: candidate._id.toString(),
      registrationId: candidate.registrationId,
      fullName: candidate.fullName,
      email: candidate.email,
      phone: candidate.phone,
      city: candidate.city,
      state: candidate.state,
      address: candidate.address,
      pincode: candidate.pincode,
      dateOfBirth: candidate.dateOfBirth,
      candidateType: candidate.candidateType,
      qualification: candidate.qualification,
      education: candidate.education,
      experienceYears: candidate.experienceYears,
      previousOrganization: candidate.previousOrganization,
      previousCtc: candidate.previousCtc,
      preferredRole: candidate.preferredRole,
      notes: candidate.notes,
      lifecycleStage: candidate.lifecycleStage,
      status: candidate.lifecycleStage,
      verificationStage: candidate.verificationStage,
      verificationRejected: candidate.verificationRejected ?? false,
      verificationRemarks: candidate.verificationRemarks,
      batchId:
        isPopulatedBatch(candidate.batchId)
          ? candidate.batchId._id.toString()
          : candidate.batchId
            ? String(candidate.batchId)
            : null,
      batch: isPopulatedBatch(candidate.batchId)
        ? {
            id: candidate.batchId._id.toString(),
            name: candidate.batchId.name,
            trainerName: candidate.batchId.trainerName,
            startDate: candidate.batchId.startDate,
            endDate: candidate.batchId.endDate,
            status: candidate.batchId.status,
          }
        : null,
      trainingStatus: candidate.trainingStatus,
      evaluationStatus: candidate.evaluationStatus,
      finalScore: candidate.finalScore,
      evaluationRemarks: candidate.evaluationRemarks,
      decision: candidate.decision,
      decisionRemarks: candidate.decisionRemarks,
      salarySlab: candidate.salarySlab,
      proposedCtc: candidate.proposedCtc,
      finalCtc: candidate.finalCtc,
      salaryRemarks: candidate.salaryRemarks,
      gender: candidate.gender ?? "",
      maritalStatus: candidate.maritalStatus ?? "",
      fatherName: candidate.fatherName ?? "",
      fatherPhone: candidate.fatherPhone ?? "",
      motherName: candidate.motherName ?? "",
      motherPhone: candidate.motherPhone ?? "",
      currentAddress: candidate.currentAddress ?? "",
      permanentAddress: candidate.permanentAddress ?? "",
      referenceSource: candidate.referenceSource ?? "",
      referenceName: candidate.referenceName ?? "",
      leadComments: candidate.leadComments ?? "",
      joiningDate: candidate.joiningDate,
      monthOfJoining: candidate.monthOfJoining ?? "",
      designation: candidate.designation ?? "",
      department: candidate.department ?? "",
      employeeId: candidate.employeeId ?? "",
      idCardPdfPath: candidate.idCardPdfPath ?? "",
      idCardPdfFileName: candidate.idCardPdfFileName ?? "",
      idCardGeneratedAt: candidate.idCardGeneratedAt ?? null,
      idCardEmailStatus: candidate.idCardEmailStatus ?? "",
      idCardEmailSentAt: candidate.idCardEmailSentAt ?? null,
      aadharPanNumber: candidate.aadharPanNumber ?? "",
      professionalPhotoPath: candidate.professionalPhotoPath ?? "",
      aadharPanPhotoPath: candidate.aadharPanPhotoPath ?? "",
      joiningDeclarationAccepted: candidate.joiningDeclarationAccepted ?? false,
      policyComplianceAccepted: candidate.policyComplianceAccepted ?? false,
      registrationSubmittedAt: candidate.registrationSubmittedAt,
      createdAt: candidate.createdAt,
      updatedAt: candidate.updatedAt,
    },
    documents: documents.map((d) => ({
      id: d._id.toString(),
      documentType: d.documentType,
      fileName: d.fileName,
      filePath: d.filePath,
      mimeType: d.mimeType,
      fileSize: d.fileSize,
      createdAt: d.createdAt,
    })),
    evaluation: evaluation
      ? {
          id: evaluation._id.toString(),
          communicationSkills: evaluation.communicationSkills,
          confidenceLevel: evaluation.confidenceLevel,
          productUnderstanding: evaluation.productUnderstanding,
          salesPitch: evaluation.salesPitch,
          objectionHandling: evaluation.objectionHandling,
          finalScore: evaluation.finalScore,
          remarks: evaluation.remarks,
          evaluatorName: evaluation.evaluatorName ?? "",
          evaluatedAt: evaluation.evaluatedAt ?? evaluation.createdAt,
          createdAt: evaluation.createdAt,
        }
      : null,
    communications: communications.map((c) => ({
      id: c._id.toString(),
      type: c.type,
      subject: c.subject,
      sentToEmail: c.sentToEmail,
      status: c.status,
      sentByName: c.sentByName ?? "",
      sentAt: c.sentAt ?? c.createdAt,
      createdAt: c.createdAt,
      attachmentCount: c.attachments?.length ?? 0,
      hasHtml: Boolean(c.htmlBody),
      errorMessage: c.errorMessage ? sanitizeDeliveryError(c.errorMessage) : "",
    })),
    onboarding: onboarding
      ? {
          id: onboarding._id.toString(),
          status: onboarding.status,
          profileSource: "candidate",
          progress: computeOnboardingProgress(onboarding),
          links: onboarding.accessToken ? buildOnboardingLinks(onboarding.accessToken) : null,
          tokenGeneratedAt: onboarding.tokenGeneratedAt,
          tokenExpiresAt: formatOnboardingExpiryDate(onboarding.tokenGeneratedAt),
          tokenExpired: isOnboardingTokenExpired(onboarding.tokenGeneratedAt),
          sections: ONBOARDING_SECTIONS.map((section) => ({
            section,
            label: sectionLabel(section),
            fillStatus: sectionFillLabel(onboarding, section),
            submittedAt:
              section === "JOINING_FORM" ? onboarding.joiningFormSubmittedAt : onboarding.idCardInfoSubmittedAt,
          })),
          updatedAt: onboarding.updatedAt,
        }
      : null,
    transfers: transfers.map((t) => {
      const fromName =
        t.fromBatchId && typeof t.fromBatchId === "object" && "name" in t.fromBatchId
          ? (t.fromBatchId as { name: string }).name
          : null;
      const toName =
        t.toBatchId && typeof t.toBatchId === "object" && "name" in t.toBatchId
          ? (t.toBatchId as { name: string }).name
          : null;
      return {
        id: t._id.toString(),
        fromBatchId:
          typeof t.fromBatchId === "object" && t.fromBatchId && "_id" in t.fromBatchId
            ? (t.fromBatchId as { _id: Types.ObjectId })._id.toString()
            : String(t.fromBatchId),
        toBatchId:
          typeof t.toBatchId === "object" && t.toBatchId && "_id" in t.toBatchId
            ? (t.toBatchId as { _id: Types.ObjectId })._id.toString()
            : String(t.toBatchId),
        fromBatchName: fromName,
        toBatchName: toName,
        reason: t.reason,
        createdAt: t.createdAt,
      };
    }),
    timeline: timeline.map((t) => ({
      id: t._id.toString(),
      action: t.action,
      remarks: t.remarks,
      actorRole: t.actorRole,
      actorName: t.actorName,
      createdAt: t.createdAt,
    })),
  };
}

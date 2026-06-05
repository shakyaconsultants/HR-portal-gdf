import { NextRequest } from "next/server";
import { connectDb } from "@/lib/db";
import { apiOk, requireAuth } from "@/lib/api";
import { LEAD_STATUSES } from "@/lib/constants";
import { LIFECYCLE_STAGES } from "@/lib/lifecycle";
import { Candidate } from "@/models/Candidate";
import { Lead } from "@/models/Lead";
import { Batch } from "@/models/Batch";
import { CommunicationLog } from "@/models/CommunicationLog";
import { Onboarding } from "@/models/Onboarding";
import { CANDIDATE_REGISTRY_FILTER } from "@/lib/candidate-scope";
import { MOCK_CALL_ELIGIBILITY_FILTER } from "@/lib/mock-call";
import { buildFunnelConversions, buildWorkflowCounts } from "@/lib/dashboard-workflow";

export async function GET(request: NextRequest) {
  const auth = await requireAuth(request, ["ADMIN", "HR", "TRAINER"]);
  if (auth.error) {
    return auth.error;
  }

  await connectDb();

  const CANDIDATE_ONLY_FILTER = CANDIDATE_REGISTRY_FILTER;

  const stageCountPromises = LIFECYCLE_STAGES.map((stage) =>
    Candidate.countDocuments({ ...CANDIDATE_ONLY_FILTER, lifecycleStage: stage }).then((count) => ({
      stage,
      count,
    }))
  );

  const [
    stageCounts,
    activeBatches,
    verificationRejected,
    verificationApproved,
    verificationPending,
    pendingHiringDecision,
    holdCandidates,
    rejectedHiring,
    mockCallEvaluated,
    communicationsSent,
    emailsPending,
    emailsFailed,
    onboardingCompleted,
    onboardingAwaitingReview,
    onboardingNotStarted,
    onboardingInProgress,
    onboardingCorrections,
    totalCandidates,
    leadStatusCounts,
    registrationPending,
    registrationSubmitted,
    mockCallPending,
    hiringSelected,
    offerLettersSent,
    onboardingPendingCandidates,
  ] = await Promise.all([
    Promise.all(stageCountPromises),
    Batch.countDocuments({ status: "ACTIVE" }),
    Candidate.countDocuments({ ...CANDIDATE_ONLY_FILTER, lifecycleStage: "VERIFICATION", verificationRejected: true }),
    Candidate.countDocuments({
      ...CANDIDATE_ONLY_FILTER,
      lifecycleStage: "VERIFICATION",
      verificationStage: "FINAL_APPROVED",
      verificationRejected: { $ne: true },
    }),
    Candidate.countDocuments({
      ...CANDIDATE_ONLY_FILTER,
      lifecycleStage: { $in: ["REGISTRATION_SUBMITTED", "VERIFICATION"] },
      verificationRejected: { $ne: true },
      verificationStage: { $ne: "FINAL_APPROVED" },
    }),
    Candidate.countDocuments({
      ...CANDIDATE_ONLY_FILTER,
      lifecycleStage: "HIRING_DECISION",
      evaluationStatus: "EVALUATED",
      $or: [{ decision: null }, { decision: { $exists: false } }],
    }),
    Candidate.countDocuments({ ...CANDIDATE_ONLY_FILTER, decision: "HOLD" }),
    Candidate.countDocuments({ ...CANDIDATE_ONLY_FILTER, decision: "REJECTED" }),
    Candidate.countDocuments({ ...CANDIDATE_ONLY_FILTER, evaluationStatus: "EVALUATED" }),
    CommunicationLog.countDocuments({ status: "SENT" }),
    CommunicationLog.countDocuments({ status: "PENDING" }),
    CommunicationLog.countDocuments({ status: "FAILED" }),
    Onboarding.countDocuments({ status: "COMPLETED" }),
    Onboarding.countDocuments({
      $or: [{ joiningFormStatus: "UNDER_REVIEW" }, { idCardInfoStatus: "UNDER_REVIEW" }],
    }),
    Onboarding.countDocuments({
      joiningFormStatus: "NOT_STARTED",
      idCardInfoStatus: "NOT_STARTED",
    }),
    Onboarding.countDocuments({ status: "IN_PROGRESS" }),
    Onboarding.countDocuments({
      $or: [{ joiningFormStatus: "CORRECTIONS_REQUESTED" }, { idCardInfoStatus: "CORRECTIONS_REQUESTED" }],
    }),
    Candidate.countDocuments(CANDIDATE_ONLY_FILTER),
    Promise.all(
      LEAD_STATUSES.map((status) =>
        Lead.countDocuments({ convertedAt: null, leadStatus: status }).then((count) => ({ status, count }))
      )
    ),
    Lead.countDocuments({ convertedAt: null, leadStatus: "AWAITING_REGISTRATION" }),
    Candidate.countDocuments(CANDIDATE_ONLY_FILTER),
    Candidate.countDocuments({ ...MOCK_CALL_ELIGIBILITY_FILTER, ...CANDIDATE_ONLY_FILTER }),
    Candidate.countDocuments({ ...CANDIDATE_ONLY_FILTER, decision: "SELECTED" }),
    CommunicationLog.countDocuments({ type: "OFFER_LETTER", status: "SENT" }),
    Candidate.countDocuments({
      ...CANDIDATE_ONLY_FILTER,
      decision: "SELECTED",
      lifecycleStage: { $in: ["OFFER_LETTER", "JOINING_INSTRUCTIONS"] },
    }),
  ]);

  const lifecycleCounts = Object.fromEntries(stageCounts.map(({ stage, count }) => [stage, count])) as Record<
    string,
    number
  >;

  const hiringDecided = hiringSelected + holdCandidates + rejectedHiring;
  const selectionRate =
    mockCallEvaluated > 0
      ? Math.round(
          ((lifecycleCounts.OFFER_LETTER ?? 0) +
            (lifecycleCounts.JOINING_INSTRUCTIONS ?? 0) +
            (lifecycleCounts.EMPLOYEE ?? 0)) /
            mockCallEvaluated *
            100
        )
      : 0;

  const offerLetterStage = lifecycleCounts.OFFER_LETTER ?? 0;
  const joiningStage = lifecycleCounts.JOINING_INSTRUCTIONS ?? 0;

  const leadCounts = Object.fromEntries(leadStatusCounts.map(({ status, count }) => [status, count])) as Record<
    string,
    number
  >;
  const totalLeads = leadStatusCounts.reduce((sum, { count }) => sum + count, 0);

  const workflow = buildWorkflowCounts({
    lifecycleCounts,
    totalLeads,
    mockCallPending,
    hiringDecisionPending: pendingHiringDecision,
    selected: hiringSelected,
    hold: holdCandidates,
    rejected: rejectedHiring,
    offerLettersSent,
    onboardingPending: onboardingPendingCandidates,
  });

  const funnelConversions = buildFunnelConversions(workflow, lifecycleCounts);

  return apiOk({
    workflow,
    funnelConversions,
    totalCandidates,
    lifecycleCounts,
    totalRegistrations: registrationSubmitted,
    registrationPending,
    registrationSubmitted,
    pendingVerification: verificationPending,
    approvedVerification: verificationApproved,
    rejectedVerification: verificationRejected,
    activeBatches,
    candidatesInTraining: lifecycleCounts.TRAINING ?? 0,
    mockCallEvaluated,
    mockCallPending,
    pendingHiringDecision,
    selectedCandidates: hiringSelected,
    holdCandidates,
    rejectedHiring,
    hiringDecided,
    selectionRate,
    awaitingOnboarding: joiningStage,
    communicationsSent,
    emailsPending,
    emailsFailed,
    fullyCommunicated: joiningStage + (lifecycleCounts.EMPLOYEE ?? 0),
    pendingCommunications: offerLetterStage,
    onboardingCompleted,
    onboardingAwaitingReview,
    onboardingNotStarted,
    onboardingInProgress,
    onboardingCorrections,
    totalActiveLeads: totalLeads,
    leadsAwaitingRegistration: leadCounts.AWAITING_REGISTRATION ?? 0,
    leads: totalLeads,
    newLeads: leadCounts.NEW_LEAD ?? 0,
    leadsInterviewScheduled: leadCounts.INTERVIEW_SCHEDULED ?? 0,
    leadsSelected: leadCounts.SELECTED ?? 0,
    leadsRejected: leadCounts.REJECTED ?? 0,
    leadCounts,
    interviewScheduled: lifecycleCounts.INTERVIEW_SCHEDULED ?? 0,
    interviewCompleted: lifecycleCounts.INTERVIEW_COMPLETED ?? 0,
    interviewSelected: lifecycleCounts.INTERVIEW_SELECTED ?? 0,
    loiSent: lifecycleCounts.LETTER_OF_INTENT_SENT ?? 0,
    batchAssignment: lifecycleCounts.BATCH_ASSIGNMENT ?? 0,
    finalMockCall: lifecycleCounts.FINAL_MOCK_CALL ?? 0,
    employees: lifecycleCounts.EMPLOYEE ?? 0,
  });
}


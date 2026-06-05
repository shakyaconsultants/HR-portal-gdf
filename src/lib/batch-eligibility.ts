/** Candidates verified and ready for batch assignment. */
export const BATCH_ASSIGNMENT_ELIGIBILITY_FILTER = {
  lifecycleStage: "BATCH_ASSIGNMENT" as const,
  batchId: null,
  verificationStage: "FINAL_APPROVED" as const,
  verificationRejected: { $ne: true },
};

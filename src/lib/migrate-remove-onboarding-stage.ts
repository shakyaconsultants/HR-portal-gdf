import { connectDb } from "@/lib/db";
import { Candidate } from "@/models/Candidate";
import { Onboarding } from "@/models/Onboarding";
import { deriveOnboardingStatus } from "@/lib/onboarding";

/** Reassign legacy ONBOARDING lifecycle stage after stage removal from pipeline. */
export async function migrateRemoveOnboardingStage() {
  await connectDb();

  const onboardingCandidates = await Onboarding.find({}).select("candidateId status").lean();
  const completedIds = onboardingCandidates
    .filter((o) => deriveOnboardingStatus(o) === "COMPLETED" || o.status === "COMPLETED")
    .map((o) => o.candidateId);

  if (completedIds.length > 0) {
    await Candidate.updateMany(
      { _id: { $in: completedIds }, lifecycleStage: "JOINING_INSTRUCTIONS" },
      { $set: { lifecycleStage: "EMPLOYEE" } }
    );
  }

  // Legacy stage value removed from schema — use collection API to avoid enum typing.
  await Candidate.collection.updateMany(
    { lifecycleStage: "ONBOARDING" },
    { $set: { lifecycleStage: "JOINING_INSTRUCTIONS" } }
  );
}

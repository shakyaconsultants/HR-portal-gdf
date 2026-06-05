import { Candidate } from "@/models/Candidate";
import { legacyStatusToLifecycleStage } from "@/lib/lifecycle";

let migrationRan = false;

export async function migrateCandidatesToLifecycle() {
  if (migrationRan) return;
  migrationRan = true;

  const legacy = await Candidate.find({
    $or: [{ lifecycleStage: { $exists: false } }, { lifecycleStage: null }],
    status: { $exists: true },
  } as Record<string, unknown>)
    .select("status batchId evaluationStatus decision verificationStage verificationRejected")
    .limit(500)
    .lean();

  if (legacy.length === 0) return;

  const ops = legacy.map((c) => ({
    updateOne: {
      filter: { _id: c._id },
      update: {
        $set: {
          lifecycleStage: legacyStatusToLifecycleStage((c as { status?: string }).status as string, {
            batchId: c.batchId,
            evaluationStatus: c.evaluationStatus as string | undefined,
            decision: c.decision as "SELECTED" | "HOLD" | "REJECTED" | null | undefined,
            verificationStage: c.verificationStage as string | undefined,
            verificationRejected: c.verificationRejected as boolean | undefined,
          }),
          ...((c as { status?: string }).status === "VERIFICATION_REJECTED"
            ? { verificationRejected: true }
            : {}),
        },
      },
    },
  }));

  await Candidate.bulkWrite(ops);

  await Candidate.updateMany(
    { lifecycleStage: "LEAD", $or: [{ leadStatus: null }, { leadStatus: { $exists: false } }] },
    { $set: { leadStatus: "NEW_LEAD" } }
  );
}

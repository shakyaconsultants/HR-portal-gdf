import "server-only";
import { Onboarding } from "@/models/Onboarding";

/** Map legacy 3-section onboarding statuses to 2-section model. */
export async function migrateOnboardingToTwoForms() {
  const records = await Onboarding.find({
    $or: [{ joiningFormStatus: { $exists: false } }, { joiningFormStatus: null }],
  })
    .select("personalInfoStatus bankDetailsStatus idCardInfoStatus joiningFormStatus")
    .lean();

  for (const record of records) {
    const personal = String(record.personalInfoStatus ?? "NOT_STARTED");
    const bank = String(record.bankDetailsStatus ?? "NOT_STARTED");
    let joiningFormStatus = "NOT_STARTED";

    if (personal === "APPROVED" && bank === "APPROVED") joiningFormStatus = "APPROVED";
    else if (
      personal === "UNDER_REVIEW" ||
      bank === "UNDER_REVIEW" ||
      personal === "SUBMITTED" ||
      bank === "SUBMITTED"
    ) {
      joiningFormStatus = "UNDER_REVIEW";
    } else if (personal === "CORRECTIONS_REQUESTED" || bank === "CORRECTIONS_REQUESTED") {
      joiningFormStatus = "CORRECTIONS_REQUESTED";
    }

    await Onboarding.updateOne({ _id: record._id }, { $set: { joiningFormStatus } });
  }
}

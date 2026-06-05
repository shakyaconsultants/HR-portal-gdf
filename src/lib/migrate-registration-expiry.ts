import "server-only";
import { Lead } from "@/models/Lead";
import { LetterOfIntent } from "@/models/LetterOfIntent";
import { computeRegistrationExpiry } from "@/lib/registration-expiry";

/** Backfill expiry for leads that already have a registration token from a sent LOI. */
export async function backfillRegistrationTokenExpiry() {
  const leads = await Lead.find({
    registrationToken: { $ne: null },
    registrationTokenExpiresAt: null,
  })
    .select("_id updatedAt")
    .lean();

  for (const lead of leads) {
    const loi = await LetterOfIntent.findOne({ leadId: lead._id }).sort({ sentAt: -1 }).select("sentAt").lean();
    const base = loi?.sentAt ?? lead.updatedAt ?? new Date();
    await Lead.updateOne(
      { _id: lead._id },
      { $set: { registrationTokenExpiresAt: computeRegistrationExpiry(new Date(base)) } }
    );
  }
}

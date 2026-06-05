import { Types } from "mongoose";
import { connectDb } from "@/lib/db";
import { generateOnboardingToken, buildOnboardingLinks } from "@/lib/onboarding";
import { sendWorkflowEmail } from "@/lib/communications";
import { Candidate } from "@/models/Candidate";
import { Onboarding } from "@/models/Onboarding";
import { CandidateTimeline } from "@/models/CandidateTimeline";

export async function ensureOnboardingInvite(
  candidateId: string,
  actor?: { userId: string; name: string; role: string },
  options?: { regenerate?: boolean; skipEmail?: boolean }
) {
  await connectDb();
  if (!Types.ObjectId.isValid(candidateId)) return null;

  const existing = await Onboarding.findOne({ candidateId }).lean();
  if (existing?.accessToken && !options?.regenerate) {
    return {
      onboarding: existing,
      links: buildOnboardingLinks(existing.accessToken),
      created: false,
    };
  }

  const token = generateOnboardingToken();
  const onboarding = await Onboarding.findOneAndUpdate(
    { candidateId },
    {
      $set: {
        accessToken: token,
        tokenGeneratedAt: new Date(),
        status: "PENDING",
        joiningFormStatus: "NOT_STARTED",
        idCardInfoStatus: "NOT_STARTED",
        ...(actor?.userId ? { updatedBy: actor.userId } : {}),
      },
    },
    { upsert: true, new: true }
  ).lean();

  const links = buildOnboardingLinks(token);

  if (actor) {
    const candidate = await Candidate.findById(candidateId).select("email fullName decision").lean();
    let emailStatus: string | null = null;

    if (!options?.skipEmail && candidate?.decision === "SELECTED" && candidate.email) {
      const sendResult = await sendWorkflowEmail({
        candidateId,
        type: "ONBOARDING_INVITATION",
        to: candidate.email,
        sentBy: { userId: actor.userId, name: actor.name },
        relatedId: onboarding._id,
        relatedModel: "Onboarding",
        extras: {
          onboardingLink: links.hub,
          joiningFormLink: links.joiningForm,
          idCardFormLink: links.idCard,
        },
      });
      emailStatus = sendResult.status;
    }

    await CandidateTimeline.create({
      candidateId,
      action: "ONBOARDING_LINKS_GENERATED",
      actorRole: actor.role,
      actorName: actor.name,
      remarks: emailStatus
        ? `Onboarding links generated. Invitation email ${emailStatus}.`
        : "Onboarding form links generated for selected candidate.",
    });
  }

  return {
    onboarding,
    links,
    created: true,
  };
}

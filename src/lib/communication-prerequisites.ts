import "server-only";
import { Types } from "mongoose";
import type { CommunicationType } from "@/lib/constants";
import { connectDb } from "@/lib/db";
import { lifecycleStageIndex, type LifecycleStage } from "@/lib/lifecycle";
import { CommunicationLog } from "@/models/CommunicationLog";

const WORKFLOW_COMM_ORDER = ["OFFER_LETTER", "JOINING_INSTRUCTIONS"] as const;

type WorkflowCommType = (typeof WORKFLOW_COMM_ORDER)[number];

/** Latest delivery status per communication type (newest log wins). */
export async function getLatestCommunicationStatus(
  candidateId: string | Types.ObjectId
): Promise<Partial<Record<CommunicationType, { status: string; sentAt: Date | null }>>> {
  await connectDb();
  const id = String(candidateId);
  if (!Types.ObjectId.isValid(id)) return {};

  const logs = await CommunicationLog.find({ candidateId: id })
    .sort({ sentAt: -1, createdAt: -1 })
    .select("type status sentAt createdAt")
    .lean();

  const byType: Partial<Record<CommunicationType, { status: string; sentAt: Date | null }>> = {};
  for (const log of logs) {
    const type = log.type as CommunicationType;
    if (!byType[type]) {
      byType[type] = {
        status: log.status,
        sentAt: log.sentAt ?? log.createdAt ?? null,
      };
    }
  }
  return byType;
}

export async function isCommunicationDelivered(
  candidateId: string | Types.ObjectId,
  type: CommunicationType
): Promise<boolean> {
  const latest = await getLatestCommunicationStatus(candidateId);
  return latest[type]?.status === "SENT";
}

function prerequisiteLabel(type: WorkflowCommType): string {
  return type === "OFFER_LETTER" ? "Offer letter" : "Joining instructions";
}

/** Required successful email before sending `type`. */
export function requiredCommunicationBefore(type: CommunicationType): WorkflowCommType | null {
  if (type === "JOINING_INSTRUCTIONS") return "OFFER_LETTER";
  return null;
}

export async function assertCanSendCommunication(
  candidateId: string,
  type: CommunicationType
): Promise<{ ok: true } | { ok: false; message: string }> {
  const required = requiredCommunicationBefore(type);
  if (!required) return { ok: true };

  const delivered = await isCommunicationDelivered(candidateId, required);
  if (!delivered) {
    return {
      ok: false,
      message: `${prerequisiteLabel(required)} must be delivered successfully before sending ${prerequisiteLabel(type as WorkflowCommType).toLowerCase()}.`,
    };
  }
  return { ok: true };
}

/** Block forward lifecycle moves when prior workflow emails are not delivered. */
export async function assertCanSetLifecycleStage(
  candidateId: string,
  fromStage: LifecycleStage,
  toStage: LifecycleStage
): Promise<{ ok: true } | { ok: false; message: string }> {
  const fromIdx = lifecycleStageIndex(fromStage);
  const toIdx = lifecycleStageIndex(toStage);
  if (toIdx <= fromIdx) return { ok: true };

  const joiningIdx = lifecycleStageIndex("JOINING_INSTRUCTIONS");
  const employeeIdx = lifecycleStageIndex("EMPLOYEE");

  if (toIdx >= joiningIdx) {
    const offerOk = await isCommunicationDelivered(candidateId, "OFFER_LETTER");
    if (!offerOk) {
      return {
        ok: false,
        message:
          "Cannot move to Joining & Onboarding until the offer letter email has been delivered successfully.",
      };
    }
  }

  if (toIdx >= employeeIdx) {
    const joiningOk = await isCommunicationDelivered(candidateId, "JOINING_INSTRUCTIONS");
    if (!joiningOk) {
      return {
        ok: false,
        message:
          "Cannot move to Employee until joining instructions have been delivered successfully.",
      };
    }
  }

  return { ok: true };
}

export async function assertOnboardingAccess(candidateId: string): Promise<{ ok: true } | { ok: false; message: string }> {
  const offerOk = await isCommunicationDelivered(candidateId, "OFFER_LETTER");
  if (!offerOk) {
    return {
      ok: false,
      message: "Onboarding forms are available after the offer letter has been delivered to the candidate.",
    };
  }
  return { ok: true };
}

export { WORKFLOW_COMM_ORDER };

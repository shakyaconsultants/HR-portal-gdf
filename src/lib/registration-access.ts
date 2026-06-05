import "server-only";
import { Types } from "mongoose";
import { connectDb } from "@/lib/db";
import { Candidate } from "@/models/Candidate";
import { Lead } from "@/models/Lead";
import { LetterOfIntent } from "@/models/LetterOfIntent";
import {
  computeRegistrationExpiry,
  formatRegistrationExpiryDate,
  isRegistrationExpired,
} from "@/lib/registration-expiry";
import { isValidRegistrationToken } from "@/lib/registration-link";
import { formatReferenceSource } from "@/lib/leads";

export type RegistrationPrefill = {
  fullName: string;
  email: string;
  phone: string;
  referenceSource?: string;
  referenceName?: string;
  fromLead?: boolean;
};

export type RegistrationAccess =
  | {
      ok: true;
      source: "lead";
      prefill: RegistrationPrefill;
      expiresAt: Date;
      expiresAtLabel: string;
    }
  | {
      ok: true;
      source: "candidate";
      prefill: RegistrationPrefill;
      expiresAt: Date | null;
      expiresAtLabel: string | null;
    }
  | {
      ok: false;
      reason: "invalid" | "expired" | "completed" | "unavailable";
      title: string;
      message: string;
    };

async function resolveLeadExpiry(lead: {
  _id: Types.ObjectId;
  registrationTokenExpiresAt?: Date | null;
  updatedAt?: Date;
}) {
  if (lead.registrationTokenExpiresAt) {
    return new Date(lead.registrationTokenExpiresAt);
  }

  const loi = await LetterOfIntent.findOne({ leadId: lead._id })
    .sort({ sentAt: -1 })
    .select("sentAt")
    .lean();
  const base = loi?.sentAt ?? lead.updatedAt ?? new Date();
  return computeRegistrationExpiry(new Date(base));
}

export async function resolveRegistrationAccess(token: string): Promise<RegistrationAccess> {
  if (!isValidRegistrationToken(token)) {
    return {
      ok: false,
      reason: "invalid",
      title: "Link unavailable",
      message: "This registration link is invalid. Use the secure link from your Letter of Intent email.",
    };
  }

  await connectDb();

  const lead = await Lead.findOne({ registrationToken: token, convertedAt: null })
    .select("fullName email phone leadStatus registrationTokenExpiresAt updatedAt referenceSource referenceName")
    .lean();

  if (lead) {
    if (lead.leadStatus !== "AWAITING_REGISTRATION") {
      return {
        ok: false,
        reason: "unavailable",
        title: "Link unavailable",
        message: "Registration is not open for this link. Contact HR if you need assistance.",
      };
    }

    const expiresAt = await resolveLeadExpiry(lead);
    if (isRegistrationExpired(expiresAt)) {
      return {
        ok: false,
        reason: "expired",
        title: "Link expired",
        message: `This secure registration link expired on ${formatRegistrationExpiryDate(expiresAt)}. Please contact HR to request a new Letter of Intent.`,
      };
    }

    return {
      ok: true,
      source: "lead",
      prefill: {
        fullName: lead.fullName,
        email: lead.email,
        phone: lead.phone,
        referenceSource: lead.referenceSource ? formatReferenceSource(lead.referenceSource) : "",
        referenceName: lead.referenceName ?? "",
        fromLead: true,
      },
      expiresAt,
      expiresAtLabel: formatRegistrationExpiryDate(expiresAt),
    };
  }

  const candidate = await Candidate.findOne({ registrationToken: token })
    .select("fullName email phone lifecycleStage registrationSubmittedAt")
    .lean();

  if (!candidate) {
    return {
      ok: false,
      reason: "invalid",
      title: "Link unavailable",
      message: "This registration link is invalid or has already been used. Use the link from your Letter of Intent email.",
    };
  }

  if (candidate.registrationSubmittedAt) {
    return {
      ok: false,
      reason: "completed",
      title: "Registration complete",
      message: "Registration has already been completed using this link.",
    };
  }

  if (candidate.lifecycleStage !== "AWAITING_REGISTRATION") {
    return {
      ok: false,
      reason: "unavailable",
      title: "Link unavailable",
      message: "This registration link is no longer active. Contact HR if you need help.",
    };
  }

  return {
    ok: true,
    source: "candidate",
    prefill: {
      fullName: candidate.fullName,
      email: candidate.email,
      phone: candidate.phone,
    },
    expiresAt: null,
    expiresAtLabel: null,
  };
}

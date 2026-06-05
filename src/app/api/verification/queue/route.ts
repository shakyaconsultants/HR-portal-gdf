import { NextRequest } from "next/server";
import { connectDb } from "@/lib/db";
import { apiOk, requireAuth } from "@/lib/api";
import { Candidate } from "@/models/Candidate";

function mapCandidate(c: {
  _id: { toString(): string };
  registrationId?: string | null;
  fullName: string;
  email: string;
  phone: string;
  city: string;
  lifecycleStage: string;
  verificationStage: string;
  verificationRemarks?: string;
  verificationRejected?: boolean;
  updatedAt?: Date;
  createdAt?: Date;
}) {
  return {
    id: c._id.toString(),
    registrationId: c.registrationId,
    fullName: c.fullName,
    email: c.email,
    phone: c.phone,
    city: c.city,
    lifecycleStage: c.lifecycleStage,
    status: c.lifecycleStage,
    verificationStage: c.verificationStage,
    verificationRemarks: c.verificationRemarks ?? "",
    verificationRejected: c.verificationRejected ?? false,
    updatedAt: c.updatedAt ?? c.createdAt,
  };
}

export async function GET(request: NextRequest) {
  const auth = await requireAuth(request, ["ADMIN", "HR"]);
  if (auth.error) return auth.error;

  await connectDb();

  const tab = request.nextUrl.searchParams.get("tab") ?? "pending";
  const search = request.nextUrl.searchParams.get("search")?.trim();
  const searchFilter = search
    ? {
        $or: [
          { fullName: { $regex: search, $options: "i" } },
          { email: { $regex: search, $options: "i" } },
          { phone: { $regex: search, $options: "i" } },
          { registrationId: { $regex: search, $options: "i" } },
        ],
      }
    : {};

  const select =
    "registrationId fullName email phone city lifecycleStage verificationStage verificationRemarks verificationRejected updatedAt createdAt";
  const includePending = tab === "pending" || tab === "all";
  const includeApproved = tab === "approved" || tab === "all";
  const includeRejected = tab === "rejected" || tab === "all";

  const [pending, approved, rejected, pendingCount, approvedCount, rejectedCount] = await Promise.all([
    includePending
      ? Candidate.find({
          lifecycleStage: { $in: ["REGISTRATION_SUBMITTED", "VERIFICATION"] },
          verificationRejected: { $ne: true },
          verificationStage: { $ne: "FINAL_APPROVED" },
          ...searchFilter,
        })
          .sort({ updatedAt: -1 })
          .limit(100)
          .select(select)
          .lean()
      : [],
    includeApproved
      ? Candidate.find({
          lifecycleStage: { $in: ["VERIFICATION", "BATCH_ASSIGNMENT"] },
          verificationStage: "FINAL_APPROVED",
          verificationRejected: { $ne: true },
          ...searchFilter,
        })
          .sort({ updatedAt: -1 })
          .limit(100)
          .select(select)
          .lean()
      : [],
    includeRejected
      ? Candidate.find({ lifecycleStage: "VERIFICATION", verificationRejected: true, ...searchFilter })
          .sort({ updatedAt: -1 })
          .limit(100)
          .select(select)
          .lean()
      : [],
    Candidate.countDocuments({
      lifecycleStage: { $in: ["REGISTRATION_SUBMITTED", "VERIFICATION"] },
      verificationRejected: { $ne: true },
      verificationStage: { $ne: "FINAL_APPROVED" },
    }),
    Candidate.countDocuments({
      lifecycleStage: { $in: ["VERIFICATION", "BATCH_ASSIGNMENT"] },
      verificationStage: "FINAL_APPROVED",
      verificationRejected: { $ne: true },
    }),
    Candidate.countDocuments({ lifecycleStage: "VERIFICATION", verificationRejected: true }),
  ]);

  return apiOk({
    counts: {
      pending: pendingCount,
      approved: approvedCount,
      rejected: rejectedCount,
    },
    pending: pending.map(mapCandidate),
    approved: approved.map(mapCandidate),
    rejected: rejected.map(mapCandidate),
  });
}

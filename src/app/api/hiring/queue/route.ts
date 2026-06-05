import { NextRequest } from "next/server";
import { connectDb } from "@/lib/db";
import { apiOk, requireAuth } from "@/lib/api";
import { Candidate } from "@/models/Candidate";
import { Batch } from "@/models/Batch";

function mapCandidate(c: {
  _id: { toString(): string };
  registrationId?: string | null;
  fullName: string;
  email: string;
  phone: string;
  finalScore?: number | null;
  decision?: string | null;
  decisionRemarks?: string;
  batchId?: unknown;
  lifecycleStage: string;
  updatedAt?: Date;
}) {
  const batchName =
    c.batchId && typeof c.batchId === "object" && c.batchId !== null && "name" in c.batchId
      ? (c.batchId as { name: string }).name
      : null;
  return {
    id: c._id.toString(),
    registrationId: c.registrationId,
    fullName: c.fullName,
    email: c.email,
    phone: c.phone,
    finalScore: c.finalScore,
    decision: c.decision,
    decisionRemarks: c.decisionRemarks ?? "",
    batchName,
    lifecycleStage: c.lifecycleStage,
    status: c.lifecycleStage,
    updatedAt: c.updatedAt,
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
          { registrationId: { $regex: search, $options: "i" } },
        ],
      }
    : {};

  const [pendingCount, selectedCount, holdCount, rejectedCount, batches] = await Promise.all([
    Candidate.countDocuments({
      lifecycleStage: "HIRING_DECISION",
      evaluationStatus: "EVALUATED",
      $or: [{ decision: null }, { decision: { $exists: false } }],
    }),
    Candidate.countDocuments({ lifecycleStage: { $in: ["OFFER_LETTER", "JOINING_INSTRUCTIONS", "EMPLOYEE"] }, decision: "SELECTED" }),
    Candidate.countDocuments({ decision: "HOLD" }),
    Candidate.countDocuments({ lifecycleStage: "HIRING_DECISION", decision: "REJECTED" }),
    Batch.find().sort({ startDate: -1 }).select("name trainerName status startDate").lean(),
  ]);

  const select =
    "registrationId fullName email phone finalScore decision decisionRemarks batchId lifecycleStage updatedAt";
  const includePending = tab === "pending" || tab === "all";
  const includeSelected = tab === "selected" || tab === "all";
  const includeHold = tab === "hold" || tab === "all";
  const includeRejected = tab === "rejected" || tab === "all";

  const [pending, selected, hold, rejected] = await Promise.all([
    includePending
      ? Candidate.find({
          lifecycleStage: "HIRING_DECISION",
          evaluationStatus: "EVALUATED",
          $or: [{ decision: null }, { decision: { $exists: false } }],
          ...searchFilter,
        })
          .populate({ path: "batchId", select: "name" })
          .sort({ updatedAt: -1 })
          .limit(100)
          .select(select)
          .lean()
      : [],
    includeSelected
      ? Candidate.find({
          lifecycleStage: { $in: ["OFFER_LETTER", "JOINING_INSTRUCTIONS", "EMPLOYEE"] },
          decision: "SELECTED",
          ...searchFilter,
        })
          .populate({ path: "batchId", select: "name" })
          .sort({ updatedAt: -1 })
          .limit(100)
          .select(select)
          .lean()
      : [],
    includeHold
      ? Candidate.find({ decision: "HOLD", ...searchFilter })
          .populate({ path: "batchId", select: "name" })
          .sort({ updatedAt: -1 })
          .limit(100)
          .select(select)
          .lean()
      : [],
    includeRejected
      ? Candidate.find({ lifecycleStage: "HIRING_DECISION", decision: "REJECTED", ...searchFilter })
          .populate({ path: "batchId", select: "name" })
          .sort({ updatedAt: -1 })
          .limit(100)
          .select(select)
          .lean()
      : [],
  ]);

  return apiOk({
    counts: { pending: pendingCount, selected: selectedCount, hold: holdCount, rejected: rejectedCount },
    pending: pending.map(mapCandidate),
    selected: selected.map(mapCandidate),
    hold: hold.map(mapCandidate),
    rejected: rejected.map(mapCandidate),
    batches: batches.map((b) => ({
      id: b._id.toString(),
      name: b.name,
      trainerName: b.trainerName,
      status: b.status,
      startDate: b.startDate,
    })),
  });
}

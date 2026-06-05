import { NextRequest } from "next/server";
import { connectDb } from "@/lib/db";
import { apiOk, requireAuth } from "@/lib/api";
import { MOCK_CALL_ELIGIBILITY_FILTER } from "@/lib/mock-call";
import { Candidate } from "@/models/Candidate";
import { Evaluation } from "@/models/Evaluation";

function mapPending(c: {
  _id: { toString(): string };
  registrationId?: string | null;
  fullName: string;
  email: string;
  phone: string;
  batchId?: { toString(): string } | null;
  evaluationStatus: string;
  lifecycleStage: string;
  updatedAt?: Date;
}) {
  return {
    id: c._id.toString(),
    registrationId: c.registrationId,
    fullName: c.fullName,
    email: c.email,
    phone: c.phone,
    batchId: c.batchId?.toString() ?? null,
    evaluationStatus: c.evaluationStatus,
    lifecycleStage: c.lifecycleStage,
    status: c.lifecycleStage,
    updatedAt: c.updatedAt,
  };
}

export async function GET(request: NextRequest) {
  const auth = await requireAuth(request, ["ADMIN", "HR", "TRAINER"]);
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

  const [pendingCount, evaluatedCount, hiringEligibleCount] = await Promise.all([
    Candidate.countDocuments(MOCK_CALL_ELIGIBILITY_FILTER),
    Candidate.countDocuments({ evaluationStatus: "EVALUATED" }),
    Candidate.countDocuments({
      lifecycleStage: "HIRING_DECISION",
      evaluationStatus: "EVALUATED",
      $or: [{ decision: null }, { decision: { $exists: false } }],
    }),
  ]);

  const includePending = tab === "pending" || tab === "all";
  const includeEvaluated = tab === "evaluated" || tab === "all";

  const [pending, evaluations] = await Promise.all([
    includePending
      ? Candidate.find({ ...MOCK_CALL_ELIGIBILITY_FILTER, ...searchFilter })
          .sort({ updatedAt: -1 })
          .limit(100)
          .select("registrationId fullName email phone batchId evaluationStatus lifecycleStage updatedAt")
          .populate({ path: "batchId", select: "name" })
          .lean()
      : [],
    includeEvaluated
      ? Evaluation.find()
          .sort({ evaluatedAt: -1 })
          .limit(100)
          .populate({
            path: "candidateId",
            select: "registrationId fullName email phone batchId lifecycleStage",
            populate: { path: "batchId", select: "name" },
          })
          .lean()
      : [],
  ]);

  type PopulatedCandidate = {
    _id: { toString(): string };
    registrationId?: string | null;
    fullName: string;
    email: string;
    phone: string;
    batchId?: { name?: string } | null;
  };

  function isPopulatedCandidate(value: unknown): value is PopulatedCandidate {
    return (
      typeof value === "object" &&
      value !== null &&
      "fullName" in value &&
      typeof (value as PopulatedCandidate).fullName === "string"
    );
  }

  const evaluated = evaluations.flatMap((e) => {
    if (!isPopulatedCandidate(e.candidateId)) return [];
    const c = e.candidateId;
    const batchName =
      c.batchId && typeof c.batchId === "object" && "name" in c.batchId
        ? (c.batchId as { name: string }).name
        : null;
    return [
      {
        candidateId: c._id.toString(),
        registrationId: c.registrationId,
        fullName: c.fullName,
        email: c.email,
        phone: c.phone,
        batchName,
        evaluation: {
          id: e._id.toString(),
          communicationSkills: e.communicationSkills,
          confidenceLevel: e.confidenceLevel,
          productUnderstanding: e.productUnderstanding,
          salesPitch: e.salesPitch,
          objectionHandling: e.objectionHandling,
          finalScore: e.finalScore,
          remarks: e.remarks,
          evaluatorName: e.evaluatorName,
          evaluatedAt: e.evaluatedAt,
        },
      },
    ];
  }).filter((row) => {
    if (!search) return true;
    const term = search.toLowerCase();
    return (
      row.fullName.toLowerCase().includes(term) ||
      row.email.toLowerCase().includes(term) ||
      (row.registrationId ?? "").toLowerCase().includes(term)
    );
  });

  return apiOk({
    counts: { pending: pendingCount, evaluated: evaluatedCount, hiringEligible: hiringEligibleCount },
    pending: pending.map((c) => {
      const batchName =
        c.batchId && typeof c.batchId === "object" && "name" in c.batchId
          ? (c.batchId as { name: string }).name
          : null;
      return {
        ...mapPending(c),
        batchName,
      };
    }),
    evaluated,
  });
}

import { NextRequest } from "next/server";
import { connectDb } from "@/lib/db";
import { apiOk, requireAuth } from "@/lib/api";
import { BATCH_ASSIGNMENT_ELIGIBILITY_FILTER } from "@/lib/batch-eligibility";
import { Candidate } from "@/models/Candidate";

export async function GET(request: NextRequest) {
  const auth = await requireAuth(request, ["ADMIN", "HR", "TRAINER"]);
  if (auth.error) return auth.error;

  await connectDb();

  const search = request.nextUrl.searchParams.get("search")?.trim();
  const filter: Record<string, unknown> = { ...BATCH_ASSIGNMENT_ELIGIBILITY_FILTER };

  if (search) {
    filter.$or = [
      { fullName: { $regex: search, $options: "i" } },
      { email: { $regex: search, $options: "i" } },
      { phone: { $regex: search, $options: "i" } },
      { registrationId: { $regex: search, $options: "i" } },
    ];
  }

  const [items, total] = await Promise.all([
    Candidate.find(filter)
      .sort({ updatedAt: -1 })
      .limit(200)
      .select("registrationId fullName email phone verificationStage lifecycleStage updatedAt")
      .lean(),
    Candidate.countDocuments(filter),
  ]);

  return apiOk({
    total,
    items: items.map((c) => ({
      id: c._id.toString(),
      registrationId: c.registrationId,
      fullName: c.fullName,
      email: c.email,
      phone: c.phone,
      verificationStage: c.verificationStage,
      lifecycleStage: c.lifecycleStage,
      updatedAt: c.updatedAt,
    })),
  });
}

import { Types } from "mongoose";
import { NextRequest } from "next/server";
import { connectDb } from "@/lib/db";
import { apiError, apiOk, requireAuth } from "@/lib/api";
import { getCandidateProfile } from "@/lib/candidate-profile";
import { updateSalarySchema } from "@/lib/validators";
import { Candidate } from "@/models/Candidate";
import { CandidateTimeline } from "@/models/CandidateTimeline";

type Params = { params: Promise<{ id: string }> };

export async function GET(request: NextRequest, { params }: Params) {
  const auth = await requireAuth(request, ["ADMIN", "HR", "TRAINER"]);
  if (auth.error) return auth.error;

  const { id } = await params;
  const profile = await getCandidateProfile(id);
  if (!profile) return apiError("Candidate not found", 404);

  return apiOk(profile);
}

export async function PATCH(request: NextRequest, { params }: Params) {
  const auth = await requireAuth(request, ["ADMIN", "HR"]);
  if (auth.error || !auth.user) return auth.error;

  const { id } = await params;
  if (!Types.ObjectId.isValid(id)) return apiError("Invalid candidate id", 422);

  await connectDb();
  const body = await request.json();

  if (body.salarySlab !== undefined || body.proposedCtc !== undefined || body.finalCtc !== undefined) {
    const parsed = updateSalarySchema.safeParse(body);
    if (!parsed.success) {
      return apiError(parsed.error.issues[0]?.message ?? "Invalid salary data", 422);
    }
    await Candidate.updateOne({ _id: id }, { $set: parsed.data });
    await CandidateTimeline.create({
      candidateId: id,
      action: "SALARY_SLAB_UPDATED",
      actorRole: auth.user.role,
      actorName: auth.user.name,
      remarks: "Salary slab / CTC updated",
    });
    return apiOk({ updated: true });
  }

  return apiError("No valid fields to update", 422);
}

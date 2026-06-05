import { NextRequest } from "next/server";
import { Types } from "mongoose";
import { connectDb } from "@/lib/db";
import { apiError, apiOk, requireAuth } from "@/lib/api";
import { ensureEmployeeRecord } from "@/lib/transfer-to-employee";
import { Employee } from "@/models/Employee";
import { Candidate } from "@/models/Candidate";

export async function GET(request: NextRequest) {
  const auth = await requireAuth(request, ["ADMIN", "HR"]);
  if (auth.error) return auth.error;

  await connectDb();
  const items = await Employee.find({})
    .sort({ joinedAt: -1 })
    .limit(300)
    .select("candidateId employeeCode fullName email phone city joinedAt")
    .lean();

  return apiOk({
    items: items.map((item) => ({
      id: item._id.toString(),
      candidateId: item.candidateId ? String(item.candidateId) : "",
      employeeCode: item.employeeCode,
      fullName: item.fullName,
      email: item.email,
      phone: item.phone,
      city: item.city,
      joinedAt: item.joinedAt,
    })),
  });
}

export async function POST(request: NextRequest) {
  const auth = await requireAuth(request, ["ADMIN", "HR"]);
  if (auth.error || !auth.user) return auth.error;

  await connectDb();
  const body = (await request.json()) as { candidateId?: string };
  if (!body.candidateId || !Types.ObjectId.isValid(body.candidateId)) {
    return apiError("Valid candidateId is required", 422);
  }

  const candidate = await Candidate.findById(body.candidateId)
    .select("fullName email phone city lifecycleStage")
    .lean();
  if (!candidate) return apiError("Candidate not found", 404);
  if (candidate.lifecycleStage !== "EMPLOYEE") {
    return apiError("Candidate must be in Employee lifecycle stage before transfer", 422);
  }

  try {
    const result = await ensureEmployeeRecord(body.candidateId, {
      userId: auth.user.userId,
      name: auth.user.name,
      role: auth.user.role,
    });
    return apiOk(
      {
        id: result.employeeId,
        employeeCode: result.employeeCode,
        created: result.created,
      },
      result.created ? 201 : 200
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to transfer candidate";
    if (message.includes("already")) {
      return apiError("Employee record already created for candidate", 409);
    }
    return apiError(message, 409);
  }
}


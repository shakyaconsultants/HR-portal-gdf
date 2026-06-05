import { NextRequest } from "next/server";
import { connectDb } from "@/lib/db";
import { apiError, apiOk } from "@/lib/api";
import { COMPANY } from "@/lib/company";
import { Employee } from "@/models/Employee";
import { Candidate } from "@/models/Candidate";

export async function GET(request: NextRequest) {
  const code = request.nextUrl.searchParams.get("code")?.trim();
  if (!code) return apiError("Employee code is required.", 422);

  await connectDb();

  const employee = await Employee.findOne({
    $or: [{ employeeCode: code }, { employeeCode: code.toUpperCase() }],
  })
    .select("employeeCode fullName email phone joinedAt candidateId")
    .lean();

  if (!employee) {
    return apiError("Employee verification failed. ID not found.", 404);
  }

  const candidate = employee.candidateId
    ? await Candidate.findById(employee.candidateId)
        .select("designation department idCardGeneratedAt lifecycleStage")
        .lean()
    : null;

  return apiOk({
    verified: true,
    company: COMPANY.name,
    employee: {
      code: employee.employeeCode,
      fullName: employee.fullName,
      designation: candidate?.designation ?? "",
      department: candidate?.department ?? "",
      joinedAt: employee.joinedAt,
      idCardIssuedAt: candidate?.idCardGeneratedAt ?? null,
      status: candidate?.lifecycleStage ?? "EMPLOYEE",
    },
    message: "GDF employee identity verified successfully.",
  });
}

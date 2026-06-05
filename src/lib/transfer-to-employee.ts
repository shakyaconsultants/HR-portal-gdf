import "server-only";
import { Types } from "mongoose";
import { connectDb } from "@/lib/db";
import { Candidate } from "@/models/Candidate";
import { Employee } from "@/models/Employee";
import { CandidateTimeline } from "@/models/CandidateTimeline";

function buildEmployeeCode() {
  const stamp = Date.now().toString().slice(-6);
  const rand = Math.floor(100 + Math.random() * 900);
  return `EMP${stamp}${rand}`;
}

export async function ensureEmployeeRecord(
  candidateId: string,
  actor: { userId: string; name: string; role: string }
): Promise<{ employeeId: string; employeeCode: string; created: boolean }> {
  await connectDb();
  if (!Types.ObjectId.isValid(candidateId)) {
    throw new Error("Invalid candidate id");
  }

  const existing = await Employee.findOne({ candidateId }).lean();
  if (existing) {
    return {
      employeeId: existing._id.toString(),
      employeeCode: existing.employeeCode,
      created: false,
    };
  }

  const candidate = await Candidate.findById(candidateId)
    .select("fullName email phone city employeeId lifecycleStage")
    .lean();
  if (!candidate) throw new Error("Candidate not found");

  const employeeCode =
    candidate.employeeId && candidate.employeeId !== "N/A" && candidate.employeeId.trim()
      ? candidate.employeeId.trim().toUpperCase()
      : buildEmployeeCode();

  const employee = await Employee.create({
    candidateId,
    employeeCode,
    fullName: candidate.fullName,
    email: candidate.email,
    phone: candidate.phone,
    city: candidate.city ?? "",
    joinedAt: new Date(),
  });

  if (!candidate.employeeId || candidate.employeeId === "N/A") {
    await Candidate.updateOne({ _id: candidateId }, { $set: { employeeId: employeeCode } });
  }

  await CandidateTimeline.create({
    candidateId,
    action: "TRANSFERRED_TO_EMPLOYEE_RECORDS",
    actorRole: actor.role,
    actorName: actor.name,
    remarks: `Employee code ${employee.employeeCode}`,
  });

  return {
    employeeId: employee._id.toString(),
    employeeCode: employee.employeeCode,
    created: true,
  };
}

export async function promoteCandidateToEmployee(
  candidateId: string,
  actor: { userId: string; name: string; role: string }
) {
  await connectDb();
  await Candidate.updateOne({ _id: candidateId }, { $set: { lifecycleStage: "EMPLOYEE" } });
  const employee = await ensureEmployeeRecord(candidateId, actor);
  return employee;
}

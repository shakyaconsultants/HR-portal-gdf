import { Candidate } from "@/models/Candidate";

export async function generateRegistrationId() {
  const count = await Candidate.countDocuments({});
  const next = count + 1;
  return `GDF-${String(next).padStart(5, "0")}`;
}

import { Types } from "mongoose";
import { StaffNotification } from "@/models/StaffNotification";

export async function notifyHrNewRegistration(input: {
  candidateId: Types.ObjectId;
  registrationId: string;
  fullName: string;
  email: string;
}) {
  await StaffNotification.create({
    type: "NEW_REGISTRATION",
    title: "New candidate registration",
    message: `${input.fullName} (${input.email}) submitted an application. Registration ID: ${input.registrationId}`,
    candidateId: input.candidateId,
    registrationId: input.registrationId,
    audienceRoles: ["ADMIN", "HR"],
  });
}

import { NextRequest } from "next/server";
import { connectDb } from "@/lib/db";
import { apiError, apiOk } from "@/lib/api";
import { publicRegistrationSchema } from "@/lib/validators";
import { Candidate } from "@/models/Candidate";
import { Lead } from "@/models/Lead";
import { REGISTRATION_DOCUMENT_TYPES } from "@/lib/constants";
import { resolveRegistrationAccess } from "@/lib/registration-access";
import { convertLeadAndSubmitRegistration } from "@/lib/convert-lead";
import { submitRegistrationForCandidate } from "@/lib/registration-submit";

type Params = { params: Promise<{ token: string }> };

function accessStatus(reason: "invalid" | "expired" | "completed" | "unavailable") {
  if (reason === "expired") return 410;
  if (reason === "completed") return 409;
  if (reason === "invalid") return 404;
  return 403;
}

export async function GET(_request: NextRequest, { params }: Params) {
  const { token } = await params;
  const access = await resolveRegistrationAccess(token);
  if (!access.ok) return apiError(access.message, accessStatus(access.reason));

  return apiOk({
    fullName: access.prefill.fullName,
    email: access.prefill.email,
    phone: access.prefill.phone,
    expiresAt: access.expiresAtLabel ?? null,
  });
}

export async function POST(request: NextRequest, { params }: Params) {
  try {
    const { token } = await params;
    const access = await resolveRegistrationAccess(token);
    if (!access.ok) return apiError(access.message, accessStatus(access.reason));

    await connectDb();

    const formData = await request.formData();
    const payload = {
      fullName: String(formData.get("fullName") ?? ""),
      email: String(formData.get("email") ?? ""),
      phone: String(formData.get("phone") ?? ""),
      candidateType: String(formData.get("candidateType") ?? "FRESHER"),
      experienceYears: formData.get("experienceYears") ?? "0",
      previousOrganization: String(formData.get("previousOrganization") ?? ""),
      previousCtc: formData.get("previousCtc") ?? "",
      qualification: String(formData.get("qualification") ?? ""),
      dateOfBirth: String(formData.get("dateOfBirth") ?? ""),
    };

    const parsed = publicRegistrationSchema.safeParse(payload);
    if (!parsed.success) {
      return apiError(parsed.error.issues[0]?.message ?? "Invalid registration data", 422);
    }

    for (const docType of REGISTRATION_DOCUMENT_TYPES) {
      const file = formData.get(`file_${docType}`);
      if (!(file instanceof File) || file.size === 0) {
        return apiError(`Missing required document: ${docType}`, 422);
      }
    }

    const lead = await Lead.findOne({ registrationToken: token, convertedAt: null }).lean();
    if (lead) {
      if (parsed.data.email.toLowerCase() !== lead.email.toLowerCase()) {
        return apiError("Use the same email address that received the Letter of Intent.", 422);
      }

      const result = await convertLeadAndSubmitRegistration(lead, parsed.data, formData);
      return apiOk(
        {
          registrationId: result.registrationId,
          candidateId: result.candidateId,
          leadId: result.leadId,
          lifecycleStage: "REGISTRATION_SUBMITTED",
          message: "Registration completed successfully. You are now a candidate in our system.",
        },
        201
      );
    }

    const candidate = await Candidate.findOne({ registrationToken: token })
      .select("_id fullName email phone registrationSubmittedAt lifecycleStage")
      .lean();

    if (!candidate) {
      return apiError("This registration link is invalid or has already been used.", 404);
    }

    if (parsed.data.email.toLowerCase() !== candidate.email.toLowerCase()) {
      return apiError("Use the same email address that received the Letter of Intent.", 422);
    }

    const result = await submitRegistrationForCandidate(candidate, parsed.data, formData);

    return apiOk(
      {
        registrationId: result.registrationId,
        candidateId: result.candidateId,
        lifecycleStage: "REGISTRATION_SUBMITTED",
        message: "Registration completed successfully. HR will verify your documents.",
      },
      201
    );
  } catch (error) {
    console.error("Public registration error", error);
    return apiError("Unable to submit registration. Please try again.", 500);
  }
}

import { NextRequest } from "next/server";
import { storeUploadedFile } from "@/lib/file-storage";
import { connectDb } from "@/lib/db";
import { apiError, apiOk, requireAuth } from "@/lib/api";
import { createLeadSchema, leadListFilterSchema } from "@/lib/validators";
import { LEAD_STATUSES, REFERENCE_SOURCES } from "@/lib/constants";
import { formatLeadStatus, formatReferenceSource } from "@/lib/leads";
import { Lead } from "@/models/Lead";
import { LeadDocument } from "@/models/LeadDocument";
import { Candidate } from "@/models/Candidate";

function mapLeadRow(
  lead: {
    _id: { toString(): string };
    fullName: string;
    email: string;
    phone: string;
    leadStatus: string;
    referenceSource?: string | null;
    referenceName?: string | null;
    remarks?: string | null;
    candidateId?: { toString(): string } | null;
    convertedAt?: Date | null;
    createdAt?: Date;
    updatedAt?: Date;
  },
  resume?: { fileName: string; filePath: string } | null
) {
  return {
    id: lead._id.toString(),
    fullName: lead.fullName,
    email: lead.email,
    phone: lead.phone,
    leadStatus: lead.leadStatus,
    leadStatusLabel: formatLeadStatus(lead.leadStatus),
    referenceSource: lead.referenceSource,
    referenceSourceLabel: lead.referenceSource ? formatReferenceSource(lead.referenceSource) : "—",
    referenceName: lead.referenceName ?? "",
    remarks: lead.remarks ?? "",
    candidateId: lead.candidateId?.toString() ?? null,
    convertedAt: lead.convertedAt ?? null,
    resume,
    createdAt: lead.createdAt,
    updatedAt: lead.updatedAt,
  };
}

export async function GET(request: NextRequest) {
  const auth = await requireAuth(request, ["ADMIN", "HR"]);
  if (auth.error) return auth.error;

  await connectDb();
  const query = Object.fromEntries(request.nextUrl.searchParams.entries());
  const parsed = leadListFilterSchema.safeParse(query);
  if (!parsed.success) {
    return apiError(parsed.error.issues[0]?.message ?? "Invalid query", 422);
  }

  const { page, pageSize, leadStatus, referenceSource, search } = parsed.data;
  const filter: Record<string, unknown> = { convertedAt: null };

  if (leadStatus) filter.leadStatus = leadStatus;
  if (referenceSource) filter.referenceSource = referenceSource;
  if (search?.trim()) {
    const term = search.trim();
    filter.$or = [
      { fullName: { $regex: term, $options: "i" } },
      { email: { $regex: term, $options: "i" } },
      { phone: { $regex: term, $options: "i" } },
      { remarks: { $regex: term, $options: "i" } },
      { referenceName: { $regex: term, $options: "i" } },
    ];
  }

  const skip = (page - 1) * pageSize;
  const [items, total, statusCounts, sourceCounts] = await Promise.all([
    Lead.find(filter)
      .sort({ updatedAt: -1 })
      .skip(skip)
      .limit(pageSize)
      .select("fullName email phone leadStatus referenceSource referenceName remarks candidateId convertedAt createdAt updatedAt")
      .lean(),
    Lead.countDocuments(filter),
    Promise.all(
      LEAD_STATUSES.map(async (status) => ({
        status,
        count: await Lead.countDocuments({ convertedAt: null, leadStatus: status }),
      }))
    ),
    Promise.all(
      REFERENCE_SOURCES.map(async (source) => ({
        source,
        count: await Lead.countDocuments({ convertedAt: null, referenceSource: source }),
      }))
    ),
  ]);

  const leadIds = items.map((l) => l._id);
  const resumes =
    leadIds.length > 0
      ? await LeadDocument.find({ leadId: { $in: leadIds }, documentType: "RESUME" })
          .sort({ createdAt: -1 })
          .select("leadId fileName filePath")
          .lean()
      : [];

  const resumeByLead = new Map<string, { fileName: string; filePath: string }>();
  for (const doc of resumes) {
    const key = doc.leadId.toString();
    if (!resumeByLead.has(key)) {
      resumeByLead.set(key, { fileName: doc.fileName, filePath: doc.filePath });
    }
  }

  const totalLeads = await Lead.countDocuments({ convertedAt: null });

  return apiOk({
    items: items.map((l) => mapLeadRow(l, resumeByLead.get(l._id.toString()) ?? null)),
    total,
    page,
    pageSize,
    totalPages: Math.ceil(total / pageSize),
    counts: {
      total: totalLeads,
      byStatus: Object.fromEntries(statusCounts.map(({ status, count }) => [status, count])),
      bySource: Object.fromEntries(sourceCounts.map(({ source, count }) => [source, count])),
    },
  });
}

export async function POST(request: NextRequest) {
  const auth = await requireAuth(request, ["ADMIN", "HR"]);
  if (auth.error || !auth.user) return auth.error;

  await connectDb();

  const formData = await request.formData();
  const commentsRaw = String(formData.get("comments") ?? "").trim();
  const payload = {
    fullName: String(formData.get("fullName") ?? "").trim(),
    email: String(formData.get("email") ?? "").trim().toLowerCase(),
    phone: String(formData.get("phone") ?? "").trim().replace(/\s+/g, ""),
    referenceSource: String(formData.get("referenceSource") ?? "").trim(),
    referenceName: String(formData.get("referenceName") ?? "").trim() || undefined,
    comments: commentsRaw || undefined,
  };

  const parsed = createLeadSchema.safeParse(payload);
  if (!parsed.success) {
    return apiError(parsed.error.issues[0]?.message ?? "Invalid payload", 422);
  }

  const resumeFile = formData.get("resume");
  if (!(resumeFile instanceof File) || resumeFile.size === 0) {
    return apiError("Resume upload is required.", 422);
  }

  const email = parsed.data.email.toLowerCase();
  const [leadExists, candidateExists] = await Promise.all([
    Lead.exists({ email, convertedAt: null }),
    Candidate.exists({ email }),
  ]);
  if (leadExists || candidateExists) {
    return apiError("A lead or candidate with this email already exists.", 409);
  }

  const lead = await Lead.create({
    fullName: parsed.data.fullName,
    email,
    phone: parsed.data.phone,
    referenceSource: parsed.data.referenceSource,
    referenceName: parsed.data.referenceName ?? "",
    remarks: parsed.data.comments ?? "",
    leadStatus: "NEW_LEAD",
  });

  const leadId = lead._id.toString();
  const stored = await storeUploadedFile(resumeFile, `leads/${leadId}`, "RESUME");

  const resumeDoc = await LeadDocument.create({
    leadId: lead._id,
    documentType: "RESUME",
    fileName: resumeFile.name,
    filePath: stored.url,
    mimeType: stored.mimeType,
    fileSize: stored.size,
  });

  return apiOk(
    {
      id: leadId,
      fullName: lead.fullName,
      leadStatus: lead.leadStatus,
      resume: {
        fileName: resumeDoc.fileName,
        filePath: resumeDoc.filePath,
      },
    },
    201
  );
}

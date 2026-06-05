import { NextRequest } from "next/server";
import { connectDb } from "@/lib/db";
import { apiOk, requireAuth } from "@/lib/api";
import { Lead } from "@/models/Lead";
import { LetterOfIntent } from "@/models/LetterOfIntent";

type PopulatedLead = {
  _id: { toString(): string };
  fullName: string;
  email: string;
  phone: string;
};

function isPopulatedLead(value: unknown): value is PopulatedLead {
  return (
    typeof value === "object" &&
    value !== null &&
    "fullName" in value &&
    "email" in value &&
    "_id" in value
  );
}

export async function GET(request: NextRequest) {
  const auth = await requireAuth(request, ["ADMIN", "HR"]);
  if (auth.error) return auth.error;

  await connectDb();
  const tab = request.nextUrl.searchParams.get("tab") ?? "pending";
  const search = request.nextUrl.searchParams.get("search")?.trim();

  const searchFilter = search
    ? {
        $or: [
          { fullName: { $regex: search, $options: "i" } },
          { email: { $regex: search, $options: "i" } },
          { phone: { $regex: search, $options: "i" } },
        ],
      }
    : {};

  if (tab === "history") {
    const records = await LetterOfIntent.find()
      .sort({ sentAt: -1 })
      .limit(100)
      .populate({ path: "leadId", select: "fullName email phone leadStatus" })
      .lean();

    return apiOk({
      items: records.map((r) => {
        const l = isPopulatedLead(r.leadId) ? r.leadId : null;
        return {
          id: r._id.toString(),
          leadId: l ? l._id.toString() : String(r.leadId ?? r.candidateId),
          candidateId: l ? l._id.toString() : String(r.leadId ?? r.candidateId),
          candidateName: l?.fullName ?? "Unknown",
          candidateEmail: l?.email ?? r.sentToEmail,
          referenceNumber: r.referenceNumber,
          registrationLink: r.registrationLink,
          sentAt: r.sentAt,
          sentByName: r.sentByName,
          emailStatus: r.emailStatus,
        };
      }),
    });
  }

  const leadStatus = tab === "sent" ? "AWAITING_REGISTRATION" : "SELECTED";

  const leads = await Lead.find({
    convertedAt: null,
    leadStatus,
    ...searchFilter,
  })
    .sort({ updatedAt: -1 })
    .limit(100)
    .select("fullName email phone leadStatus updatedAt")
    .lean();

  const leadIds = leads.map((l) => l._id);
  const loiByLead = new Map<
    string,
    { sentAt: Date; sentByName: string; emailStatus: string; registrationLink: string }
  >();

  if (tab === "sent" && leadIds.length > 0) {
    const lois = await LetterOfIntent.find({ leadId: { $in: leadIds } })
      .sort({ sentAt: -1 })
      .lean();
    for (const loi of lois) {
      const key = loi.leadId?.toString() ?? "";
      if (key && !loiByLead.has(key)) {
        loiByLead.set(key, {
          sentAt: loi.sentAt,
          sentByName: loi.sentByName,
          emailStatus: loi.emailStatus,
          registrationLink: loi.registrationLink,
        });
      }
    }
  }

  const items = leads.map((l) => {
    const id = l._id.toString();
    const loi = loiByLead.get(id);
    return {
      id,
      leadId: id,
      fullName: l.fullName,
      email: l.email,
      phone: l.phone,
      leadStatus: l.leadStatus,
      updatedAt: l.updatedAt,
      loi: loi
        ? {
            sentAt: loi.sentAt,
            sentByName: loi.sentByName,
            emailStatus: loi.emailStatus,
            registrationLink: loi.registrationLink,
          }
        : null,
    };
  });

  const pendingCount = await Lead.countDocuments({ convertedAt: null, leadStatus: "SELECTED" });
  const sentCount = await Lead.countDocuments({ convertedAt: null, leadStatus: "AWAITING_REGISTRATION" });

  return apiOk({ items, counts: { pending: pendingCount, sent: sentCount } });
}

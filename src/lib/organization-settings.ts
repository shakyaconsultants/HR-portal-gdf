import "server-only";
import { connectDb } from "@/lib/db";
import { COMPANY } from "@/lib/company";
import { OrganizationSettings } from "@/models/OrganizationSettings";

export type OrganizationSettingsDto = {
  companyName: string;
  companyTagline: string;
  companyAddressLine1: string;
  companyAddressLine2: string;
  companyAddressLine3: string;
  companyAddressLine4: string;
  hrName: string;
  hrDesignation: string;
  hrEmail: string;
  hrPhone: string;
  companyLogoPath: string;
};

export const DEFAULT_ORGANIZATION_SETTINGS: OrganizationSettingsDto = {
  companyName: COMPANY.name,
  companyTagline: COMPANY.tagline,
  companyAddressLine1: COMPANY.address.line1,
  companyAddressLine2: COMPANY.address.line2,
  companyAddressLine3: COMPANY.address.line3,
  companyAddressLine4: COMPANY.address.line4,
  hrName: "Human Resources",
  hrDesignation: "HR Manager",
  hrEmail: "",
  hrPhone: "",
  companyLogoPath: COMPANY.logoPath,
};

export async function ensureOrganizationSettings() {
  await connectDb();
  const existing = await OrganizationSettings.findOne({ key: "default" }).lean();
  if (existing) return existing;

  return OrganizationSettings.create({ key: "default", ...DEFAULT_ORGANIZATION_SETTINGS });
}

export async function getOrganizationSettings() {
  await connectDb();
  const settings = await OrganizationSettings.findOne({ key: "default" }).lean();
  if (settings) return settings;
  return ensureOrganizationSettings();
}

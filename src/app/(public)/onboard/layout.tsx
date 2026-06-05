import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Onboarding Portal — GDF Training & Hiring Program",
  description: "Complete Joining Form and ID Card Form for employee onboarding.",
  robots: "noindex, nofollow",
};

export default function OnboardLayout({ children }: { children: React.ReactNode }) {
  return <div className="public-module">{children}</div>;
}

import type { Metadata } from "next";
import "./public-register.css";

export const metadata: Metadata = {
  title: "Apply — GDF Training & Hiring Program",
  description: "Submit your application and documents for the GDF training program.",
  robots: "index, follow",
};

export default function PublicLayout({ children }: { children: React.ReactNode }) {
  return <div className="public-module">{children}</div>;
}

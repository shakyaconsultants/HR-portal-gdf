import { ReactNode } from "react";
import { BadgeVariant } from "@/lib/status-ui";

export function Badge({ children, variant = "neutral" }: { children: ReactNode; variant?: BadgeVariant }) {
  return <span className={`badge badge-${variant}`}>{children}</span>;
}

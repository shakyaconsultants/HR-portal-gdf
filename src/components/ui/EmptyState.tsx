import { ReactNode } from "react";

const ICONS: Record<string, ReactNode> = {
  candidates: (
    <svg viewBox="0 0 48 48" fill="none" stroke="currentColor" strokeWidth="1.5" width="40" height="40">
      <circle cx="20" cy="16" r="7" />
      <path d="M6 40c0-7 6.3-12 14-12s14 5 14 12" />
      <path d="M34 20h10M39 15v10" />
    </svg>
  ),
  batches: (
    <svg viewBox="0 0 48 48" fill="none" stroke="currentColor" strokeWidth="1.5" width="40" height="40">
      <rect x="8" y="12" width="32" height="24" rx="3" />
      <path d="M8 20h32M16 28h8M16 32h12" />
    </svg>
  ),
  employees: (
    <svg viewBox="0 0 48 48" fill="none" stroke="currentColor" strokeWidth="1.5" width="40" height="40">
      <rect x="10" y="14" width="28" height="22" rx="2" />
      <path d="M18 14v-4a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v4" />
      <path d="M18 26h12M18 30h8" />
    </svg>
  ),
  reports: (
    <svg viewBox="0 0 48 48" fill="none" stroke="currentColor" strokeWidth="1.5" width="40" height="40">
      <path d="M10 38V14M22 38V22M34 38V10" />
      <path d="M8 38h32" />
    </svg>
  ),
  documents: (
    <svg viewBox="0 0 48 48" fill="none" stroke="currentColor" strokeWidth="1.5" width="40" height="40">
      <path d="M14 8h14l8 8v24a2 2 0 0 1-2 2H14a2 2 0 0 1-2-2V10a2 2 0 0 1 2-2z" />
      <path d="M28 8v8h8" />
    </svg>
  ),
  default: (
    <svg viewBox="0 0 48 48" fill="none" stroke="currentColor" strokeWidth="1.5" width="40" height="40">
      <circle cx="24" cy="24" r="14" />
      <path d="M24 18v6M24 30h.01" />
    </svg>
  ),
};

export function EmptyState({
  title,
  description,
  action,
  icon = "default",
}: {
  title: string;
  description: string;
  action?: ReactNode;
  icon?: keyof typeof ICONS;
}) {
  return (
    <div className="empty-state">
      <div className="empty-icon" aria-hidden>
        {ICONS[icon] ?? ICONS.default}
      </div>
      <h3>{title}</h3>
      <p>{description}</p>
      {action ? <div className="empty-action">{action}</div> : null}
    </div>
  );
}

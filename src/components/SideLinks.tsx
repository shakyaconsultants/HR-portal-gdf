"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useShell } from "@/components/shell/ShellContext";

type NavItem = {
  href: string;
  label: string;
  icon: React.ReactNode;
};

const icon = {
  dashboard: (
    <svg className="nav-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75">
      <rect x="3" y="3" width="7" height="7" rx="1.5" />
      <rect x="14" y="3" width="7" height="7" rx="1.5" />
      <rect x="3" y="14" width="7" height="7" rx="1.5" />
      <rect x="14" y="14" width="7" height="7" rx="1.5" />
    </svg>
  ),
  candidates: (
    <svg className="nav-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75">
      <circle cx="9" cy="8" r="3.5" />
      <path d="M2 20c0-3.5 3.1-6 7-6s7 2.5 7 6" />
      <path d="M16 11h6M19 8v6" />
    </svg>
  ),
  training: (
    <svg className="nav-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75">
      <path d="M4 19V5" />
      <path d="M4 19h16" />
      <path d="M8 15V9" />
      <path d="M12 15V7" />
      <path d="M16 15v-4" />
    </svg>
  ),
  employees: (
    <svg className="nav-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75">
      <rect x="3" y="7" width="18" height="13" rx="2" />
      <path d="M8 7V5a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
    </svg>
  ),
  settings: (
    <svg className="nav-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75">
      <circle cx="12" cy="12" r="3" />
      <path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" />
    </svg>
  ),
  add: (
    <svg className="nav-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75">
      <path d="M12 5v14M5 12h14" />
    </svg>
  ),
  batch: (
    <svg className="nav-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75">
      <path d="M4 7h16M4 12h16M4 17h10" />
    </svg>
  ),
  interview: (
    <svg className="nav-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75">
      <rect x="3" y="5" width="18" height="16" rx="2" />
      <path d="M8 3v4M16 3v4M3 10h18" />
    </svg>
  ),
  loi: (
    <svg className="nav-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75">
      <path d="M6 4h12v16H6z" />
      <path d="M9 8h6M9 12h6M9 16h4" />
    </svg>
  ),
};

const MAIN_NAV: NavItem[] = [
  { href: "/dashboard", label: "Dashboard", icon: icon.dashboard },
  { href: "/leads", label: "Leads", icon: icon.candidates },
  { href: "/interviews", label: "Interviews", icon: icon.interview },
  { href: "/letter-of-intent", label: "LOI Queue", icon: icon.loi },
  { href: "/candidates", label: "Candidates", icon: icon.employees },
  { href: "/training", label: "Training", icon: icon.training },
  { href: "/employees", label: "Employees", icon: icon.employees },
  { href: "/settings", label: "Settings", icon: icon.settings },
];

const QUICK_ACTIONS: NavItem[] = [
  { href: "/leads?add=1", label: "Lead", icon: icon.add },
  { href: "/training?create=1", label: "Batch", icon: icon.batch },
  { href: "/employees?transfer=1", label: "Employee", icon: icon.employees },
];

function isActive(pathname: string, href: string) {
  if (href === "/dashboard") return pathname === "/dashboard";
  const base = href.split("?")[0];
  return pathname === base || pathname.startsWith(`${base}/`);
}

export function SideLinks() {
  const pathname = usePathname();
  const { sidebarCollapsed, toggleSidebar } = useShell();

  return (
    <nav className="sidebar-nav">
      {sidebarCollapsed ? (
        <button
          type="button"
          className="sidebar-collapse-btn sidebar-expand-btn"
          onClick={toggleSidebar}
          aria-label="Expand sidebar"
          title="Expand sidebar"
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" width="18" height="18">
            <path d="M9 6l6 6-6 6M4 6v12" />
          </svg>
        </button>
      ) : null}
      {!sidebarCollapsed ? <p className="nav-group-label">Lead Management</p> : null}
      <div className="nav-main nav-sub">
        {MAIN_NAV.slice(1, 4).map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className={`nav-link ${isActive(pathname, item.href) ? "active" : ""}`}
            title={sidebarCollapsed ? item.label : undefined}
          >
            {item.icon}
            {!sidebarCollapsed ? <span className="nav-link-text">{item.label}</span> : null}
          </Link>
        ))}
      </div>

      <div className="nav-separator" />

      {!sidebarCollapsed ? <p className="nav-group-label">Workspace</p> : null}
      <div className="nav-main">
        <Link
          href="/dashboard"
          className={`nav-link ${isActive(pathname, "/dashboard") ? "active" : ""}`}
          title={sidebarCollapsed ? "Dashboard" : undefined}
        >
          {icon.dashboard}
          {!sidebarCollapsed ? <span className="nav-link-text">Dashboard</span> : null}
        </Link>
        {MAIN_NAV.slice(4).map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className={`nav-link ${isActive(pathname, item.href) ? "active" : ""}`}
            title={sidebarCollapsed ? item.label : undefined}
          >
            {item.icon}
            {!sidebarCollapsed ? <span className="nav-link-text">{item.label}</span> : null}
          </Link>
        ))}
      </div>

      <div className="nav-separator" />

      {!sidebarCollapsed ? <p className="nav-group-label">Quick Actions</p> : null}
      <div className="nav-quick">
        {QUICK_ACTIONS.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className="nav-link nav-link-quick"
            title={sidebarCollapsed ? item.label : undefined}
          >
            {item.icon}
            {!sidebarCollapsed ? <span className="nav-link-text">{item.label}</span> : null}
          </Link>
        ))}
      </div>

      <div className="sidebar-footer">
        <button type="button" className="sidebar-collapse-btn" onClick={toggleSidebar} aria-label="Toggle sidebar">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" width="18" height="18">
            {sidebarCollapsed ? (
              <path d="M9 6l6 6-6 6M4 6v12" />
            ) : (
              <path d="M15 6l-6 6 6 6M20 6v12" />
            )}
          </svg>
          {!sidebarCollapsed ? <span>Collapse</span> : <span className="sr-only">Expand</span>}
        </button>
      </div>
    </nav>
  );
}

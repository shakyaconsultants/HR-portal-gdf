"use client";

import { ReactNode, useEffect } from "react";
import { TopNav } from "@/components/TopNav";
import { SideLinks } from "@/components/SideLinks";
import { PageHeader } from "@/components/PageHeader";
import { ShellProvider, useShell, type Breadcrumb } from "@/components/shell/ShellContext";

function AppShellInner({
  title,
  subtitle,
  children,
  actions,
  compact,
  breadcrumbs,
}: {
  title: string;
  subtitle?: string;
  children: ReactNode;
  actions?: ReactNode;
  compact?: boolean;
  breadcrumbs?: Breadcrumb[];
}) {
  const { sidebarCollapsed, toggleSidebar, setBreadcrumbs } = useShell();

  useEffect(() => {
    if (breadcrumbs?.length) setBreadcrumbs(breadcrumbs);
    else setBreadcrumbs([{ label: title }]);
  }, [title, breadcrumbs, setBreadcrumbs]);

  return (
    <div className={`app-shell ${sidebarCollapsed ? "sidebar-is-collapsed" : ""}`}>
      <aside className={`sidebar ${sidebarCollapsed ? "sidebar-collapsed" : ""}`}>
        <div className="sidebar-logo">
          {sidebarCollapsed ? (
            <button
              type="button"
              className="sidebar-logo-mark sidebar-logo-expand"
              onClick={toggleSidebar}
              aria-label="Expand sidebar"
              title="Expand sidebar"
            >
              G
            </button>
          ) : (
            <div className="sidebar-logo-mark">G</div>
          )}
          {!sidebarCollapsed ? (
            <div className="sidebar-logo-text">
              <strong>GDF</strong>
              <span>HR Lifecycle CRM</span>
            </div>
          ) : null}
        </div>
        <SideLinks />
      </aside>
      <div className="main-column">
        <TopNav />
        <div className={`page-content ${compact ? "page-content-compact" : ""}`}>
          <PageHeader title={title} subtitle={subtitle} actions={actions} />
          {children}
        </div>
      </div>
    </div>
  );
}

export function AppShell({
  title,
  subtitle,
  children,
  actions,
  compact,
  breadcrumbs,
}: {
  title: string;
  subtitle?: string;
  children: ReactNode;
  actions?: ReactNode;
  compact?: boolean;
  breadcrumbs?: Breadcrumb[];
}) {
  return (
    <ShellProvider>
      <AppShellInner title={title} subtitle={subtitle} actions={actions} compact={compact} breadcrumbs={breadcrumbs}>
        {children}
      </AppShellInner>
    </ShellProvider>
  );
}

"use client";

import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from "react";

export type Breadcrumb = { label: string; href?: string };

type ShellContextValue = {
  sidebarCollapsed: boolean;
  toggleSidebar: () => void;
  breadcrumbs: Breadcrumb[];
  setBreadcrumbs: (crumbs: Breadcrumb[]) => void;
};

const ShellContext = createContext<ShellContextValue | null>(null);

export function ShellProvider({ children }: { children: ReactNode }) {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [breadcrumbs, setBreadcrumbs] = useState<Breadcrumb[]>([]);

  useEffect(() => {
    const stored = localStorage.getItem("gdf-sidebar-collapsed");
    if (stored === "1") setSidebarCollapsed(true);
  }, []);

  const toggleSidebar = useCallback(() => {
    setSidebarCollapsed((prev) => {
      const next = !prev;
      localStorage.setItem("gdf-sidebar-collapsed", next ? "1" : "0");
      return next;
    });
  }, []);

  return (
    <ShellContext.Provider value={{ sidebarCollapsed, toggleSidebar, breadcrumbs, setBreadcrumbs }}>
      {children}
    </ShellContext.Provider>
  );
}

export function useShell() {
  const ctx = useContext(ShellContext);
  if (!ctx) throw new Error("useShell must be used within ShellProvider");
  return ctx;
}

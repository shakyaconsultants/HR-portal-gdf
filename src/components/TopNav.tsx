"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useToast } from "@/components/ToastProvider";
import { useShell } from "@/components/shell/ShellContext";
import { useVisibleInterval } from "@/lib/use-visible-interval";

type SessionUser = {
  name: string;
  email: string;
  role: string;
};

type SearchHit = {
  id: string;
  fullName: string;
  email: string;
  kind: "lead" | "candidate";
  statusLabel: string;
};

export function TopNav() {
  const router = useRouter();
  const toast = useToast();
  const { breadcrumbs, sidebarCollapsed, toggleSidebar } = useShell();
  const [user, setUser] = useState<SessionUser | null>(null);
  const [unreadCount, setUnreadCount] = useState(0);
  const [search, setSearch] = useState("");
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchHits, setSearchHits] = useState<SearchHit[]>([]);
  const [createOpen, setCreateOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const searchRef = useRef<HTMLDivElement>(null);
  const createRef = useRef<HTMLDivElement>(null);
  const profileRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    void fetch("/api/auth/me", { cache: "no-store" })
      .then((r) => r.json())
      .then((j) => setUser(j.data?.user ?? null));
  }, []);

  const loadUnreadCount = useCallback(async () => {
    const res = await fetch("/api/notifications?unread=true&limit=1", { cache: "no-store" });
    if (!res.ok) return;
    const json = await res.json();
    if (json.ok) setUnreadCount(json.data?.unreadCount ?? 0);
  }, []);

  useVisibleInterval(
    () => void loadUnreadCount(),
    120_000,
    Boolean(user && (user.role === "HR" || user.role === "ADMIN"))
  );

  useEffect(() => {
    if (!search.trim()) {
      setSearchHits([]);
      return;
    }
    const term = encodeURIComponent(search.trim());
    const t = setTimeout(() => {
      void Promise.all([
        fetch(`/api/leads?page=1&pageSize=5&search=${term}`, { cache: "no-store" }).then((r) => r.json()),
        fetch(`/api/candidates?page=1&pageSize=5&search=${term}`, { cache: "no-store" }).then((r) => r.json()),
      ]).then(([leadsJson, candidatesJson]) => {
        const hits: SearchHit[] = [];
        if (leadsJson.ok) {
          for (const l of leadsJson.data?.items ?? []) {
            hits.push({
              id: String(l.id),
              fullName: String(l.fullName),
              email: String(l.email),
              kind: "lead",
              statusLabel: String(l.leadStatusLabel ?? l.leadStatus ?? "Lead"),
            });
          }
        }
        if (candidatesJson.ok) {
          for (const c of candidatesJson.data?.items ?? []) {
            hits.push({
              id: String(c.id),
              fullName: String(c.fullName),
              email: String(c.email),
              kind: "candidate",
              statusLabel: String(c.lifecycleStage ?? "Candidate"),
            });
          }
        }
        setSearchHits(hits.slice(0, 8));
      });
    }, 280);
    return () => clearTimeout(t);
  }, [search]);

  useEffect(() => {
    function onDocClick(e: MouseEvent) {
      if (searchRef.current && !searchRef.current.contains(e.target as Node)) setSearchOpen(false);
      if (createRef.current && !createRef.current.contains(e.target as Node)) setCreateOpen(false);
      if (profileRef.current && !profileRef.current.contains(e.target as Node)) setProfileOpen(false);
    }
    document.addEventListener("mousedown", onDocClick);
    return () => document.removeEventListener("mousedown", onDocClick);
  }, []);

  async function handleLogout() {
    await fetch("/api/auth/logout", { method: "POST" });
    toast.info("Signed out successfully.");
    router.push("/");
    router.refresh();
  }

  const initials =
    user?.name
      ?.split(" ")
      .map((part) => part[0])
      .join("")
      .slice(0, 2)
      .toUpperCase() ?? "?";

  return (
    <header className="app-header">
      <button
        type="button"
        className="topnav-sidebar-toggle"
        onClick={toggleSidebar}
        aria-label={sidebarCollapsed ? "Expand sidebar" : "Collapse sidebar"}
        title={sidebarCollapsed ? "Expand sidebar" : "Collapse sidebar"}
      >
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" width="18" height="18">
          <path d="M4 6h16M4 12h16M4 18h16" />
        </svg>
      </button>
      <div className="topnav-left">
        <div className={`topnav-search ${searchOpen ? "open" : ""}`} ref={searchRef}>
          <svg className="topnav-search-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75">
            <circle cx="11" cy="11" r="7" />
            <path d="M20 20l-3-3" />
          </svg>
          <input
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setSearchOpen(true);
            }}
            onFocus={() => setSearchOpen(true)}
            placeholder="Search leads, candidates, employees…"
            aria-label="Global search"
          />
          {searchOpen && search.trim() ? (
            <div className="topnav-search-dropdown">
              {searchHits.length === 0 ? (
                <p className="topnav-search-empty">No results</p>
              ) : (
                searchHits.map((hit) => (
                  <Link
                    key={`${hit.kind}-${hit.id}`}
                    href={hit.kind === "lead" ? `/leads/${hit.id}` : `/candidates/${hit.id}`}
                    className="topnav-search-hit"
                    onClick={() => {
                      setSearchOpen(false);
                      setSearch("");
                    }}
                  >
                    <strong>{hit.fullName}</strong>
                    <span>
                      {hit.kind === "lead" ? "Lead" : "Candidate"} · {hit.email}
                    </span>
                  </Link>
                ))
              )}
              <Link
                href={`/leads?search=${encodeURIComponent(search.trim())}`}
                className="topnav-search-more"
                onClick={() => setSearchOpen(false)}
              >
                Search leads →
              </Link>
              <Link
                href={`/candidates?search=${encodeURIComponent(search.trim())}`}
                className="topnav-search-more"
                onClick={() => setSearchOpen(false)}
              >
                Search candidates →
              </Link>
            </div>
          ) : null}
        </div>
      </div>

      <nav className="topnav-breadcrumbs" aria-label="Breadcrumb">
        {breadcrumbs.map((crumb, i) => (
          <span key={`${crumb.label}-${i}`} className="breadcrumb-item">
            {i > 0 ? <span className="breadcrumb-sep">/</span> : null}
            {crumb.href && i < breadcrumbs.length - 1 ? (
              <Link href={crumb.href}>{crumb.label}</Link>
            ) : (
              <span className="breadcrumb-current">{crumb.label}</span>
            )}
          </span>
        ))}
      </nav>

      <div className="topnav-right">
        {user && (user.role === "HR" || user.role === "ADMIN") ? (
          <Link href="/registrations" className="topnav-icon-btn" title="Notifications">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" width="18" height="18">
              <path d="M15 17h5l-1.4-1.4A2 2 0 0 1 18 14.2V11a6 6 0 1 0-12 0v3.2c0 .5-.2 1-.6 1.4L4 17h5" />
              <path d="M10 20a2 2 0 0 0 4 0" />
            </svg>
            {unreadCount > 0 ? <span className="topnav-badge">{unreadCount}</span> : null}
          </Link>
        ) : null}

        <div className="topnav-create" ref={createRef}>
          <button type="button" className="topnav-create-btn" onClick={() => setCreateOpen((v) => !v)}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="16" height="16">
              <path d="M12 5v14M5 12h14" />
            </svg>
            Create
          </button>
          {createOpen ? (
            <div className="topnav-dropdown">
              <Link href="/leads?add=1" onClick={() => setCreateOpen(false)}>
                + Lead
              </Link>
              <Link href="/training?create=1" onClick={() => setCreateOpen(false)}>
                + Batch
              </Link>
              <Link href="/employees?transfer=1" onClick={() => setCreateOpen(false)}>
                + Employee
              </Link>
            </div>
          ) : null}
        </div>

        {user ? (
          <div className="topnav-profile" ref={profileRef}>
            <button type="button" className="user-pill" onClick={() => setProfileOpen((v) => !v)}>
              <div className="user-avatar">{initials}</div>
              <div className="user-meta">
                <strong>{user.name}</strong>
                <span>{user.role}</span>
              </div>
            </button>
            {profileOpen ? (
              <div className="topnav-dropdown topnav-profile-menu">
                <div className="topnav-profile-info">
                  <strong>{user.name}</strong>
                  <span>{user.email}</span>
                </div>
                <Link href="/settings" onClick={() => setProfileOpen(false)}>
                  Settings
                </Link>
                <button type="button" className="topnav-signout" onClick={() => void handleLogout()}>
                  Sign out
                </button>
              </div>
            ) : null}
          </div>
        ) : null}
      </div>
    </header>
  );
}

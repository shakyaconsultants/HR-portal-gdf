"use client";

import Link from "next/link";
import { useState } from "react";

const TABS = [
  { id: "organization", label: "Organization" },
  { id: "branding", label: "Branding" },
  { id: "smtp", label: "SMTP" },
  { id: "templates", label: "Email Templates" },
  { id: "logs", label: "Communication Logs" },
] as const;

type TabId = (typeof TABS)[number]["id"];

export function SettingsClient() {
  const [tab, setTab] = useState<TabId>("organization");

  return (
    <div className="settings-app">
      <nav className="settings-tabs">
        {TABS.map((t) => (
          <button key={t.id} type="button" className={tab === t.id ? "active" : ""} onClick={() => setTab(t.id)}>
            {t.label}
          </button>
        ))}
      </nav>

      <div className="settings-panel glass-card">
        {tab === "organization" && (
          <div className="settings-tab-content">
            <h2 className="card-title">Organization</h2>
            <p className="muted">Company info, HR contact details, and legal entity settings.</p>
            <div className="settings-links">
              <Link href="/email/organization" className="settings-link-row">
                <span>Company & HR Info</span>
                <span className="text-link">Configure →</span>
              </Link>
            </div>
          </div>
        )}

        {tab === "branding" && (
          <div className="settings-tab-content">
            <h2 className="card-title">Branding</h2>
            <p className="muted">Logo preview, email branding, and theme settings for outbound communications.</p>
            <div className="settings-links">
              <Link href="/email/organization" className="settings-link-row">
                <span>Logo & Email Branding</span>
                <span className="text-link">Configure →</span>
              </Link>
            </div>
          </div>
        )}

        {tab === "smtp" && (
          <div className="settings-tab-content">
            <h2 className="card-title">SMTP Connection</h2>
            <p className="muted">Configure mail server credentials in your environment (.env.local).</p>
            <div className="settings-status-row">
              <span className="badge badge-info">Configured via env</span>
              <Link href="/email/organization" className="btn-secondary btn-sm">
                Test Email
              </Link>
            </div>
          </div>
        )}

        {tab === "templates" && (
          <div className="settings-tab-content">
            <h2 className="card-title">Email Templates</h2>
            <p className="muted">Interview, LOI, offer letter, joining, and onboarding templates.</p>
            <div className="data-table-wrap">
              <table className="data-table data-table-compact">
                <thead>
                  <tr>
                    <th>Template</th>
                    <th>Status</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td>All HR Templates</td>
                    <td><span className="badge badge-success">Active</span></td>
                    <td><Link href="/email" className="btn-ghost btn-sm">Edit</Link></td>
                  </tr>
                  <tr>
                    <td>Letter of Intent Queue</td>
                    <td><span className="badge badge-info">Queue</span></td>
                    <td><Link href="/letter-of-intent" className="btn-ghost btn-sm">Open</Link></td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        )}

        {tab === "logs" && (
          <div className="settings-tab-content">
            <h2 className="card-title">Communication Logs</h2>
            <p className="muted">Send offer letters, joining instructions, and view email history.</p>
            <Link href="/communications" className="btn-secondary btn-sm">
              View Communications
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}

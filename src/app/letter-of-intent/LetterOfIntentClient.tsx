"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { Badge } from "@/components/ui/Badge";
import { EmptyState } from "@/components/ui/EmptyState";
import { SendLoiModal } from "@/components/leads/SendLoiModal";
import { formatLeadStatus } from "@/lib/leads";
import { deliveryToVariant, formatStatusLabel } from "@/lib/status-ui";

type PendingRow = {
  id: string;
  leadId?: string;
  fullName: string;
  email: string;
  phone: string;
  leadStatus: string;
  updatedAt: string;
};

type SentRow = PendingRow & {
  loi: {
    sentAt: string;
    sentByName: string;
    emailStatus: string;
    registrationLink: string;
  } | null;
};

type HistoryRow = {
  id: string;
  candidateId: string;
  candidateName: string;
  candidateEmail: string;
  referenceNumber: string;
  registrationLink: string;
  sentAt: string;
  sentByName: string;
  emailStatus: string;
};

const TABS = [
  { key: "pending", label: "Pending LOI" },
  { key: "sent", label: "Registration Pending" },
  { key: "history", label: "LOI History" },
] as const;

export function LetterOfIntentClient() {
  const searchParams = useSearchParams();
  const initialTab = TABS.some((t) => t.key === searchParams.get("tab"))
    ? (searchParams.get("tab") as (typeof TABS)[number]["key"])
    : "pending";

  const [tab, setTab] = useState<(typeof TABS)[number]["key"]>(initialTab);
  const [pending, setPending] = useState<PendingRow[]>([]);
  const [sent, setSent] = useState<SentRow[]>([]);
  const [history, setHistory] = useState<HistoryRow[]>([]);
  const [counts, setCounts] = useState<{ pending: number; sent: number } | null>(null);
  const [loading, setLoading] = useState(true);
  const [loiOpen, setLoiOpen] = useState(false);
  const [loiLead, setLoiLead] = useState<PendingRow | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    const res = await fetch(`/api/letter-of-intent/queue?tab=${tab}`, { cache: "no-store" });
    const json = await res.json();
    if (res.ok && json.ok) {
      if (tab === "history") {
        setHistory(json.data?.items ?? []);
      } else if (tab === "sent") {
        setSent(json.data?.items ?? []);
        setCounts(json.data?.counts ?? null);
      } else {
        setPending(json.data?.items ?? []);
        setCounts(json.data?.counts ?? null);
      }
    }
    setLoading(false);
  }, [tab]);

  useEffect(() => {
    void load();
  }, [load]);

  function openSendLoi(row: PendingRow) {
    setLoiLead(row);
    setLoiOpen(true);
  }

  const tabDescription =
    tab === "pending"
      ? "Only leads marked Selected in Interviews appear here."
      : tab === "sent"
        ? "LOI delivered — leads must complete registration using their unique link."
        : "Permanent record of every LOI sent.";

  return (
    <div className="data-hub">
      <div className="hub-panel">
        <div className="hub-toolbar hub-toolbar-split">
          <div className="filter-chips filter-chips-inline" role="tablist">
            {TABS.map((t) => (
              <button
                key={t.key}
                type="button"
                role="tab"
                className={`filter-chip ${tab === t.key ? "active" : ""}`}
                onClick={() => setTab(t.key)}
              >
                {t.label}
                {t.key === "pending" && counts?.pending != null ? (
                  <span className="filter-chip-count">{counts.pending}</span>
                ) : null}
                {t.key === "sent" && counts?.sent != null ? (
                  <span className="filter-chip-count">{counts.sent}</span>
                ) : null}
              </button>
            ))}
          </div>
          <div className="hub-actions">
            <button type="button" className="btn-secondary btn-sm" onClick={() => void load()}>
              Refresh
            </button>
          </div>
        </div>
        <p className="hub-hint muted">{tabDescription}</p>
      </div>

      {loading ? (
        <div className="hub-loading">
          <div className="loading-line" />
        </div>
      ) : tab === "pending" && pending.length === 0 ? (
        <div className="hub-panel hub-empty-panel">
          <EmptyState
            title="No leads pending LOI"
            description="Leads appear here after being marked Selected in Interviews."
          />
        </div>
      ) : tab === "sent" && sent.length === 0 ? (
        <div className="hub-panel hub-empty-panel">
          <EmptyState title="No leads awaiting registration" description="Send LOI from the Pending tab first." />
        </div>
      ) : tab === "history" && history.length === 0 ? (
        <div className="hub-panel hub-empty-panel">
          <EmptyState title="No LOI history yet" description="Sent letters of intent will appear here." />
        </div>
      ) : (
        <div className="hub-panel hub-table-panel">
          <div className="data-table-wrap enterprise-table">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Lead</th>
                  {tab === "history" ? (
                    <>
                      <th>Reference</th>
                      <th>Sent date</th>
                      <th>Sent by</th>
                      <th>Email status</th>
                      <th>Registration</th>
                    </>
                  ) : tab === "sent" ? (
                    <>
                      <th>Sent date</th>
                      <th>Sent by</th>
                      <th>Email status</th>
                      <th>Status</th>
                    </>
                  ) : (
                    <>
                      <th>Phone</th>
                      <th>Stage</th>
                      <th></th>
                    </>
                  )}
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {tab === "pending" &&
                  pending.map((row) => (
                    <tr key={row.id}>
                      <td>
                        <div className="cell-name">{row.fullName}</div>
                        <div className="cell-muted">{row.email}</div>
                      </td>
                      <td>{row.phone}</td>
                      <td>
                        <Badge variant="info">{formatLeadStatus(row.leadStatus)}</Badge>
                      </td>
                      <td className="cell-actions">
                        <div className="action-group">
                          <button type="button" className="btn-sm" onClick={() => openSendLoi(row)}>
                            Send LOI
                          </button>
                          <Link href={`/leads/${row.id}`} className="btn-ghost btn-sm">
                            View
                          </Link>
                        </div>
                      </td>
                    </tr>
                  ))}

                {tab === "sent" &&
                  sent.map((row) => (
                    <tr key={row.id}>
                      <td>
                        <div className="cell-name">{row.fullName}</div>
                        <div className="cell-muted">{row.email}</div>
                      </td>
                      <td className="cell-muted">
                        {row.loi?.sentAt ? new Date(row.loi.sentAt).toLocaleString() : "—"}
                      </td>
                      <td>{row.loi?.sentByName ?? "—"}</td>
                      <td>
                        {row.loi?.emailStatus ? (
                          <Badge variant={deliveryToVariant(row.loi.emailStatus)}>
                            {formatStatusLabel(row.loi.emailStatus)}
                          </Badge>
                        ) : (
                          "—"
                        )}
                      </td>
                      <td>
                        <Badge variant="info">Awaiting Registration</Badge>
                      </td>
                      <td className="cell-actions">
                        <div className="action-group">
                          <Link href={`/leads/${row.id}`} className="btn-ghost btn-sm">
                            View
                          </Link>
                        </div>
                      </td>
                    </tr>
                  ))}

                {tab === "history" &&
                  history.map((row) => (
                    <tr key={row.id}>
                      <td>
                        <div className="cell-name">{row.candidateName}</div>
                        <div className="cell-muted">{row.candidateEmail}</div>
                      </td>
                      <td>{row.referenceNumber}</td>
                      <td className="cell-muted">{new Date(row.sentAt).toLocaleString()}</td>
                      <td>{row.sentByName}</td>
                      <td>
                        <Badge variant={deliveryToVariant(row.emailStatus)}>
                          {formatStatusLabel(row.emailStatus)}
                        </Badge>
                      </td>
                      <td className="cell-muted">Link sent via email</td>
                      <td className="cell-actions">
                        <div className="action-group">
                          <Link href={`/leads/${row.candidateId}`} className="btn-ghost btn-sm">
                            View
                          </Link>
                        </div>
                      </td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {loiLead ? (
        <SendLoiModal
          open={loiOpen}
          onClose={() => {
            setLoiOpen(false);
            setLoiLead(null);
          }}
          leadId={loiLead.id}
          leadName={loiLead.fullName}
          leadEmail={loiLead.email}
          onSent={() => void load()}
        />
      ) : null}
    </div>
  );
}

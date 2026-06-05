"use client";

import Link from "next/link";
import { useCallback, useState } from "react";
import { useVisibleInterval } from "@/lib/use-visible-interval";

type NotificationItem = {
  id: string;
  title: string;
  message: string;
  candidateId: string;
  registrationId: string;
  read: boolean;
  createdAt: string;
};

export function HrNotificationPanel({ compact = false }: { compact?: boolean }) {
  const [items, setItems] = useState<NotificationItem[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    const res = await fetch("/api/notifications?limit=10", { cache: "no-store" });
    const json = await res.json();
    if (res.ok && json.ok) {
      setItems(json.data?.items ?? []);
      setUnreadCount(json.data?.unreadCount ?? 0);
    }
    setLoading(false);
  }, []);

  useVisibleInterval(() => void load(), 120_000);

  async function markAllRead() {
    await fetch("/api/notifications", {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ all: true }),
    });
    await load();
  }

  if (loading) {
    return <div className="loading-line" />;
  }

  if (compact) {
    return (
      <Link href="/registrations" className="hr-notify-compact">
        {unreadCount > 0 ? (
          <>
            <span className="hr-notify-badge">{unreadCount}</span>
            <span>New registration{unreadCount === 1 ? "" : "s"}</span>
          </>
        ) : (
          <span className="muted">No new registrations</span>
        )}
      </Link>
    );
  }

  return (
    <section className="hr-notify-panel">
      <div className="hr-notify-header">
        <h3>
          HR notifications
          {unreadCount > 0 ? <span className="hr-notify-badge">{unreadCount}</span> : null}
        </h3>
        {unreadCount > 0 ? (
          <button type="button" className="btn-secondary btn-sm" onClick={() => void markAllRead()}>
            Mark all read
          </button>
        ) : null}
      </div>

      {items.length === 0 ? (
        <p className="muted">No registration notifications yet.</p>
      ) : (
        <ul className="hr-notify-list">
          {items.map((item) => (
            <li key={item.id} className={item.read ? "" : "unread"}>
              <Link href={`/candidates/${item.candidateId}`}>
                <strong>{item.title}</strong>
                <span>{item.message}</span>
                <time>{new Date(item.createdAt).toLocaleString()}</time>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

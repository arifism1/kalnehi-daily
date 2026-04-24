"use client";

import clsx from "clsx";
import { format } from "date-fns";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

import { NotificationsEmptyIllustration } from "@/components/illustrations/NotificationsEmptyIllustration";

import {
  clearAllUserNotifications,
  ensureAutomatedNotifications,
  listUserNotifications,
  type UserNotification,
} from "@/actions/notifications";
import { groupUserNotificationsByLocalDay } from "@/lib/notificationDateGroups";
import {
  countFeaturesById,
  getFeatureTagPill,
  NOTIFICATION_FILTER_CHIPS,
  type NotificationFilterId,
} from "@/lib/notificationFeatureTags";
import { surfaceErrorForUi, toUserFacingMessage } from "@/lib/userFacingErrors";
import { useAuthStore } from "@/store/useAuthStore";

export default function NotificationsPage() {
  const userId = useAuthStore((s) => s.user?.id);
  const [notifications, setNotifications] = useState<UserNotification[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [clearing, setClearing] = useState(false);
  const [clearError, setClearError] = useState<string | null>(null);
  const [filter, setFilter] = useState<NotificationFilterId>("all");

  useEffect(() => {
    if (!userId) {
      setNotifications([]);
      setLoading(false);
      return;
    }
    let cancelled = false;
    setLoading(true);
    setError(null);
    void (async () => {
      try {
        let ensured = await ensureAutomatedNotifications();
        if (!ensured.ok) {
          // One quick retry helps when session/bootstrap races on initial page load.
          ensured = await ensureAutomatedNotifications();
        }
        if (!ensured.ok && !cancelled) setError(surfaceErrorForUi(ensured.error));

        const res = await listUserNotifications();
        if (cancelled) return;
        if (!res.ok) {
          setError(surfaceErrorForUi(res.error));
          setNotifications([]);
          return;
        }
        setNotifications(res.notifications);
      } catch (e) {
        if (cancelled) return;
        console.warn("[NotificationsPage] load failed", e);
        setError(toUserFacingMessage(e));
        setNotifications([]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [userId]);

  if (!userId) {
    return (
      <section className="kal-glass-panel mx-auto w-full max-w-2xl rounded-[1.25rem] p-6 text-center sm:p-8">
        <p className="text-lg font-semibold text-kal-text">Sign in required</p>
        <p className="mt-2 text-sm text-kal-muted">
          Please sign in to view your notifications.
        </p>
        <Link
          href="/auth"
          className="kal-btn-accent mt-5 min-h-[44px]"
        >
          Go to sign in
        </Link>
      </section>
    );
  }

  const featureCounts = useMemo(() => countFeaturesById(notifications), [notifications]);

  const visibleFilterChips = useMemo(
    () =>
      NOTIFICATION_FILTER_CHIPS.filter((c) => {
        if (c.id !== "general") return true;
        return (featureCounts.general ?? 0) > 0;
      }),
    [featureCounts],
  );

  const filtered = useMemo(() => {
    if (filter === "all") return notifications;
    return notifications.filter((n) => n.feature === filter);
  }, [notifications, filter]);

  const dayGroups = useMemo(() => {
    const sorted = [...filtered].sort(
      (a, b) =>
        new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
    );
    return groupUserNotificationsByLocalDay(sorted);
  }, [filtered]);

  useEffect(() => {
    if (filter === "general" && (featureCounts.general ?? 0) === 0) {
      setFilter("all");
    }
  }, [filter, featureCounts.general]);

  async function handleClearAll() {
    if (clearing) return;
    setClearing(true);
    setClearError(null);
    const res = await clearAllUserNotifications();
    setClearing(false);
    if (!res.ok) {
      setClearError(surfaceErrorForUi(res.error));
      return;
    }
    setNotifications([]);
  }

  return (
    <div className="mx-auto w-full max-w-2xl space-y-6">
      <header className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between sm:gap-4">
        <div className="min-w-0">
          <p className="text-[0.65rem] font-semibold uppercase tracking-widest text-kal-accent">
            Alerts
          </p>
          <h1 className="kal-feature-title mt-1">Notifications</h1>
          <p className="mt-2 text-sm text-kal-muted">
            Daily reminders, deadlines, and important updates appear here.
          </p>
        </div>
        {!loading && notifications.length > 0 ? (
          <div className="flex shrink-0 flex-col items-stretch sm:items-end">
            <button
              type="button"
              onClick={() => {
                void handleClearAll();
              }}
              disabled={clearing}
              aria-busy={clearing}
              className="kal-btn-ghost min-h-[44px] rounded-xl px-4 py-2.5 text-sm font-semibold disabled:opacity-50"
            >
              {clearing ? "Clearing…" : "Clear all"}
            </button>
            {clearError ? (
              <p className="mt-1 max-w-[min(100%,20rem)] text-right text-xs text-[var(--kal-warn-text)]">
                {clearError}
              </p>
            ) : null}
          </div>
        ) : null}
      </header>

      {!loading ? (
        <div
          className="flex flex-wrap items-center gap-2"
          role="group"
          aria-label="Filter notifications by feature"
        >
          {visibleFilterChips.map((chip) => {
            const active = chip.id === filter;
            const count =
              chip.id === "all"
                ? notifications.length
                : chip.id === "general"
                  ? featureCounts.general
                  : (featureCounts[chip.id] ?? 0);
            return (
              <button
                key={chip.id}
                type="button"
                onClick={() => {
                  setFilter(chip.id);
                }}
                className={clsx(
                  "inline-flex min-h-[40px] items-center gap-1.5 rounded-full border px-3.5 py-1.5 text-xs font-semibold transition-colors",
                  active
                    ? "border-kal-accent bg-kal-accent/15 text-kal-text"
                    : "border-kal-border/80 bg-kal-card-muted/40 text-kal-text-secondary hover:border-kal-accent/50 hover:text-kal-text",
                )}
                aria-pressed={active}
                aria-label={
                  chip.id === "all"
                    ? `All features, ${count} notifications`
                    : `Filter: ${chip.label}, ${count} ${count === 1 ? "notification" : "notifications"}`
                }
              >
                {chip.label}
                <span
                  className="tabular-nums text-[10px] font-bold text-kal-text-secondary opacity-80"
                  aria-hidden
                >
                  {count}
                </span>
              </button>
            );
          })}
        </div>
      ) : null}

      {error ? (
        <section className="rounded-[1.25rem] border border-[var(--kal-warn-border)] bg-[var(--kal-warn-soft)] p-5 text-sm text-[var(--kal-warn-text)]">
          Could not load notifications: {error}
        </section>
      ) : null}

      {loading ? (
        <section className="kal-glass-panel rounded-[1.25rem] p-6 text-center sm:p-8">
          <p className="text-sm text-kal-muted">Loading notifications...</p>
        </section>
      ) : notifications.length === 0 ? (
        <section className="kal-glass-panel rounded-[1.25rem] p-6 text-center sm:p-8">
          <NotificationsEmptyIllustration className="mx-auto h-32 w-32" />
          <p className="mt-4 text-lg font-semibold text-kal-text">
            You&apos;re all caught up
          </p>
          <p className="mt-2 text-sm text-kal-muted">
            No new notifications. Check back after your next study session.
          </p>
        </section>
      ) : filtered.length === 0 ? (
        <section className="kal-glass-panel rounded-[1.25rem] p-6 text-center sm:p-8">
          <p className="text-sm font-semibold text-kal-text">Nothing in this category</p>
          <p className="mt-2 text-sm text-kal-muted">
            Try a different feature tag, or choose All to see every notification.
          </p>
          <button
            type="button"
            onClick={() => {
              setFilter("all");
            }}
            className="kal-btn-accent mt-4 min-h-[44px] px-5"
          >
            Show all
          </button>
        </section>
      ) : (
        <div className="kal-glass-panel rounded-[1.25rem] p-2 sm:p-3">
          <div className="space-y-1">
            {dayGroups.map((group, groupIndex) => (
              <section
                key={group.dayKey}
                aria-labelledby={`notif-day-${group.dayKey}`}
                className={
                  groupIndex > 0
                    ? "mt-1 border-t border-kal-border/80 pt-1"
                    : undefined
                }
              >
                <h2
                  className="px-4 pb-2 pt-2 text-sm font-semibold text-kal-text"
                  id={`notif-day-${group.dayKey}`}
                >
                  {group.label}
                </h2>
                <ul
                  aria-label={`${group.label} notifications`}
                  className="divide-y divide-kal-border"
                >
                  {group.items.map((item) => {
                    const featurePill = getFeatureTagPill(item.feature);
                    return (
                      <li key={item.id} className="px-4 py-3">
                        <div className="flex items-start justify-between gap-2">
                          <p className="min-w-0 flex-1 text-sm font-semibold text-kal-text">
                            {item.title}
                          </p>
                          <span
                            className={featurePill.className}
                            title={featurePill.label}
                          >
                            {featurePill.label}
                          </span>
                        </div>
                        <p className="mt-0.5 text-sm text-kal-muted">{item.message}</p>
                        <p className="mt-1 text-[11px] text-kal-text-secondary">
                          {format(new Date(item.created_at), "h:mm a")}
                        </p>
                      </li>
                    );
                  })}
                </ul>
              </section>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

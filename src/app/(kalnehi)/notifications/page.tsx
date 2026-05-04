"use client";

import clsx from "clsx";
import { format, isToday, isYesterday } from "date-fns";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

import { NotificationsEmptyIllustration } from "@/components/illustrations/NotificationsEmptyIllustration";

import {
  clearAllUserNotifications,
  ensureAutomatedNotifications,
  listAppUpdates,
  listUserNotifications,
  markAllAppUpdatesRead,
  markAllGeneralNotificationsRead,
  type AppUpdate,
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

type Segment = "general" | "updates";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const CATEGORY_PILL: Record<string, string> = {
  "New Feature":
    "inline-flex shrink-0 items-center rounded-full border border-violet-200/90 bg-violet-50/90 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide leading-none text-violet-900/90 dark:border-violet-500/30 dark:bg-violet-950/50 dark:text-violet-200",
  Improvement:
    "inline-flex shrink-0 items-center rounded-full border border-sky-200/90 bg-sky-50/90 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide leading-none text-sky-900/90 dark:border-sky-500/30 dark:bg-sky-950/50 dark:text-sky-200",
  "Bug Fix":
    "inline-flex shrink-0 items-center rounded-full border border-rose-200/90 bg-rose-50/90 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide leading-none text-rose-900/90 dark:border-rose-500/30 dark:bg-rose-950/50 dark:text-rose-200",
  Announcement:
    "inline-flex shrink-0 items-center rounded-full border border-amber-200/90 bg-amber-50/90 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide leading-none text-amber-900/90 dark:border-amber-500/30 dark:bg-amber-950/50 dark:text-amber-100",
};

function categoryPillClass(cat: string) {
  return (
    CATEGORY_PILL[cat] ??
    "inline-flex shrink-0 items-center rounded-full border border-kal-border/80 bg-kal-card-muted/80 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide leading-none text-kal-text-secondary"
  );
}

function daySectionLabel(d: Date): string {
  if (isToday(d)) return "Today";
  if (isYesterday(d)) return "Yesterday";
  return format(d, "MMMM d, yyyy");
}

function groupByDay<T extends { created_at: string }>(
  items: T[],
): { dayKey: string; label: string; items: T[] }[] {
  const groups: { dayKey: string; label: string; items: T[] }[] = [];
  for (const item of items) {
    const d = new Date(item.created_at);
    const dayKey = format(d, "yyyy-MM-dd");
    const last = groups[groups.length - 1];
    if (last?.dayKey === dayKey) {
      last.items.push(item);
    } else {
      groups.push({ dayKey, label: daySectionLabel(d), items: [item] });
    }
  }
  return groups;
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default function NotificationsPage() {
  const userId = useAuthStore((s) => s.user?.id);

  // --- General tab state ---
  const [notifications, setNotifications] = useState<UserNotification[]>([]);
  const [loadingGeneral, setLoadingGeneral] = useState(true);
  const [generalError, setGeneralError] = useState<string | null>(null);
  const [clearing, setClearing] = useState(false);
  const [clearError, setClearError] = useState<string | null>(null);
  const [markingRead, setMarkingRead] = useState(false);
  const [filter, setFilter] = useState<NotificationFilterId>("all");

  // --- Updates tab state ---
  const [updates, setUpdates] = useState<AppUpdate[]>([]);
  const [loadingUpdates, setLoadingUpdates] = useState(false);
  const [updatesError, setUpdatesError] = useState<string | null>(null);
  const [updatesLoaded, setUpdatesLoaded] = useState(false);
  const [markingUpdatesRead, setMarkingUpdatesRead] = useState(false);

  // --- Active segment ---
  const [segment, setSegment] = useState<Segment>("general");

  // Load list first; do not block paint on ensureAutomatedNotifications (task scans + inserts).
  // After ensure completes, refetch once so today’s auto-inserted rows appear without a full reload.
  useEffect(() => {
    if (!userId) {
      setNotifications([]);
      setLoadingGeneral(false);
      return;
    }
    let cancelled = false;
    setLoadingGeneral(true);
    setGeneralError(null);
    void (async () => {
      try {
        const ensureP = ensureAutomatedNotifications();

        const listRes = await listUserNotifications();
        if (cancelled) return;
        if (!listRes.ok) {
          setGeneralError(surfaceErrorForUi(listRes.error));
          setNotifications([]);
          setLoadingGeneral(false);
          void ensureP.catch(() => {});
          return;
        }
        setNotifications(listRes.notifications);
        setLoadingGeneral(false);

        const ensureRes = await ensureP;
        if (cancelled) return;
        if (!ensureRes.ok) {
          console.warn("[notifications] ensureAutomatedNotifications failed", ensureRes.error);
        } else {
          const refreshRes = await listUserNotifications();
          if (cancelled || !refreshRes.ok) return;
          setNotifications(refreshRes.notifications);
        }
      } catch (e) {
        if (cancelled) return;
        setGeneralError(toUserFacingMessage(e));
        setNotifications([]);
        setLoadingGeneral(false);
      }
    })();
    return () => { cancelled = true; };
  }, [userId]);

  // Lazy-load updates when the tab is first activated
  useEffect(() => {
    if (segment !== "updates" || updatesLoaded || !userId) return;
    let cancelled = false;
    setLoadingUpdates(true);
    setUpdatesError(null);
    void (async () => {
      try {
        const res = await listAppUpdates();
        if (cancelled) return;
        if (!res.ok) { setUpdatesError(surfaceErrorForUi(res.error)); return; }
        setUpdates(res.updates);
        setUpdatesLoaded(true);
      } catch (e) {
        if (cancelled) return;
        setUpdatesError(toUserFacingMessage(e));
      } finally {
        if (!cancelled) setLoadingUpdates(false);
      }
    })();
    return () => { cancelled = true; };
  }, [segment, updatesLoaded, userId]);

  // ---------------------------------------------------------------------------
  // Derived state
  // ---------------------------------------------------------------------------

  const generalUnread = useMemo(
    () => notifications.filter((n) => !n.read).length,
    [notifications],
  );

  const updatesUnread = useMemo(
    () => updates.filter((u) => !u.read).length,
    [updates],
  );

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

  const generalDayGroups = useMemo(() => {
    const sorted = [...filtered].sort(
      (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
    );
    return groupUserNotificationsByLocalDay(sorted);
  }, [filtered]);

  const updatesDayGroups = useMemo(() => {
    const sorted = [...updates].sort(
      (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
    );
    return groupByDay(sorted);
  }, [updates]);

  useEffect(() => {
    if (filter === "general" && (featureCounts.general ?? 0) === 0) setFilter("all");
  }, [filter, featureCounts.general]);

  // ---------------------------------------------------------------------------
  // Handlers
  // ---------------------------------------------------------------------------

  async function handleClearAll() {
    if (clearing) return;
    setClearing(true);
    setClearError(null);
    const res = await clearAllUserNotifications();
    setClearing(false);
    if (!res.ok) { setClearError(surfaceErrorForUi(res.error)); return; }
    setNotifications([]);
  }

  async function handleMarkGeneralRead() {
    if (markingRead || generalUnread === 0) return;
    setMarkingRead(true);
    const res = await markAllGeneralNotificationsRead();
    setMarkingRead(false);
    if (!res.ok) return;
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
  }

  async function handleMarkUpdatesRead() {
    if (markingUpdatesRead || updatesUnread === 0) return;
    const unreadIds = updates.filter((u) => !u.read).map((u) => u.id);
    if (unreadIds.length === 0) return;
    setMarkingUpdatesRead(true);
    const res = await markAllAppUpdatesRead(unreadIds);
    setMarkingUpdatesRead(false);
    if (!res.ok) return;
    setUpdates((prev) => prev.map((u) => ({ ...u, read: true })));
  }

  // ---------------------------------------------------------------------------
  // Auth guard
  // ---------------------------------------------------------------------------

  if (!userId) {
    return (
      <section className="kal-glass-panel mx-auto w-full max-w-2xl rounded-[1.25rem] p-6 text-center sm:p-8">
        <p className="text-lg font-semibold text-kal-text">Sign in required</p>
        <p className="mt-2 text-sm text-kal-muted">
          Please sign in to view your notifications.
        </p>
        <Link href="/auth" className="kal-btn-accent mt-5 min-h-[44px]">
          Go to sign in
        </Link>
      </section>
    );
  }

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------

  return (
    <div className="mx-auto w-full max-w-2xl space-y-6">
      {/* Page header */}
      <header>
        <p className="text-[0.65rem] font-semibold uppercase tracking-widest text-kal-accent">
          Alerts
        </p>
        <h1 className="kal-feature-title mt-1">Notifications</h1>
        <p className="mt-2 text-sm text-kal-muted">
          Daily reminders, deadlines, and important product updates appear here.
        </p>
      </header>

      {/* Segment tabs */}
      <div
        className="flex items-center gap-2"
        role="tablist"
        aria-label="Notification segments"
      >
        {(["general", "updates"] as Segment[]).map((seg) => {
          const active = segment === seg;
          const unread = seg === "general" ? generalUnread : updatesUnread;
          const label = seg === "general" ? "General" : "Updates";
          return (
            <button
              key={seg}
              type="button"
              role="tab"
              aria-selected={active}
              onClick={() => { setSegment(seg); }}
              className={clsx(
                "inline-flex min-h-[40px] items-center gap-2 rounded-xl border px-4 py-2 text-sm font-semibold transition-colors",
                active
                  ? "border-kal-accent/35 bg-kal-accent/10 text-kal-accent shadow-sm"
                  : "border-kal-border/80 bg-kal-card-muted/40 text-kal-text-secondary hover:border-kal-accent/40 hover:text-kal-text",
              )}
            >
              {label}
              {unread > 0 ? (
                <span
                  className={clsx(
                    "flex h-5 min-w-[20px] items-center justify-center rounded-full px-1.5 text-[10px] font-bold tabular-nums",
                    active
                      ? "bg-kal-accent text-white"
                      : "bg-kal-accent/15 text-kal-accent",
                  )}
                  aria-label={`${unread} unread`}
                >
                  {unread}
                </span>
              ) : null}
            </button>
          );
        })}
      </div>

      {/* ------------------------------------------------------------------ */}
      {/* GENERAL TAB                                                         */}
      {/* ------------------------------------------------------------------ */}
      {segment === "general" ? (
        <div className="space-y-5">
          {/* Action row */}
          {!loadingGeneral && notifications.length > 0 ? (
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() => { void handleMarkGeneralRead(); }}
                disabled={markingRead || generalUnread === 0}
                className="kal-btn-ghost min-h-[40px] rounded-xl px-4 py-2 text-sm font-semibold disabled:opacity-40"
              >
                {markingRead ? "Marking…" : "Mark all as read"}
              </button>
              <button
                type="button"
                onClick={() => { void handleClearAll(); }}
                disabled={clearing}
                aria-busy={clearing}
                className="kal-btn-ghost min-h-[40px] rounded-xl px-4 py-2 text-sm font-semibold disabled:opacity-40"
              >
                {clearing ? "Clearing…" : "Clear all"}
              </button>
              {clearError ? (
                <p className="w-full text-xs text-[var(--kal-warn-text)]">{clearError}</p>
              ) : null}
            </div>
          ) : null}

          {/* Feature filter chips */}
          {!loadingGeneral ? (
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
                    onClick={() => { setFilter(chip.id); }}
                    className={clsx(
                      "inline-flex min-h-[36px] items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-semibold transition-colors",
                      active
                        ? "border-kal-accent bg-kal-accent/15 text-kal-text"
                        : "border-kal-border/80 bg-kal-card-muted/40 text-kal-text-secondary hover:border-kal-accent/50 hover:text-kal-text",
                    )}
                    aria-pressed={active}
                  >
                    {chip.label}
                    <span className="tabular-nums text-[10px] font-bold text-kal-text-secondary opacity-80" aria-hidden>
                      {count}
                    </span>
                  </button>
                );
              })}
            </div>
          ) : null}

          {/* Error */}
          {generalError ? (
            <section className="rounded-[1.25rem] border border-[var(--kal-warn-border)] bg-[var(--kal-warn-soft)] p-5 text-sm text-[var(--kal-warn-text)]">
              Could not load notifications: {generalError}
            </section>
          ) : null}

          {/* Loading */}
          {loadingGeneral ? (
            <section className="kal-glass-panel rounded-[1.25rem] p-6 text-center sm:p-8">
              <p className="text-sm text-kal-muted">Loading notifications…</p>
            </section>
          ) : notifications.length === 0 ? (
            <section className="kal-glass-panel rounded-[1.25rem] p-6 text-center sm:p-8">
              <NotificationsEmptyIllustration className="mx-auto h-32 w-32" />
              <p className="mt-4 text-lg font-semibold text-kal-text">You&apos;re all caught up</p>
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
                onClick={() => { setFilter("all"); }}
                className="kal-btn-accent mt-4 min-h-[44px] px-5"
              >
                Show all
              </button>
            </section>
          ) : (
            <div className="kal-glass-panel rounded-[1.25rem] p-2 sm:p-3">
              <div className="space-y-1">
                {generalDayGroups.map((group, groupIndex) => (
                  <section
                    key={group.dayKey}
                    aria-labelledby={`notif-day-${group.dayKey}`}
                    className={groupIndex > 0 ? "mt-1 border-t border-kal-border/80 pt-1" : undefined}
                  >
                    <h2
                      className="px-4 pb-2 pt-2 text-sm font-semibold text-kal-text"
                      id={`notif-day-${group.dayKey}`}
                    >
                      {group.label}
                    </h2>
                    <ul aria-label={`${group.label} notifications`} className="divide-y divide-kal-border">
                      {group.items.map((item) => {
                        const featurePill = getFeatureTagPill(item.feature);
                        return (
                          <li
                            key={item.id}
                            className={clsx(
                              "flex gap-3 px-4 py-3",
                              !item.read && "bg-kal-accent/[0.04]",
                            )}
                          >
                            {/* Unread indicator dot */}
                            <div className="mt-1.5 flex w-2 shrink-0 justify-center">
                              {!item.read ? (
                                <span
                                  className="h-2 w-2 rounded-full bg-kal-accent"
                                  aria-label="Unread"
                                />
                              ) : null}
                            </div>
                            <div className="min-w-0 flex-1">
                              <div className="flex items-start justify-between gap-2">
                                <p className="min-w-0 flex-1 text-sm font-semibold text-kal-text">
                                  {item.title}
                                </p>
                                <span className={featurePill.className} title={featurePill.label}>
                                  {featurePill.label}
                                </span>
                              </div>
                              <p className="mt-0.5 text-sm text-kal-muted">{item.message}</p>
                              <p className="mt-1 text-[11px] text-kal-text-secondary">
                                {format(new Date(item.created_at), "h:mm a")}
                              </p>
                            </div>
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
      ) : null}

      {/* ------------------------------------------------------------------ */}
      {/* UPDATES TAB                                                         */}
      {/* ------------------------------------------------------------------ */}
      {segment === "updates" ? (
        <div className="space-y-5">
          {/* Action row */}
          {!loadingUpdates && updates.length > 0 ? (
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => { void handleMarkUpdatesRead(); }}
                disabled={markingUpdatesRead || updatesUnread === 0}
                className="kal-btn-ghost min-h-[40px] rounded-xl px-4 py-2 text-sm font-semibold disabled:opacity-40"
              >
                {markingUpdatesRead ? "Marking…" : "Mark all as read"}
              </button>
            </div>
          ) : null}

          {/* Error */}
          {updatesError ? (
            <section className="rounded-[1.25rem] border border-[var(--kal-warn-border)] bg-[var(--kal-warn-soft)] p-5 text-sm text-[var(--kal-warn-text)]">
              Could not load updates: {updatesError}
            </section>
          ) : null}

          {/* Loading */}
          {loadingUpdates ? (
            <section className="kal-glass-panel rounded-[1.25rem] p-6 text-center sm:p-8">
              <p className="text-sm text-kal-muted">Loading updates…</p>
            </section>
          ) : updates.length === 0 ? (
            <section className="kal-glass-panel rounded-[1.25rem] p-6 text-center sm:p-8">
              <p className="text-lg font-semibold text-kal-text">No updates yet</p>
              <p className="mt-2 text-sm text-kal-muted">
                We&apos;ll post new features and improvements here. Check back soon.
              </p>
            </section>
          ) : (
            <div className="kal-glass-panel rounded-[1.25rem] p-2 sm:p-3">
              <div className="space-y-1">
                {updatesDayGroups.map((group, groupIndex) => (
                  <section
                    key={group.dayKey}
                    aria-labelledby={`upd-day-${group.dayKey}`}
                    className={groupIndex > 0 ? "mt-1 border-t border-kal-border/80 pt-1" : undefined}
                  >
                    <h2
                      className="px-4 pb-2 pt-2 text-sm font-semibold text-kal-text"
                      id={`upd-day-${group.dayKey}`}
                    >
                      {group.label}
                    </h2>
                    <ul aria-label={`${group.label} updates`} className="divide-y divide-kal-border">
                      {group.items.map((item) => (
                        <li
                          key={item.id}
                          className={clsx(
                            "flex gap-3 px-4 py-3",
                            !item.read && "bg-kal-accent/[0.04]",
                          )}
                        >
                          {/* Unread indicator dot */}
                          <div className="mt-1.5 flex w-2 shrink-0 justify-center">
                            {!item.read ? (
                              <span
                                className="h-2 w-2 rounded-full bg-kal-accent"
                                aria-label="Unread"
                              />
                            ) : null}
                          </div>
                          <div className="min-w-0 flex-1">
                            <div className="flex items-start justify-between gap-2">
                              <p className="min-w-0 flex-1 text-sm font-semibold text-kal-text">
                                {item.title}
                              </p>
                              <span className={categoryPillClass(item.category)}>
                                {item.category}
                              </span>
                            </div>
                            <p className="mt-0.5 text-sm text-kal-muted">{item.message}</p>
                            <p className="mt-1 text-[11px] text-kal-text-secondary">
                              {format(new Date(item.created_at), "h:mm a")}
                            </p>
                          </div>
                        </li>
                      ))}
                    </ul>
                  </section>
                ))}
              </div>
            </div>
          )}
        </div>
      ) : null}
    </div>
  );
}

"use client";

import { useState, useEffect, useRef } from "react";
import type {
  ActivitySnapshot,
  UserActivitySummary,
} from "@/lib/admin/queries/activityQueries";
import type { UserListRow } from "@/lib/admin/queries/userLookupQueries";
import { AdminKpiCard } from "@/components/admin/AdminKpiCard";

// ── Helpers ───────────────────────────────────────────────────────────────────

function fmtDate(iso: string) {
  return new Date(iso).toLocaleString("en-IN", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
}

function PlatformBadge({ platform }: { platform: string }) {
  const styles: Record<string, string> = {
    ios_pwa: "bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300",
    android_pwa: "bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300",
    web: "bg-kal-muted/20 text-kal-muted",
  };
  return (
    <span
      className={`inline-flex rounded-full px-2 py-0.5 text-[10px] font-medium ${
        styles[platform] ?? styles.web
      }`}
    >
      {platform}
    </span>
  );
}

function SubBadge({ status }: { status: string | null }) {
  if (!status) return <span className="text-kal-muted text-[10px]">—</span>;
  const active = status === "active";
  return (
    <span
      className={`inline-flex rounded-full px-2 py-0.5 text-[10px] font-medium ${
        active
          ? "bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300"
          : "bg-kal-muted/20 text-kal-muted"
      }`}
    >
      {status}
    </span>
  );
}

function BarChart({ items }: { items: { label: string; count: number }[] }) {
  const max = Math.max(...items.map((i) => i.count), 1);
  return (
    <ul className="space-y-1.5">
      {items.map((item) => (
        <li key={item.label} className="flex items-center gap-2 text-xs">
          <span className="w-40 shrink-0 truncate text-kal-muted" title={item.label}>
            {item.label}
          </span>
          <div className="flex-1 rounded-full bg-kal-border h-2">
            <div
              className="h-2 rounded-full bg-kal-primary/70"
              style={{ width: `${(item.count / max) * 100}%` }}
            />
          </div>
          <span className="w-12 text-right tabular-nums text-kal-text">
            {item.count.toLocaleString("en-IN")}
          </span>
        </li>
      ))}
    </ul>
  );
}

const DAY_OPTIONS = [7, 14, 30] as const;
const PER_PAGE = 25;

// ── Component ─────────────────────────────────────────────────────────────────

export function AdminUserActivityClient() {
  // ── Overview state ──────────────────────────────────────────────────────────
  const [days, setDays] = useState<7 | 14 | 30>(7);
  const [snapshot, setSnapshot] = useState<ActivitySnapshot | null>(null);
  const [snapshotLoading, setSnapshotLoading] = useState(false);
  const [snapshotError, setSnapshotError] = useState<string | null>(null);

  // ── User list state ─────────────────────────────────────────────────────────
  const [userRows, setUserRows] = useState<UserListRow[] | null>(null);
  const [userTotal, setUserTotal] = useState(0);
  const [userPage, setUserPage] = useState(1);
  const [usersLoading, setUsersLoading] = useState(false);
  const [usersError, setUsersError] = useState<string | null>(null);

  // ── Per-user activity state ─────────────────────────────────────────────────
  const [selectedUser, setSelectedUser] = useState<UserListRow | null>(null);
  const [userActivity, setUserActivity] = useState<UserActivitySummary | null>(null);
  const [activityLoading, setActivityLoading] = useState(false);
  const [activityError, setActivityError] = useState<string | null>(null);
  const activityPanelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!selectedUser) return;
    const id = setTimeout(() => {
      activityPanelRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 50);
    return () => clearTimeout(id);
  }, [selectedUser]);

  // ── Handlers ────────────────────────────────────────────────────────────────

  async function loadSnapshot() {
    setSnapshotLoading(true);
    setSnapshotError(null);
    try {
      const res = await fetch(`/api/admin/activity-snapshot?days=${days}`);
      const json = (await res.json()) as {
        ok: boolean;
        data?: ActivitySnapshot;
        error?: string;
      };
      if (!json.ok || !json.data) throw new Error(json.error ?? "Failed to load.");
      setSnapshot(json.data);
    } catch (e) {
      setSnapshotError(e instanceof Error ? e.message : "Unknown error.");
    } finally {
      setSnapshotLoading(false);
    }
  }

  async function loadUsers(page: number) {
    setUsersLoading(true);
    setUsersError(null);
    try {
      const res = await fetch(`/api/admin/activity-users-list?page=${page}`);
      const json = (await res.json()) as {
        ok: boolean;
        data?: { rows: UserListRow[]; total: number };
        error?: string;
      };
      if (!json.ok || !json.data) throw new Error(json.error ?? "Failed to load users.");
      setUserRows(json.data.rows);
      setUserTotal(json.data.total);
      setUserPage(page);
      // Clear activity panel when navigating pages
      setSelectedUser(null);
      setUserActivity(null);
    } catch (e) {
      setUsersError(e instanceof Error ? e.message : "Unknown error.");
    } finally {
      setUsersLoading(false);
    }
  }

  async function loadActivityForUser(row: UserListRow) {
    setSelectedUser(row);
    setActivityLoading(true);
    setActivityError(null);
    setUserActivity(null);
    try {
      const res = await fetch(
        `/api/admin/activity-user?uid=${encodeURIComponent(row.userId)}`,
      );
      const json = (await res.json()) as {
        ok: boolean;
        data?: UserActivitySummary;
        error?: string;
      };
      if (!json.ok || !json.data) throw new Error(json.error ?? "Failed to load activity.");
      setUserActivity(json.data);
    } catch (e) {
      setActivityError(e instanceof Error ? e.message : "Unknown error.");
    } finally {
      setActivityLoading(false);
    }
  }

  const totalPages = Math.max(1, Math.ceil(userTotal / PER_PAGE));

  // ── Render ──────────────────────────────────────────────────────────────────

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-semibold text-kal-text">User Activity</h1>
        <p className="mt-1 text-sm text-kal-muted">
          In-app activity logs — page views and feature events. Load on demand.
        </p>
      </div>

      {/* ── Overview ── */}
      <div className="rounded-2xl border border-kal-border bg-kal-card/40 p-4 space-y-4">
        <h2 className="text-sm font-semibold text-kal-text">Overview</h2>
        <div className="flex items-center gap-3 flex-wrap">
          <div className="flex rounded-lg border border-kal-border overflow-hidden text-sm">
            {DAY_OPTIONS.map((d) => (
              <button
                key={d}
                type="button"
                onClick={() => setDays(d)}
                className={`px-3 py-1.5 transition-colors ${
                  days === d
                    ? "bg-kal-primary text-white"
                    : "bg-kal-bg text-kal-muted hover:bg-kal-card"
                }`}
              >
                {d}d
              </button>
            ))}
          </div>
          <button
            type="button"
            onClick={loadSnapshot}
            disabled={snapshotLoading}
            className="rounded-lg bg-kal-primary px-4 py-1.5 text-sm font-medium text-white hover:bg-kal-primary/90 transition-colors disabled:opacity-50"
          >
            {snapshotLoading ? "Loading…" : "Load overview"}
          </button>
          {snapshotError && <span className="text-xs text-red-500">{snapshotError}</span>}
        </div>

        {!snapshot && !snapshotLoading && (
          <p className="text-sm text-kal-muted py-6 text-center">
            Select a time window and click Load overview to see activity data.
          </p>
        )}

        {snapshot && (
          <div className="space-y-6 pt-2">
            <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
              <AdminKpiCard
                label={`Total events (${days}d)`}
                value={snapshot.totalEventsLast7d}
              />
              <AdminKpiCard
                label={`Unique users (${days}d)`}
                value={snapshot.uniqueUsersLast7d}
              />
              <AdminKpiCard
                label="Avg events / user"
                value={
                  snapshot.uniqueUsersLast7d > 0
                    ? (snapshot.totalEventsLast7d / snapshot.uniqueUsersLast7d).toFixed(1)
                    : "0"
                }
              />
              <AdminKpiCard
                label={`PWA events (${days}d)`}
                value={snapshot.platformBreakdown
                  .filter((p) => p.platform !== "web")
                  .reduce((s, p) => s + p.count, 0)}
                sub="ios_pwa + android_pwa"
              />
            </div>

            {snapshot.dailyCounts.length > 0 && (
              <div>
                <p className="mb-2 text-xs font-medium text-kal-muted uppercase tracking-wider">
                  Daily events
                </p>
                <div className="flex items-end gap-1.5 h-24">
                  {(() => {
                    const max = Math.max(
                      ...snapshot.dailyCounts.map((d) => d.count),
                      1,
                    );
                    return snapshot.dailyCounts.map((d) => (
                      <div
                        key={d.date}
                        className="group relative flex flex-1 flex-col items-center"
                      >
                        <div
                          className="w-full rounded-sm bg-kal-primary/70 group-hover:bg-kal-primary transition-colors"
                          style={{ height: `${Math.max(4, (d.count / max) * 80)}px` }}
                        />
                        <span className="mt-1 text-[9px] text-kal-muted">
                          {d.date.slice(5)}
                        </span>
                        <div className="pointer-events-none absolute -top-7 left-1/2 -translate-x-1/2 rounded bg-kal-overlay px-1.5 py-0.5 text-[10px] text-kal-text opacity-0 group-hover:opacity-100 whitespace-nowrap z-10">
                          {d.date}: {d.count}
                        </div>
                      </div>
                    ));
                  })()}
                </div>
              </div>
            )}

            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <div>
                <p className="mb-2 text-xs font-medium text-kal-muted uppercase tracking-wider">
                  Top pages
                </p>
                <BarChart
                  items={snapshot.topPages.map((p) => ({ label: p.page, count: p.count }))}
                />
              </div>
              <div>
                <p className="mb-2 text-xs font-medium text-kal-muted uppercase tracking-wider">
                  Top actions
                </p>
                <BarChart
                  items={snapshot.topActions.map((a) => ({
                    label: a.feature ? `${a.feature} / ${a.action}` : a.action,
                    count: a.count,
                  }))}
                />
              </div>
            </div>

            {snapshot.platformBreakdown.length > 0 && (
              <div className="flex flex-wrap gap-3">
                {snapshot.platformBreakdown.map((p) => (
                  <div key={p.platform} className="flex items-center gap-2 text-sm">
                    <PlatformBadge platform={p.platform} />
                    <span className="tabular-nums text-kal-text">
                      {p.count.toLocaleString("en-IN")} events
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* ── User list ── */}
      <div className="rounded-2xl border border-kal-border bg-kal-card/40 p-4 space-y-4">
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <h2 className="text-sm font-semibold text-kal-text">User activity timeline</h2>
          {!userRows && (
            <button
              type="button"
              onClick={() => loadUsers(1)}
              disabled={usersLoading}
              className="rounded-lg bg-kal-primary px-4 py-1.5 text-sm font-medium text-white hover:bg-kal-primary/90 transition-colors disabled:opacity-50"
            >
              {usersLoading ? "Loading…" : "Load users"}
            </button>
          )}
        </div>

        {usersError && <p className="text-xs text-red-500">{usersError}</p>}

        {!userRows && !usersLoading && !usersError && (
          <p className="text-sm text-kal-muted text-center py-6">
            Click Load users to browse users and view their activity.
          </p>
        )}

        {/* User table */}
        {userRows && (
          <div className="space-y-3">
            {/* Pagination controls */}
            <div className="flex items-center justify-between text-xs text-kal-muted">
              <span>
                Page {userPage} of {totalPages} &nbsp;·&nbsp;{" "}
                {userTotal.toLocaleString("en-IN")} users total
              </span>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => loadUsers(userPage - 1)}
                  disabled={userPage <= 1 || usersLoading}
                  className="rounded-md border border-kal-border px-3 py-1 text-xs hover:bg-kal-card transition-colors disabled:opacity-40"
                >
                  ← Prev
                </button>
                <button
                  type="button"
                  onClick={() => loadUsers(userPage + 1)}
                  disabled={userPage >= totalPages || usersLoading}
                  className="rounded-md border border-kal-border px-3 py-1 text-xs hover:bg-kal-card transition-colors disabled:opacity-40"
                >
                  Next →
                </button>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-kal-border text-left text-kal-muted">
                    <th className="pb-2 pr-4 font-medium">Name / phone</th>
                    <th className="pb-2 pr-4 font-medium">Subscription</th>
                    <th className="pb-2 pr-4 font-medium">Exam / track</th>
                    <th className="pb-2 font-medium"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-kal-border/40">
                  {userRows.map((row) => {
                    const isSelected = selectedUser?.userId === row.userId;
                    return (
                      <tr
                        key={row.userId}
                        className={`transition-colors ${
                          isSelected
                            ? "bg-kal-primary/10"
                            : "hover:bg-kal-card/60 cursor-pointer"
                        }`}
                        onClick={() => loadActivityForUser(row)}
                      >
                        <td className="py-2 pr-4">
                          <p className="font-medium text-kal-text">
                            {row.fullName ?? (
                              <span className="text-kal-muted italic">No name</span>
                            )}
                          </p>
                          {row.phone && (
                            <p className="text-kal-muted mt-0.5">{row.phone}</p>
                          )}
                        </td>
                        <td className="py-2 pr-4">
                          <SubBadge status={row.subscriptionStatus} />
                          {row.subscriptionPlan && (
                            <p className="text-kal-muted mt-0.5">{row.subscriptionPlan}</p>
                          )}
                        </td>
                        <td className="py-2 pr-4 text-kal-muted max-w-[160px] truncate">
                          {row.trackOrExam || "—"}
                        </td>
                        <td className="py-2 text-right">
                          <span
                            className={`text-[10px] font-medium ${
                              isSelected ? "text-kal-primary" : "text-kal-muted"
                            }`}
                          >
                            {isSelected
                              ? activityLoading
                                ? "Loading…"
                                : "Viewing ▾"
                              : "View →"}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Bottom pagination (repeat for convenience) */}
            <div className="flex justify-end gap-2 pt-1">
              <button
                type="button"
                onClick={() => loadUsers(userPage - 1)}
                disabled={userPage <= 1 || usersLoading}
                className="rounded-md border border-kal-border px-3 py-1 text-xs hover:bg-kal-card transition-colors disabled:opacity-40"
              >
                ← Prev
              </button>
              <button
                type="button"
                onClick={() => loadUsers(userPage + 1)}
                disabled={userPage >= totalPages || usersLoading}
                className="rounded-md border border-kal-border px-3 py-1 text-xs hover:bg-kal-card transition-colors disabled:opacity-40"
              >
                Next →
              </button>
            </div>
          </div>
        )}
      </div>

      {/* ── Activity panel ── */}
      {selectedUser && (
        <div ref={activityPanelRef} className="rounded-2xl border border-kal-border bg-kal-card/40 p-4 space-y-3">
          <div>
            <h2 className="text-sm font-semibold text-kal-text">
              Activity — {selectedUser.fullName ?? "User"}
            </h2>
            <p className="text-[10px] text-kal-muted mt-0.5 font-mono">
              {selectedUser.userId}
            </p>
          </div>

          {activityLoading && (
            <p className="text-sm text-kal-muted text-center py-6">Loading activity…</p>
          )}

          {activityError && <p className="text-xs text-red-500">{activityError}</p>}

          {userActivity && !activityLoading && (
            <>
              <p className="text-xs text-kal-muted">
                Showing {userActivity.rows.length} of{" "}
                {userActivity.totalCount.toLocaleString("en-IN")} events
              </p>
              {userActivity.rows.length === 0 ? (
                <p className="text-sm text-kal-muted text-center py-4">
                  No activity recorded for this user yet.
                </p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="border-b border-kal-border text-left text-kal-muted">
                        <th className="pb-2 pr-3 font-medium">Time</th>
                        <th className="pb-2 pr-3 font-medium">Page</th>
                        <th className="pb-2 pr-3 font-medium">Feature</th>
                        <th className="pb-2 pr-3 font-medium">Action</th>
                        <th className="pb-2 pr-3 font-medium">Platform</th>
                        <th className="pb-2 font-medium">Meta</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-kal-border/40">
                      {userActivity.rows.map((row) => (
                        <tr key={row.id} className="hover:bg-kal-card/60">
                          <td className="py-1.5 pr-3 whitespace-nowrap text-kal-muted">
                            {fmtDate(row.created_at)}
                          </td>
                          <td className="py-1.5 pr-3 font-mono text-kal-text">{row.page}</td>
                          <td className="py-1.5 pr-3 text-kal-muted">{row.feature ?? "—"}</td>
                          <td className="py-1.5 pr-3 font-medium text-kal-text">
                            {row.action}
                          </td>
                          <td className="py-1.5 pr-3">
                            <PlatformBadge platform={row.platform} />
                          </td>
                          <td className="py-1.5 max-w-[200px] truncate text-kal-muted">
                            {Object.keys(row.metadata).length > 0
                              ? JSON.stringify(row.metadata)
                              : "—"}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
}

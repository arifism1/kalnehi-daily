"use client";

import { useState } from "react";
import type { PwaStatsSnapshot } from "@/lib/admin/queries/activityQueries";
import { AdminKpiCard } from "@/components/admin/AdminKpiCard";

function fmtDate(iso: string | null) {
  if (!iso) return "—";
  return new Date(iso).toLocaleString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

const DAY_OPTIONS = [7, 14, 30, 60] as const;

export function AdminPwaClient() {
  const [days, setDays] = useState<7 | 14 | 30 | 60>(30);
  const [data, setData] = useState<PwaStatsSnapshot | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function loadStats() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/admin/pwa-stats?days=${days}`);
      const json = await res.json() as { ok: boolean; data?: PwaStatsSnapshot; error?: string };
      if (!json.ok || !json.data) throw new Error(json.error ?? "Failed to load.");
      setData(json.data);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unknown error.");
    } finally {
      setLoading(false);
    }
  }

  const iosPct = data && data.installedCount > 0 ? (data.installedIos / data.installedCount) * 100 : 0;
  const androidPct = data && data.installedCount > 0 ? (data.installedAndroid / data.installedCount) * 100 : 0;

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-semibold text-kal-text">PWA Installs</h1>
        <p className="mt-1 text-sm text-kal-muted">
          Users who have added Kalnehi to their home screen. Select a window and load on demand.
        </p>
      </div>

      {/* Controls */}
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
          onClick={loadStats}
          disabled={loading}
          className="rounded-lg bg-kal-primary px-4 py-1.5 text-sm font-medium text-white hover:bg-kal-primary/90 transition-colors disabled:opacity-50"
        >
          {loading ? "Loading…" : "Load stats"}
        </button>
        {error && <span className="text-xs text-red-500">{error}</span>}
      </div>

      {/* Idle prompt */}
      {!data && !loading && (
        <div className="rounded-2xl border border-kal-border bg-kal-card/40 p-8 text-center">
          <p className="text-sm text-kal-muted">
            Select a time window and click Load stats to see PWA install data.
          </p>
        </div>
      )}

      {/* Loaded state */}
      {data && (
        <>
          {/* KPI grid */}
          <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
            <AdminKpiCard label="Total users" value={data.totalUsers.toLocaleString("en-IN")} />
            <AdminKpiCard
              label="PWA installed"
              value={data.installedCount.toLocaleString("en-IN")}
              sub={`${data.installPct.toFixed(1)}% of all users`}
            />
            <AdminKpiCard
              label="iOS installs"
              value={data.installedIos.toLocaleString("en-IN")}
              sub={`${iosPct.toFixed(0)}% of installs`}
            />
            <AdminKpiCard
              label="Android installs"
              value={data.installedAndroid.toLocaleString("en-IN")}
              sub={`${androidPct.toFixed(0)}% of installs`}
            />
          </div>

          {/* Install events by day */}
          {data.dailyInstallEvents.length > 0 && (
            <div className="rounded-2xl border border-kal-border bg-kal-card/40 p-4">
              <h2 className="mb-3 text-sm font-semibold text-kal-text">Daily install events ({days}d)</h2>
              <div className="flex items-end gap-1 h-24 overflow-x-auto">
                {(() => {
                  const max = Math.max(...data.dailyInstallEvents.map((d) => d.count), 1);
                  return data.dailyInstallEvents.map((d) => (
                    <div
                      key={d.date}
                      className="group relative flex flex-col items-center"
                      style={{ minWidth: 20 }}
                    >
                      <div
                        className="w-4 rounded-sm bg-kal-primary/70 group-hover:bg-kal-primary transition-colors"
                        style={{ height: `${Math.max(4, (d.count / max) * 80)}px` }}
                      />
                      <div className="pointer-events-none absolute -top-7 left-1/2 -translate-x-1/2 rounded bg-kal-overlay px-1.5 py-0.5 text-[10px] text-kal-text opacity-0 group-hover:opacity-100 whitespace-nowrap">
                        {d.date}: {d.count}
                      </div>
                    </div>
                  ));
                })()}
              </div>
            </div>
          )}

          {/* Recently active installed users */}
          {data.recentInstalls.length > 0 && (
            <div className="rounded-2xl border border-kal-border bg-kal-card/40 p-4">
              <h2 className="mb-3 text-sm font-semibold text-kal-text">
                Installed users (recent activity, up to 50)
              </h2>
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="border-b border-kal-border text-left text-kal-muted">
                      <th className="pb-2 pr-4 font-medium">User ID</th>
                      <th className="pb-2 pr-4 font-medium">Platform</th>
                      <th className="pb-2 pr-4 font-medium">First opened</th>
                      <th className="pb-2 font-medium">Last opened</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-kal-border/50">
                    {data.recentInstalls.map((r) => (
                      <tr key={r.user_id} className="hover:bg-kal-card/60">
                        <td className="py-1.5 pr-4 font-mono text-[10px] text-kal-muted">
                          {r.user_id.slice(0, 8)}…
                        </td>
                        <td className="py-1.5 pr-4">
                          <span
                            className={`inline-flex rounded-full px-2 py-0.5 text-[10px] font-medium ${
                              r.pwa_install_platform === "ios"
                                ? "bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300"
                                : "bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300"
                            }`}
                          >
                            {r.pwa_install_platform ?? "unknown"}
                          </span>
                        </td>
                        <td className="py-1.5 pr-4 text-kal-muted">{fmtDate(r.pwa_first_opened_at)}</td>
                        <td className="py-1.5 text-kal-muted">{fmtDate(r.pwa_last_opened_at)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {data.installedCount === 0 && (
            <p className="text-sm text-kal-muted">
              No PWA installs recorded yet for this window. Data appears once users open the app in standalone mode.
            </p>
          )}
        </>
      )}
    </div>
  );
}

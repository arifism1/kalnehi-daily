"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import type { AppConfig } from "@/lib/admin/killSwitch";

// ── Types ──────────────────────────────────────────────────────────────────────

export type DailyCountRow = {
  date: string;          // 'YYYY-MM-DD'
  trials_started: number;
  cap: number;
  skip_paid_count: number;
};

type Props = {
  initialConfig: AppConfig;
  initialHistory: DailyCountRow[];
};

// ── Helpers ────────────────────────────────────────────────────────────────────

function fmtDate(dateStr: string): string {
  return new Date(`${dateStr}T00:00:00`).toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function pct(started: number, cap: number): string {
  if (cap <= 0) return "—";
  return `${Math.round((started / cap) * 100)}%`;
}

function hoursFromNow(resetsAt: Date): string {
  const diff = resetsAt.getTime() - Date.now();
  if (diff <= 0) return "0h 0m";
  const totalMin = Math.floor(diff / 60_000);
  return `${Math.floor(totalMin / 60)}h ${totalMin % 60}m`;
}

function getNextISTMidnight(): Date {
  const now = new Date();
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Kolkata",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(now);
  const y = Number(parts.find((p) => p.type === "year")?.value);
  const mo = Number(parts.find((p) => p.type === "month")?.value);
  const d = Number(parts.find((p) => p.type === "day")?.value);
  const tomorrowLocal = new Date(`${y}-${String(mo).padStart(2, "0")}-${String(d + 1).padStart(2, "0")}T00:00:00`);
  const offsetMatch = new Intl.DateTimeFormat("en-US", {
    timeZone: "Asia/Kolkata",
    timeZoneName: "shortOffset",
  }).format(tomorrowLocal).match(/GMT([+-]\d+(?::\d+)?)/);
  let offsetMin = 0;
  if (offsetMatch?.[1]) {
    const [h, m] = offsetMatch[1].split(":").map(Number);
    offsetMin = (h ?? 0) * 60 + (h! < 0 ? -(m ?? 0) : (m ?? 0));
  }
  return new Date(tomorrowLocal.getTime() - offsetMin * 60_000);
}

// ── Component ──────────────────────────────────────────────────────────────────

export function AdminDailyCapSection({ initialConfig, initialHistory }: Props) {
  const [capEnabled, setCapEnabled] = useState(initialConfig.daily_cap_enabled);
  const [dailyCap, setDailyCap] = useState(initialConfig.daily_trial_cap);
  const [history, setHistory] = useState<DailyCountRow[]>(initialHistory);
  const [capInput, setCapInput] = useState(String(initialConfig.daily_trial_cap));
  const [busy, setBusy] = useState(false);
  const [capSaved, setCapSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [modal, setModal] = useState<"enable" | "disable" | null>(null);

  // Live countdown to IST midnight.
  const [resetIn, setResetIn] = useState(() => hoursFromNow(getNextISTMidnight()));
  useEffect(() => {
    const id = window.setInterval(() => setResetIn(hoursFromNow(getNextISTMidnight())), 10_000);
    return () => window.clearInterval(id);
  }, []);

  // Today's row from history (first entry = most recent date).
  const today = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Kolkata" }).format(new Date());
  const todayRow = history.find((r) => r.date === today);
  const trialsToday = todayRow?.trials_started ?? 0;
  const capToday = todayRow?.cap ?? dailyCap;
  const spotsLeft = Math.max(0, capToday - trialsToday);

  // Auto-refresh every 30 s.
  const refreshHistory = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/daily-cap");
      if (res.ok) {
        const data = (await res.json()) as { history: DailyCountRow[] };
        setHistory(data.history ?? []);
      }
    } catch {
      // silent
    }
  }, []);

  const timerRef = useRef<number | null>(null);
  useEffect(() => {
    timerRef.current = window.setInterval(() => void refreshHistory(), 30_000);
    return () => {
      if (timerRef.current) window.clearInterval(timerRef.current);
    };
  }, [refreshHistory]);

  // ── Toggle cap enabled ──────────────────────────────────────────────────────

  async function handleToggle(enable: boolean) {
    setBusy(true);
    setError(null);
    setModal(null);
    try {
      const res = await fetch("/api/admin/daily-cap", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "toggle", daily_cap_enabled: enable }),
      });
      const data = (await res.json()) as { ok: boolean; error?: string };
      if (!data.ok) {
        setError(data.error ?? "Failed to update.");
        return;
      }
      setCapEnabled(enable);
    } catch {
      setError("Network error.");
    } finally {
      setBusy(false);
    }
  }

  // ── Save cap size ───────────────────────────────────────────────────────────

  async function handleSaveCap() {
    const val = parseInt(capInput, 10);
    if (!Number.isInteger(val) || val < 100 || val > 50_000) {
      setError("Cap must be a whole number between 100 and 50,000.");
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/daily-cap", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "update_cap", daily_trial_cap: val }),
      });
      const data = (await res.json()) as { ok: boolean; error?: string };
      if (!data.ok) {
        setError(data.error ?? "Failed to save.");
        return;
      }
      setDailyCap(val);
      setCapSaved(true);
      setTimeout(() => setCapSaved(false), 3000);
    } catch {
      setError("Network error.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="rounded-2xl border border-kal-border bg-kal-card/50 p-5 sm:p-6">
      <h2 className="mb-4 text-sm font-bold uppercase tracking-wider text-kal-muted">
        Daily Trial Cap
      </h2>

      {error && (
        <p className="mb-4 rounded-lg bg-kal-danger-soft px-3 py-2 text-xs font-medium text-kal-danger-text">
          {error}
        </p>
      )}

      {/* ── Toggle ─────────────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between gap-4 rounded-xl border border-kal-border bg-kal-card-muted/50 px-4 py-3">
        <div>
          <p className="text-sm font-semibold text-kal-text">Daily cap enabled</p>
          <p className="mt-0.5 text-xs text-kal-text-secondary">
            {capEnabled
              ? `Active — users beyond ${dailyCap.toLocaleString("en-IN")}/day are auto-queued and redirected to their trial start date.`
              : "Off — all eligible users can start a trial instantly."}
          </p>
        </div>
        <button
          type="button"
          disabled={busy}
          onClick={() => setModal(capEnabled ? "disable" : "enable")}
          className={`relative h-6 w-11 flex-shrink-0 rounded-full transition-colors ${
            capEnabled ? "bg-kal-accent" : "bg-kal-border"
          } disabled:opacity-50`}
          aria-label={capEnabled ? "Disable daily cap" : "Enable daily cap"}
        >
          <span
            className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform ${
              capEnabled ? "translate-x-5" : "translate-x-0.5"
            }`}
          />
        </button>
      </div>

      {/* ── Cap size input ──────────────────────────────────────────────────── */}
      <div className="mt-4">
        <label className="block text-xs font-medium text-kal-muted">Daily cap (spots per day)</label>
        <div className="mt-1.5 flex gap-2">
          <input
            type="number"
            min={100}
            max={50000}
            value={capInput}
            onChange={(e) => setCapInput(e.target.value)}
            className="w-32 rounded-lg border border-kal-border bg-kal-input-bg px-3 py-2 text-sm text-kal-text focus:outline-none focus:ring-1 focus:ring-kal-accent"
          />
          <button
            type="button"
            disabled={busy}
            onClick={() => void handleSaveCap()}
            className="rounded-lg bg-kal-accent px-4 py-2 text-xs font-semibold text-white transition hover:brightness-105 disabled:opacity-50"
          >
            {capSaved ? "Saved ✓" : "Save"}
          </button>
        </div>
        <p className="mt-1 text-[11px] text-kal-text-secondary">
          Changes to the cap take effect from the next calendar day (IST). Changing mid-day does not
          open more spots today.
        </p>
      </div>

      {/* ── Live today counter ──────────────────────────────────────────────── */}
      <div className="mt-5 grid grid-cols-3 gap-3">
        <div className="rounded-xl border border-kal-border bg-kal-card-muted/40 px-3 py-3 text-center">
          <p className="text-xl font-bold tabular-nums text-kal-text">
            {trialsToday.toLocaleString("en-IN")}
          </p>
          <p className="mt-0.5 text-[10px] font-medium uppercase tracking-wider text-kal-muted">
            Started today
          </p>
        </div>
        <div className="rounded-xl border border-kal-border bg-kal-card-muted/40 px-3 py-3 text-center">
          <p className="text-xl font-bold tabular-nums text-kal-text">
            {spotsLeft.toLocaleString("en-IN")}
          </p>
          <p className="mt-0.5 text-[10px] font-medium uppercase tracking-wider text-kal-muted">
            Spots remaining
          </p>
        </div>
        <div className="rounded-xl border border-kal-border bg-kal-card-muted/40 px-3 py-3 text-center">
          <p className="text-xl font-bold tabular-nums text-kal-text">{resetIn}</p>
          <p className="mt-0.5 text-[10px] font-medium uppercase tracking-wider text-kal-muted">
            Resets in
          </p>
        </div>
      </div>
      <p className="mt-1.5 text-[10px] text-kal-text-secondary">Refreshes every 30 seconds.</p>

      {/* ── 30-day history table ─────────────────────────────────────────────── */}
      <div className="mt-5">
        <p className="mb-2 text-xs font-semibold text-kal-muted">Last 30 days</p>
        {history.length === 0 ? (
          <p className="text-xs text-kal-text-secondary">No data yet — cap has not been used.</p>
        ) : (
          <div className="overflow-x-auto rounded-xl border border-kal-border">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-kal-border bg-kal-card-muted/50">
                  <th className="px-3 py-2 text-left font-medium text-kal-muted">Date</th>
                  <th className="px-3 py-2 text-right font-medium text-kal-muted">Started</th>
                  <th className="px-3 py-2 text-right font-medium text-kal-muted">Cap</th>
                  <th className="px-3 py-2 text-right font-medium text-kal-muted">% filled</th>
                  <th className="px-3 py-2 text-right font-medium text-kal-muted">₹19 skips</th>
                </tr>
              </thead>
              <tbody>
                {history.map((row, i) => {
                  const fillPct = row.cap > 0 ? row.trials_started / row.cap : 0;
                  return (
                    <tr
                      key={row.date}
                      className={`border-b border-kal-border/50 ${i % 2 === 0 ? "" : "bg-kal-card-muted/20"}`}
                    >
                      <td className="px-3 py-2 text-kal-text">{fmtDate(row.date)}</td>
                      <td className="px-3 py-2 text-right tabular-nums text-kal-text">
                        {row.trials_started.toLocaleString("en-IN")}
                      </td>
                      <td className="px-3 py-2 text-right tabular-nums text-kal-text-secondary">
                        {row.cap.toLocaleString("en-IN")}
                      </td>
                      <td
                        className={`px-3 py-2 text-right font-medium ${
                          fillPct >= 1
                            ? "text-orange-600 dark:text-orange-400"
                            : fillPct >= 0.8
                            ? "text-amber-600 dark:text-amber-400"
                            : "text-kal-text-secondary"
                        }`}
                      >
                        {pct(row.trials_started, row.cap)}
                      </td>
                      <td className="px-3 py-2 text-right tabular-nums text-kal-text-secondary">
                        {row.skip_paid_count > 0 ? (
                          <span className="font-medium text-kal-accent">
                            {row.skip_paid_count}
                          </span>
                        ) : (
                          "—"
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ── Confirm modals ───────────────────────────────────────────────────── */}
      {modal === "enable" && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-kal-overlay px-4">
          <div className="w-full max-w-md rounded-2xl border border-kal-border bg-kal-card p-6 shadow-xl">
            <h2 className="text-base font-semibold text-kal-text">Enable daily trial cap?</h2>
            <p className="mt-2 text-sm leading-relaxed text-kal-text-secondary">
              Users beyond the {dailyCap.toLocaleString("en-IN")}/day limit will be told today&rsquo;s spots
              are full and offered the ₹19 skip.
            </p>
            <div className="mt-6 flex justify-end gap-3">
              <button
                onClick={() => setModal(null)}
                className="rounded-lg px-4 py-2 text-sm font-medium text-kal-text-secondary hover:text-kal-text"
              >
                Cancel
              </button>
              <button
                disabled={busy}
                onClick={() => void handleToggle(true)}
                className="rounded-lg bg-kal-success-text px-4 py-2 text-sm font-semibold text-white hover:opacity-90 disabled:opacity-50"
              >
                Enable cap
              </button>
            </div>
          </div>
        </div>
      )}
      {modal === "disable" && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-kal-overlay px-4">
          <div className="w-full max-w-md rounded-2xl border border-kal-border bg-kal-card p-6 shadow-xl">
            <h2 className="text-base font-semibold text-kal-text">Disable daily trial cap?</h2>
            <p className="mt-2 text-sm leading-relaxed text-kal-text-secondary">
              All eligible users will be able to start a trial immediately. Users currently seeing
              the &ldquo;spots full&rdquo; message will see spots available on their next page refresh.
            </p>
            <div className="mt-6 flex justify-end gap-3">
              <button
                onClick={() => setModal(null)}
                className="rounded-lg px-4 py-2 text-sm font-medium text-kal-text-secondary hover:text-kal-text"
              >
                Cancel
              </button>
              <button
                disabled={busy}
                onClick={() => void handleToggle(false)}
                className="rounded-lg bg-kal-accent px-4 py-2 text-sm font-semibold text-white hover:opacity-90 disabled:opacity-50"
              >
                Disable cap
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}

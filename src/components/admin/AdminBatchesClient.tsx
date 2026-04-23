"use client";

import { useState, useEffect } from "react";

type BatchRow = {
  id: string;
  batch_number: number;
  opens_at: string;
  closes_at: string | null;
  status: string;
  size: number;
  notes: string | null;
  created_at: string;
};

type WaitlistEntry = {
  id: string;
  status: string;
  batch_id: string | null;
  skipped_waitlist: boolean;
  joined_at: string;
  activated_at: string | null;
};

type Props = {
  batches: BatchRow[];
  waitlistEntries: WaitlistEntry[];
  totalWaitlist: number;
  totalSkipped: number;
};

type View = "overview" | "waitlist-health";

function statusBadge(status: string) {
  const map: Record<string, string> = {
    scheduled: "bg-blue-500/15 text-blue-600",
    active: "bg-emerald-500/15 text-emerald-600",
    analyzing: "bg-amber-500/15 text-amber-600",
    complete: "bg-kal-card-muted text-kal-muted",
  };
  return (
    <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider ${map[status] ?? "bg-kal-card text-kal-muted"}`}>
      {status}
    </span>
  );
}

function fmtDate(iso: string | null): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("en-IN", {
    day: "numeric", month: "short", year: "numeric",
    hour: "2-digit", minute: "2-digit", timeZone: "Asia/Kolkata",
  });
}

export function AdminBatchesClient({ batches, waitlistEntries, totalWaitlist, totalSkipped }: Props) {
  const [view, setView] = useState<View>("overview");
  const [liveTime, setLiveTime] = useState(new Date());

  useEffect(() => {
    const id = setInterval(() => setLiveTime(new Date()), 60_000);
    return () => clearInterval(id);
  }, []);

  const activeBatch = batches.find((b) => b.status === "active");

  // Per-batch stats.
  const batchStats = batches.map((b) => {
    const entries = waitlistEntries.filter((e) => e.batch_id === b.id);
    const total = entries.length;
    const activated = entries.filter((e) => e.status === "activated" || e.status === "expired_no_convert").length;
    const skipped = entries.filter((e) => e.skipped_waitlist).length;
    return { ...b, total, activated, skipped };
  });

  const skipRate = totalWaitlist > 0 ? ((totalSkipped / totalWaitlist) * 100).toFixed(1) : "0";

  return (
    <div>
      {/* Page header */}
      <div className="mb-6 flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-kal-text">Batch Dashboard</h1>
          <p className="mt-0.5 text-sm text-kal-muted">
            Last refreshed: {liveTime.toLocaleTimeString("en-IN", { timeZone: "Asia/Kolkata" })} IST
          </p>
        </div>
        <a
          href="/admin/batches"
          className="rounded-lg border border-kal-border px-3 py-1.5 text-xs font-medium text-kal-text-secondary hover:border-kal-accent/40 hover:text-kal-accent"
        >
          Refresh
        </a>
      </div>

      {/* View tabs */}
      <div className="mb-6 flex gap-1 rounded-xl border border-kal-border bg-kal-card/50 p-1 w-fit">
        {(["overview", "waitlist-health"] as View[]).map((v) => (
          <button
            key={v}
            type="button"
            onClick={() => setView(v)}
            className={`rounded-lg px-4 py-1.5 text-sm font-medium transition-colors capitalize ${
              view === v ? "bg-kal-accent text-white shadow-sm" : "text-kal-text-secondary hover:text-kal-text"
            }`}
          >
            {v.replace("-", " ")}
          </button>
        ))}
      </div>

      {/* ── VIEW: OVERVIEW ─────────────────────────────────────────────── */}
      {view === "overview" && (
        <div>
          {/* Active batch live monitor */}
          {activeBatch && (
            <div className="mb-6 rounded-2xl border border-kal-accent/30 bg-kal-accent/[0.05] p-5">
              <div className="mb-3 flex items-center gap-2">
                <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
                <span className="text-xs font-bold uppercase tracking-wider text-kal-accent">
                  Live — Batch {activeBatch.batch_number}
                </span>
              </div>
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                {[
                  { label: "Opens at", value: fmtDate(activeBatch.opens_at) },
                  { label: "Closes at", value: fmtDate(activeBatch.closes_at) },
                  { label: "Batch size", value: activeBatch.size.toLocaleString("en-IN") },
                  { label: "Status", value: activeBatch.status },
                ].map(({ label, value }) => (
                  <div key={label} className="rounded-lg bg-kal-card/60 p-3">
                    <p className="text-[10px] font-semibold uppercase tracking-wider text-kal-muted">{label}</p>
                    <p className="mt-0.5 text-sm font-semibold text-kal-text">{value}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Batch table */}
          <div className="overflow-hidden rounded-2xl border border-kal-border">
            <table className="w-full border-collapse text-sm">
              <thead>
                <tr className="border-b border-kal-border bg-kal-card/70">
                  {["Batch", "Opens at", "Status", "Size", "Joined", "Activated", "Skipped"].map((h) => (
                    <th key={h} className="px-4 py-3 text-left text-[10px] font-bold uppercase tracking-wider text-kal-muted">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {batchStats.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-4 py-8 text-center text-sm text-kal-muted">
                      No batches yet. Create the first batch to get started.
                    </td>
                  </tr>
                ) : batchStats.map((b, i) => (
                  <tr key={b.id} className={i % 2 === 0 ? "bg-kal-card/20" : ""}>
                    <td className="px-4 py-3 font-semibold text-kal-text">#{b.batch_number}</td>
                    <td className="px-4 py-3 text-kal-text-secondary">{fmtDate(b.opens_at)}</td>
                    <td className="px-4 py-3">{statusBadge(b.status)}</td>
                    <td className="px-4 py-3 tabular-nums text-kal-text-secondary">{b.size.toLocaleString("en-IN")}</td>
                    <td className="px-4 py-3 tabular-nums text-kal-text-secondary">{b.total.toLocaleString("en-IN")}</td>
                    <td className="px-4 py-3 tabular-nums text-kal-text-secondary">{b.activated.toLocaleString("en-IN")}</td>
                    <td className="px-4 py-3 tabular-nums text-kal-text-secondary">{b.skipped.toLocaleString("en-IN")}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ── VIEW: WAITLIST HEALTH ───────────────────────────────────────── */}
      {view === "waitlist-health" && (
        <div className="space-y-6">
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
            {[
              { label: "Total on waitlist", value: totalWaitlist.toLocaleString("en-IN") },
              { label: "Skipped (₹19)", value: totalSkipped.toLocaleString("en-IN") },
              { label: "Skip rate", value: `${skipRate}%` },
              { label: "Active batches", value: batches.filter((b) => b.status === "active" || b.status === "scheduled").length },
            ].map(({ label, value }) => (
              <div key={label} className="rounded-xl border border-kal-border bg-kal-card/50 p-4">
                <p className="text-[10px] font-bold uppercase tracking-wider text-kal-muted">{label}</p>
                <p className="mt-1 text-2xl font-semibold tabular-nums text-kal-text" style={{ fontFamily: "var(--font-display)" }}>
                  {value}
                </p>
              </div>
            ))}
          </div>

          {/* Per-batch breakdown */}
          <div className="overflow-hidden rounded-2xl border border-kal-border">
            <table className="w-full border-collapse text-sm">
              <thead>
                <tr className="border-b border-kal-border bg-kal-card/70">
                  {["Batch", "Status", "Joined", "Waiting", "Activated", "Expired (no sub)", "Skipped"].map((h) => (
                    <th key={h} className="px-4 py-3 text-left text-[10px] font-bold uppercase tracking-wider text-kal-muted">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {batches.length === 0 ? (
                  <tr><td colSpan={7} className="px-4 py-8 text-center text-sm text-kal-muted">No batches.</td></tr>
                ) : batches.map((b, i) => {
                  const entries = waitlistEntries.filter((e) => e.batch_id === b.id);
                  const waiting = entries.filter((e) => e.status === "waiting").length;
                  const activated = entries.filter((e) => e.status === "activated").length;
                  const expired = entries.filter((e) => e.status === "expired_no_convert").length;
                  const skipped = entries.filter((e) => e.skipped_waitlist).length;
                  return (
                    <tr key={b.id} className={i % 2 === 0 ? "bg-kal-card/20" : ""}>
                      <td className="px-4 py-3 font-semibold text-kal-text">#{b.batch_number}</td>
                      <td className="px-4 py-3">{statusBadge(b.status)}</td>
                      <td className="px-4 py-3 tabular-nums">{entries.length}</td>
                      <td className="px-4 py-3 tabular-nums">{waiting}</td>
                      <td className="px-4 py-3 tabular-nums">{activated}</td>
                      <td className="px-4 py-3 tabular-nums">{expired}</td>
                      <td className="px-4 py-3 tabular-nums">{skipped}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

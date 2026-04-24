"use client";

import { useState, useEffect, useMemo, useRef } from "react";

import type { BatchComparisonRow } from "@/lib/admin/queries/batchComparisonQueries";
import { AdminBatchComparisonSection } from "@/components/admin/AdminBatchComparisonSection";

// ─── Types ────────────────────────────────────────────────────────────────────

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

type ProfileRow = {
  user_id: string;
  full_name: string | null;
  subscription_status: string | null;
  subscription_plan: string | null;
  subscription_end_date: string | null;
  has_used_free_trial: boolean | null;
  has_had_trial: boolean | null;
  trial_started_at: string | null;
  welcome_ai_tokens_used: number | null;
  trial_voice_seconds_used: number | null;
  payment_grace_until: string | null;
};

type WaitlistEntry = {
  id: string;
  status: string;
  batch_id: string | null;
  skipped_waitlist: boolean;
  joined_at: string;
  activated_at: string | null;
  user_id: string | null;
  position: number | null;
  contact_email: string | null;
  contact_phone: string | null;
  profile: ProfileRow | null;
};

type Payment = {
  razorpay_payment_id: string;
  user_id: string | null;
  kind: string;
  created_at: string;
};

type KPI = {
  totalProfiles: number;
  paid: number;
  trial: number;
  grace: number;
  revenueEvents: number;
};

type Engagement = {
  totalStudySessions: number;
  totalStudyHours: number;
  totalAIConversations: number;
  totalVoiceLogs: number;
  avgSessionMinutes: number;
};

type Props = {
  batches: BatchRow[];
  waitlistEntries: WaitlistEntry[];
  totalWaitlist: number;
  totalSkipped: number;
  profiles: ProfileRow[];
  payments: Payment[];
  kpi: KPI;
  engagement: Engagement;
  batchComparison?: BatchComparisonRow[];
};

type View = "overview" | "waitlist-health" | "users" | "revenue" | "engagement" | "manage";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function fmtDate(iso: string | null | undefined, short = false): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: short ? undefined : "numeric",
    hour: short ? undefined : "2-digit",
    minute: short ? undefined : "2-digit",
    timeZone: "Asia/Kolkata",
  });
}

function fmtRelDate(iso: string | null | undefined): string {
  if (!iso) return "—";
  const diff = Date.now() - new Date(iso).getTime();
  const d = Math.floor(diff / 86_400_000);
  if (d === 0) return "today";
  if (d === 1) return "yesterday";
  if (d < 30) return `${d}d ago`;
  if (d < 365) return `${Math.floor(d / 30)}mo ago`;
  return `${Math.floor(d / 365)}y ago`;
}

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, string> = {
    scheduled: "bg-blue-500/15 text-blue-600",
    active: "bg-emerald-500/15 text-emerald-600",
    analyzing: "bg-amber-500/15 text-amber-600",
    complete: "bg-kal-card-muted text-kal-muted",
    waiting: "bg-blue-500/15 text-blue-500",
    activated: "bg-emerald-500/15 text-emerald-600",
    expired_no_convert: "bg-red-500/15 text-red-500",
    skipped: "bg-purple-500/15 text-purple-600",
  };
  return (
    <span
      className={`rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider ${map[status] ?? "bg-kal-card text-kal-muted"}`}
    >
      {status.replace(/_/g, " ")}
    </span>
  );
}

function SubBadge({ status }: { status: string | null }) {
  if (!status) return <span className="text-kal-muted text-xs">—</span>;
  const map: Record<string, string> = {
    active: "bg-emerald-500/15 text-emerald-600",
    trialing: "bg-amber-500/15 text-amber-600",
    churned: "bg-red-500/15 text-red-500",
    grace: "bg-orange-500/15 text-orange-500",
  };
  return (
    <span
      className={`rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider ${map[status] ?? "bg-kal-card text-kal-muted"}`}
    >
      {status}
    </span>
  );
}

function KindBadge({ kind }: { kind: string }) {
  const map: Record<string, string> = {
    skip: "bg-purple-500/15 text-purple-600",
    annual: "bg-blue-500/15 text-blue-600",
    upgrade: "bg-emerald-500/15 text-emerald-600",
    extra_credits: "bg-amber-500/15 text-amber-600",
  };
  return (
    <span
      className={`rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider ${map[kind] ?? "bg-kal-card text-kal-muted"}`}
    >
      {kind.replace(/_/g, " ")}
    </span>
  );
}

function KpiCard({ label, value, sub }: { label: string; value: string | number; sub?: string }) {
  return (
    <div className="rounded-xl border border-kal-border bg-kal-card/50 px-4 py-3">
      <p className="text-[10px] font-bold uppercase tracking-wider text-kal-muted">{label}</p>
      <p className="mt-0.5 text-xl font-semibold tabular-nums text-kal-text" style={{ fontFamily: "var(--font-display)" }}>
        {typeof value === "number" ? value.toLocaleString("en-IN") : value}
      </p>
      {sub && <p className="mt-0.5 text-[10px] text-kal-muted">{sub}</p>}
    </div>
  );
}

const TRIAL_TOKEN_CAP = 60_000;
const TRIAL_VOICE_SEC_CAP = 300; // 5 min

// ─── Main Component ───────────────────────────────────────────────────────────

export function AdminBatchesClient({
  batches,
  waitlistEntries,
  totalWaitlist,
  totalSkipped,
  profiles,
  payments,
  kpi,
  engagement,
  batchComparison,
}: Props) {
  const [view, setView] = useState<View>("overview");
  const [liveTime, setLiveTime] = useState(new Date());
  const [userSearch, setUserSearch] = useState("");

  // Manage tab state
  const [manageBatches, setManageBatches] = useState<BatchRow[]>([...batches]);
  const [createOpensAt, setCreateOpensAt] = useState("");
  const [createSize, setCreateSize] = useState("10000");
  const [createNotes, setCreateNotes] = useState("");
  const [createBusy, setCreateBusy] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);
  const [createSuccess, setCreateSuccess] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<{ opensAt: string; size: string; notes: string; status: string }>({
    opensAt: "", size: "", notes: "", status: "",
  });
  const [editBusy, setEditBusy] = useState(false);
  const [editError, setEditError] = useState<string | null>(null);
  const [editSuccess, setEditSuccess] = useState<string | null>(null);
  const successTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

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
    // Conversion: activated users who have a paid subscription.
    const converted = entries.filter(
      (e) => (e.status === "activated") && e.profile?.subscription_status === "active"
    ).length;
    const convRate = activated > 0 ? ((converted / activated) * 100).toFixed(0) : "—";
    return { ...b, total, activated, skipped, converted, convRate };
  });

  const skipRate = totalWaitlist > 0 ? ((totalSkipped / totalWaitlist) * 100).toFixed(1) : "0";

  // Build profile lookup keyed by user_id for the revenue tab.
  const profileByUid = useMemo(
    () => new Map(profiles.map((p) => [p.user_id, p])),
    [profiles]
  );

  // Revenue KPI breakdown.
  const paymentKindCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const p of payments) {
      counts[p.kind] = (counts[p.kind] ?? 0) + 1;
    }
    return counts;
  }, [payments]);

  // Filtered users for the Users tab.
  const filteredEntries = useMemo(() => {
    const q = userSearch.trim().toLowerCase();
    if (!q) return waitlistEntries;
    return waitlistEntries.filter((e) => {
      const name = (e.profile?.full_name ?? "").toLowerCase();
      const email = (e.contact_email ?? "").toLowerCase();
      const phone = (e.contact_phone ?? "").toLowerCase();
      return name.includes(q) || email.includes(q) || phone.includes(q);
    });
  }, [waitlistEntries, userSearch]);

  async function handleCreateBatch(e: React.FormEvent) {
    e.preventDefault();
    setCreateError(null);
    setCreateSuccess(null);
    setCreateBusy(true);
    try {
      const res = await fetch("/api/admin/batches", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          opensAt: createOpensAt,
          size: parseInt(createSize, 10),
          notes: createNotes || undefined,
        }),
      });
      const data = await res.json() as { ok: boolean; error?: string; batch?: BatchRow };
      if (!data.ok) {
        setCreateError(data.error ?? "Failed to create batch.");
      } else {
        setManageBatches((prev) => [...prev, data.batch!].sort((a, b) => a.batch_number - b.batch_number));
        setCreateOpensAt("");
        setCreateSize("10000");
        setCreateNotes("");
        setCreateSuccess(`Batch #${data.batch!.batch_number} created.`);
        if (successTimer.current) clearTimeout(successTimer.current);
        successTimer.current = setTimeout(() => setCreateSuccess(null), 4000);
      }
    } catch {
      setCreateError("Network error. Please try again.");
    } finally {
      setCreateBusy(false);
    }
  }

  function startEdit(b: BatchRow) {
    setEditingId(b.id);
    setEditForm({
      opensAt: b.opens_at.slice(0, 16), // for datetime-local input
      size: String(b.size),
      notes: b.notes ?? "",
      status: b.status,
    });
    setEditError(null);
    setEditSuccess(null);
  }

  async function handleSaveEdit(batchId: string) {
    setEditBusy(true);
    setEditError(null);
    setEditSuccess(null);
    try {
      const res = await fetch(`/api/admin/batches/${batchId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          opensAt: editForm.opensAt ? new Date(editForm.opensAt).toISOString() : undefined,
          size: parseInt(editForm.size, 10),
          notes: editForm.notes || undefined,
          status: editForm.status,
        }),
      });
      const data = await res.json() as { ok: boolean; error?: string; batch?: BatchRow };
      if (!data.ok) {
        setEditError(data.error ?? "Update failed.");
      } else {
        setManageBatches((prev) =>
          prev.map((b) => (b.id === batchId ? { ...b, ...data.batch! } : b))
        );
        setEditingId(null);
        setEditSuccess(`Batch #${data.batch!.batch_number} updated.`);
        if (successTimer.current) clearTimeout(successTimer.current);
        successTimer.current = setTimeout(() => setEditSuccess(null), 4000);
      }
    } catch {
      setEditError("Network error. Please try again.");
    } finally {
      setEditBusy(false);
    }
  }

  const TABS: { id: View; label: string }[] = [
    { id: "overview", label: "Overview" },
    { id: "waitlist-health", label: "Waitlist Health" },
    { id: "users", label: "Users" },
    { id: "revenue", label: "Revenue" },
    { id: "engagement", label: "Engagement" },
    { id: "manage", label: "Manage Batches" },
  ];

  return (
    <div>
      {/* Page header */}
      <div className="mb-5 flex items-center justify-between gap-4">
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

      {/* ── Always-visible KPI bar ──────────────────────────────────────────── */}
      <div className="mb-6 grid grid-cols-3 gap-3 sm:grid-cols-6">
        <KpiCard label="Waitlist total" value={totalWaitlist} />
        <KpiCard label="Paid subscribers" value={kpi.paid} />
        <KpiCard label="Trial users" value={kpi.trial} />
        <KpiCard label="Skipped queue" value={totalSkipped} sub={`${skipRate}% skip rate`} />
        <KpiCard label="Revenue events" value={kpi.revenueEvents} />
        <KpiCard label="In grace period" value={kpi.grace} />
      </div>

      {/* View tabs */}
      <div className="mb-6 flex gap-1 flex-wrap rounded-xl border border-kal-border bg-kal-card/50 p-1 w-fit">
        {TABS.map(({ id, label }) => (
          <button
            key={id}
            type="button"
            onClick={() => setView(id)}
            className={`rounded-lg px-4 py-1.5 text-sm font-medium transition-colors ${
              view === id
                ? "bg-kal-accent text-white shadow-sm"
                : "text-kal-text-secondary hover:text-kal-text"
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {/* ── VIEW: OVERVIEW ─────────────────────────────────────────────────── */}
      {view === "overview" && (
        <div>
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

          <div className="overflow-hidden rounded-2xl border border-kal-border">
            <table className="w-full border-collapse text-sm">
              <thead>
                <tr className="border-b border-kal-border bg-kal-card/70">
                  {["Batch", "Opens at", "Status", "Size", "Joined", "Activated", "Skipped", "→ Paid %"].map((h) => (
                    <th key={h} className="px-4 py-3 text-left text-[10px] font-bold uppercase tracking-wider text-kal-muted">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {batchStats.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="px-4 py-8 text-center text-sm text-kal-muted">
                      No batches yet.
                    </td>
                  </tr>
                ) : (
                  batchStats.map((b, i) => (
                    <tr key={b.id} className={i % 2 === 0 ? "bg-kal-card/20" : ""}>
                      <td className="px-4 py-3 font-semibold text-kal-text">#{b.batch_number}</td>
                      <td className="px-4 py-3 text-kal-text-secondary">{fmtDate(b.opens_at)}</td>
                      <td className="px-4 py-3"><StatusBadge status={b.status} /></td>
                      <td className="px-4 py-3 tabular-nums text-kal-text-secondary">{b.size.toLocaleString("en-IN")}</td>
                      <td className="px-4 py-3 tabular-nums text-kal-text-secondary">{b.total.toLocaleString("en-IN")}</td>
                      <td className="px-4 py-3 tabular-nums text-kal-text-secondary">{b.activated.toLocaleString("en-IN")}</td>
                      <td className="px-4 py-3 tabular-nums text-kal-text-secondary">{b.skipped.toLocaleString("en-IN")}</td>
                      <td className="px-4 py-3 tabular-nums font-semibold text-kal-text">{b.convRate}{b.convRate !== "—" ? "%" : ""}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ── VIEW: WAITLIST HEALTH ───────────────────────────────────────────── */}
      {view === "waitlist-health" && (
        <div className="space-y-6">
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
            {[
              { label: "Total on waitlist", value: totalWaitlist },
              { label: "Skipped (₹19)", value: totalSkipped },
              { label: "Skip rate", value: `${skipRate}%` },
              { label: "Active / scheduled batches", value: batches.filter((b) => b.status === "active" || b.status === "scheduled").length },
            ].map(({ label, value }) => (
              <div key={label} className="rounded-xl border border-kal-border bg-kal-card/50 p-4">
                <p className="text-[10px] font-bold uppercase tracking-wider text-kal-muted">{label}</p>
                <p className="mt-1 text-2xl font-semibold tabular-nums text-kal-text" style={{ fontFamily: "var(--font-display)" }}>
                  {typeof value === "number" ? value.toLocaleString("en-IN") : value}
                </p>
              </div>
            ))}
          </div>

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
                ) : (
                  batches.map((b, i) => {
                    const entries = waitlistEntries.filter((e) => e.batch_id === b.id);
                    const waiting = entries.filter((e) => e.status === "waiting").length;
                    const activated = entries.filter((e) => e.status === "activated").length;
                    const expired = entries.filter((e) => e.status === "expired_no_convert").length;
                    const skipped = entries.filter((e) => e.skipped_waitlist).length;
                    return (
                      <tr key={b.id} className={i % 2 === 0 ? "bg-kal-card/20" : ""}>
                        <td className="px-4 py-3 font-semibold text-kal-text">#{b.batch_number}</td>
                        <td className="px-4 py-3"><StatusBadge status={b.status} /></td>
                        <td className="px-4 py-3 tabular-nums">{entries.length}</td>
                        <td className="px-4 py-3 tabular-nums">{waiting}</td>
                        <td className="px-4 py-3 tabular-nums">{activated}</td>
                        <td className="px-4 py-3 tabular-nums">{expired}</td>
                        <td className="px-4 py-3 tabular-nums">{skipped}</td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ── VIEW: USERS ────────────────────────────────────────────────────── */}
      {view === "users" && (
        <div className="space-y-4">
          <div className="flex items-center gap-3">
            <input
              type="search"
              placeholder="Search by name, email or phone…"
              value={userSearch}
              onChange={(e) => setUserSearch(e.target.value)}
              className="w-full max-w-md rounded-lg border border-kal-border bg-kal-card/50 px-3 py-2 text-sm text-kal-text placeholder:text-kal-muted focus:border-kal-accent/60 focus:outline-none"
            />
            <span className="text-xs text-kal-muted tabular-nums">{filteredEntries.length} / {waitlistEntries.length}</span>
          </div>

          <div className="overflow-x-auto rounded-2xl border border-kal-border">
            <table className="w-full border-collapse text-sm">
              <thead>
                <tr className="border-b border-kal-border bg-kal-card/70">
                  {["Pos", "Name", "Email", "Phone", "Status", "Trial started", "AI tokens", "Voice used", "Subscription", "Joined"].map((h) => (
                    <th key={h} className="px-3 py-3 text-left text-[10px] font-bold uppercase tracking-wider text-kal-muted whitespace-nowrap">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filteredEntries.length === 0 ? (
                  <tr>
                    <td colSpan={10} className="px-4 py-8 text-center text-sm text-kal-muted">
                      {userSearch ? "No users match your search." : "No users yet."}
                    </td>
                  </tr>
                ) : (
                  filteredEntries.map((e, i) => {
                    const p = e.profile;
                    const tokenPct = p?.welcome_ai_tokens_used
                      ? Math.min(100, Math.round((p.welcome_ai_tokens_used / TRIAL_TOKEN_CAP) * 100))
                      : 0;
                    const voicePct = p?.trial_voice_seconds_used
                      ? Math.min(100, Math.round((p.trial_voice_seconds_used / TRIAL_VOICE_SEC_CAP) * 100))
                      : 0;
                    return (
                      <tr key={e.id} className={i % 2 === 0 ? "bg-kal-card/20" : ""}>
                        <td className="px-3 py-2.5 tabular-nums font-mono text-xs text-kal-muted">
                          {e.position ?? "—"}
                        </td>
                        <td className="px-3 py-2.5 font-medium text-kal-text whitespace-nowrap">
                          {p?.full_name ?? <span className="text-kal-muted">—</span>}
                        </td>
                        <td className="px-3 py-2.5 text-kal-text-secondary text-xs max-w-[180px] truncate">
                          {e.contact_email ?? "—"}
                        </td>
                        <td className="px-3 py-2.5 text-kal-text-secondary text-xs whitespace-nowrap">
                          {e.contact_phone ?? "—"}
                        </td>
                        <td className="px-3 py-2.5"><StatusBadge status={e.status} /></td>
                        <td className="px-3 py-2.5 text-xs text-kal-muted whitespace-nowrap">
                          {fmtRelDate(p?.trial_started_at)}
                        </td>
                        <td className="px-3 py-2.5 min-w-[100px]">
                          <div className="flex items-center gap-1.5">
                            <div className="h-1.5 w-16 rounded-full bg-kal-border overflow-hidden">
                              <div
                                className={`h-full rounded-full ${tokenPct >= 90 ? "bg-red-500" : "bg-kal-accent"}`}
                                style={{ width: `${tokenPct}%` }}
                              />
                            </div>
                            <span className="text-[10px] tabular-nums text-kal-muted">{tokenPct}%</span>
                          </div>
                        </td>
                        <td className="px-3 py-2.5 min-w-[100px]">
                          <div className="flex items-center gap-1.5">
                            <div className="h-1.5 w-16 rounded-full bg-kal-border overflow-hidden">
                              <div
                                className={`h-full rounded-full ${voicePct >= 90 ? "bg-red-500" : "bg-amber-500"}`}
                                style={{ width: `${voicePct}%` }}
                              />
                            </div>
                            <span className="text-[10px] tabular-nums text-kal-muted">
                              {Math.round((p?.trial_voice_seconds_used ?? 0) / 60)}m
                            </span>
                          </div>
                        </td>
                        <td className="px-3 py-2.5">
                          <SubBadge status={p?.subscription_status ?? null} />
                        </td>
                        <td className="px-3 py-2.5 text-xs text-kal-muted whitespace-nowrap">
                          {fmtDate(e.joined_at, true)}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ── VIEW: REVENUE ──────────────────────────────────────────────────── */}
      {view === "revenue" && (
        <div className="space-y-6">
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {[
              { label: "Queue skips (₹19)", kind: "skip" },
              { label: "Annual plans", kind: "annual" },
              { label: "Upgrades", kind: "upgrade" },
              { label: "Extra credits", kind: "extra_credits" },
            ].map(({ label, kind }) => (
              <div key={kind} className="rounded-xl border border-kal-border bg-kal-card/50 p-4">
                <p className="text-[10px] font-bold uppercase tracking-wider text-kal-muted">{label}</p>
                <p className="mt-1 text-2xl font-semibold tabular-nums text-kal-text" style={{ fontFamily: "var(--font-display)" }}>
                  {(paymentKindCounts[kind] ?? 0).toLocaleString("en-IN")}
                </p>
                <p className="mt-0.5 text-[10px] text-kal-muted">payment events</p>
              </div>
            ))}
          </div>

          <div className="overflow-hidden rounded-2xl border border-kal-border">
            <div className="border-b border-kal-border bg-kal-card/70 px-4 py-2.5">
              <p className="text-xs font-semibold text-kal-text-secondary">
                Recent {payments.length} payments (newest first)
              </p>
            </div>
            <table className="w-full border-collapse text-sm">
              <thead>
                <tr className="border-b border-kal-border bg-kal-card/50">
                  {["Payment ID", "Kind", "User", "Date"].map((h) => (
                    <th key={h} className="px-4 py-3 text-left text-[10px] font-bold uppercase tracking-wider text-kal-muted">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {payments.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="px-4 py-8 text-center text-sm text-kal-muted">No payments yet.</td>
                  </tr>
                ) : (
                  payments.map((pay, i) => {
                    const profile = pay.user_id ? profileByUid.get(pay.user_id) : undefined;
                    return (
                      <tr key={pay.razorpay_payment_id} className={i % 2 === 0 ? "bg-kal-card/20" : ""}>
                        <td className="px-4 py-2.5 font-mono text-xs text-kal-muted max-w-[160px] truncate">
                          {pay.razorpay_payment_id}
                        </td>
                        <td className="px-4 py-2.5"><KindBadge kind={pay.kind} /></td>
                        <td className="px-4 py-2.5 text-xs text-kal-text-secondary">
                          {profile?.full_name ?? (pay.user_id ? pay.user_id.slice(0, 8) + "…" : "—")}
                        </td>
                        <td className="px-4 py-2.5 text-xs text-kal-muted whitespace-nowrap">
                          {fmtDate(pay.created_at)}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ── VIEW: ENGAGEMENT ───────────────────────────────────────────────── */}
      {view === "engagement" && (
        <div className="space-y-6">
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
            {[
              { label: "Study sessions", value: engagement.totalStudySessions, sub: "all time" },
              { label: "Total study hours", value: `${engagement.totalStudyHours}h`, sub: "approx." },
              { label: "AI conversations", value: engagement.totalAIConversations, sub: "PrepBrain" },
              { label: "Voice logs", value: engagement.totalVoiceLogs, sub: "timeline entries" },
              { label: "Avg session", value: `${engagement.avgSessionMinutes}m`, sub: "per study session" },
            ].map(({ label, value, sub }) => (
              <div key={label} className="rounded-xl border border-kal-border bg-kal-card/50 p-4">
                <p className="text-[10px] font-bold uppercase tracking-wider text-kal-muted">{label}</p>
                <p className="mt-1 text-2xl font-semibold tabular-nums text-kal-text" style={{ fontFamily: "var(--font-display)" }}>
                  {typeof value === "number" ? value.toLocaleString("en-IN") : value}
                </p>
                {sub && <p className="mt-0.5 text-[10px] text-kal-muted">{sub}</p>}
              </div>
            ))}
          </div>

          <div className="rounded-2xl border border-kal-border bg-kal-card/50 p-5 space-y-3">
            <p className="text-xs font-bold uppercase tracking-wider text-kal-muted">Usage overview</p>
            {[
              {
                label: "Study sessions",
                value: engagement.totalStudySessions,
                max: Math.max(engagement.totalStudySessions, 1),
                color: "bg-kal-accent",
              },
              {
                label: "AI conversations",
                value: engagement.totalAIConversations,
                max: Math.max(engagement.totalStudySessions, engagement.totalAIConversations, 1),
                color: "bg-blue-500",
              },
              {
                label: "Voice logs",
                value: engagement.totalVoiceLogs,
                max: Math.max(engagement.totalStudySessions, engagement.totalVoiceLogs, 1),
                color: "bg-amber-500",
              },
            ].map(({ label, value, max, color }) => (
              <div key={label} className="flex items-center gap-3">
                <span className="w-32 text-xs text-kal-text-secondary shrink-0">{label}</span>
                <div className="flex-1 h-2 rounded-full bg-kal-border overflow-hidden">
                  <div
                    className={`h-full rounded-full ${color}`}
                    style={{ width: `${Math.round((value / max) * 100)}%` }}
                  />
                </div>
                <span className="w-16 text-right text-xs tabular-nums text-kal-muted">
                  {value.toLocaleString("en-IN")}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── VIEW: MANAGE BATCHES ──────────────────────────────────────────── */}
      {view === "manage" && (
        <div className="space-y-8">

          {/* Create new batch */}
          <div className="rounded-2xl border border-kal-border bg-kal-card/50 p-6">
            <h2 className="mb-4 text-sm font-semibold text-kal-text">Create new batch</h2>
            <form onSubmit={handleCreateBatch} className="grid grid-cols-1 gap-4 sm:grid-cols-3">
              <div>
                <label className="mb-1 block text-xs font-semibold text-kal-muted" htmlFor="create-opens-at">
                  Opens at (IST)
                </label>
                <input
                  id="create-opens-at"
                  type="datetime-local"
                  required
                  value={createOpensAt}
                  onChange={(e) => setCreateOpensAt(e.target.value)}
                  className="w-full rounded-lg border border-kal-border bg-kal-card px-3 py-2 text-sm text-kal-text focus:border-kal-accent/50 focus:outline-none focus:ring-1 focus:ring-kal-accent/30"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-semibold text-kal-muted" htmlFor="create-size">
                  Batch size
                </label>
                <input
                  id="create-size"
                  type="number"
                  required
                  min={1}
                  max={1000000}
                  value={createSize}
                  onChange={(e) => setCreateSize(e.target.value)}
                  className="w-full rounded-lg border border-kal-border bg-kal-card px-3 py-2 text-sm text-kal-text focus:border-kal-accent/50 focus:outline-none focus:ring-1 focus:ring-kal-accent/30"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-semibold text-kal-muted" htmlFor="create-notes">
                  Notes (optional)
                </label>
                <input
                  id="create-notes"
                  type="text"
                  maxLength={2000}
                  value={createNotes}
                  onChange={(e) => setCreateNotes(e.target.value)}
                  placeholder="e.g. Spring cohort"
                  className="w-full rounded-lg border border-kal-border bg-kal-card px-3 py-2 text-sm text-kal-text placeholder:text-kal-muted focus:border-kal-accent/50 focus:outline-none focus:ring-1 focus:ring-kal-accent/30"
                />
              </div>
              <div className="sm:col-span-3 flex items-center gap-4">
                <button
                  type="submit"
                  disabled={createBusy}
                  className="rounded-lg bg-kal-accent px-5 py-2 text-sm font-semibold text-white transition hover:brightness-105 disabled:opacity-60"
                >
                  {createBusy ? "Creating…" : "Create batch"}
                </button>
                {createError && <p className="text-xs text-red-500">{createError}</p>}
                {createSuccess && <p className="text-xs text-emerald-500">{createSuccess}</p>}
              </div>
            </form>
          </div>

          {/* Edit existing batches */}
          <div>
            <h2 className="mb-3 text-sm font-semibold text-kal-text">All batches</h2>
            {editSuccess && (
              <p className="mb-3 text-xs text-emerald-500">{editSuccess}</p>
            )}
            <div className="overflow-hidden rounded-2xl border border-kal-border">
              <table className="w-full border-collapse text-sm">
                <thead>
                  <tr className="border-b border-kal-border bg-kal-card/70">
                    {["Batch", "Opens at", "Status", "Size", "Notes", "Actions"].map((h) => (
                      <th key={h} className="px-4 py-3 text-left text-[10px] font-bold uppercase tracking-wider text-kal-muted whitespace-nowrap">
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {manageBatches.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="px-4 py-8 text-center text-sm text-kal-muted">
                        No batches yet. Create one above.
                      </td>
                    </tr>
                  ) : (
                    manageBatches.map((b, i) => (
                      <tr key={b.id} className={i % 2 === 0 ? "bg-kal-card/20" : ""}>
                        {editingId === b.id ? (
                          <>
                            <td className="px-4 py-2 font-semibold text-kal-text">#{b.batch_number}</td>
                            <td className="px-4 py-2">
                              <input
                                type="datetime-local"
                                value={editForm.opensAt}
                                onChange={(e) => setEditForm((f) => ({ ...f, opensAt: e.target.value }))}
                                className="rounded-lg border border-kal-border bg-kal-card px-2 py-1 text-xs text-kal-text focus:border-kal-accent/50 focus:outline-none"
                              />
                            </td>
                            <td className="px-4 py-2">
                              <select
                                value={editForm.status}
                                onChange={(e) => setEditForm((f) => ({ ...f, status: e.target.value }))}
                                className="rounded-lg border border-kal-border bg-kal-card px-2 py-1 text-xs text-kal-text focus:border-kal-accent/50 focus:outline-none"
                              >
                                <option value="scheduled">scheduled</option>
                                <option value="active">active (opens batch)</option>
                                <option value="analyzing">analyzing</option>
                                <option value="complete">complete</option>
                              </select>
                            </td>
                            <td className="px-4 py-2">
                              <input
                                type="number"
                                min={1}
                                value={editForm.size}
                                onChange={(e) => setEditForm((f) => ({ ...f, size: e.target.value }))}
                                className="w-24 rounded-lg border border-kal-border bg-kal-card px-2 py-1 text-xs text-kal-text focus:border-kal-accent/50 focus:outline-none"
                              />
                            </td>
                            <td className="px-4 py-2">
                              <input
                                type="text"
                                maxLength={200}
                                value={editForm.notes}
                                onChange={(e) => setEditForm((f) => ({ ...f, notes: e.target.value }))}
                                placeholder="Notes"
                                className="w-full min-w-[120px] rounded-lg border border-kal-border bg-kal-card px-2 py-1 text-xs text-kal-text placeholder:text-kal-muted focus:border-kal-accent/50 focus:outline-none"
                              />
                            </td>
                            <td className="px-4 py-2">
                              <div className="flex items-center gap-2">
                                <button
                                  type="button"
                                  disabled={editBusy}
                                  onClick={() => void handleSaveEdit(b.id)}
                                  className="rounded-lg bg-kal-accent px-3 py-1 text-xs font-semibold text-white disabled:opacity-60 hover:brightness-105"
                                >
                                  {editBusy ? "Saving…" : "Save"}
                                </button>
                                <button
                                  type="button"
                                  onClick={() => setEditingId(null)}
                                  className="rounded-lg border border-kal-border px-3 py-1 text-xs font-medium text-kal-text-secondary hover:text-kal-text"
                                >
                                  Cancel
                                </button>
                              </div>
                              {editError && <p className="mt-1 text-[10px] text-red-500">{editError}</p>}
                            </td>
                          </>
                        ) : (
                          <>
                            <td className="px-4 py-3 font-semibold text-kal-text">#{b.batch_number}</td>
                            <td className="px-4 py-3 text-xs text-kal-text-secondary whitespace-nowrap">{fmtDate(b.opens_at)}</td>
                            <td className="px-4 py-3"><StatusBadge status={b.status} /></td>
                            <td className="px-4 py-3 tabular-nums text-xs text-kal-text-secondary">{b.size.toLocaleString("en-IN")}</td>
                            <td className="px-4 py-3 text-xs text-kal-muted max-w-[180px] truncate" title={b.notes ?? undefined}>{b.notes ?? "—"}</td>
                            <td className="px-4 py-3">
                              <button
                                type="button"
                                onClick={() => startEdit(b)}
                                className="rounded-lg border border-kal-border px-3 py-1 text-xs font-medium text-kal-text-secondary hover:border-kal-accent/40 hover:text-kal-accent"
                              >
                                Edit
                              </button>
                            </td>
                          </>
                        )}
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>

        </div>
      )}

      {batchComparison && batchComparison.length > 0 && (
        <AdminBatchComparisonSection rows={batchComparison} />
      )}
    </div>
  );
}

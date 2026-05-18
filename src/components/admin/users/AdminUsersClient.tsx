"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import type { UserListRow, UserLookupBundle } from "@/lib/admin/queries/userLookupQueries";
import { formatVoiceDuration } from "@/lib/admin/queries/journeyQueries";
import { adminSegmentLabelFromProfile } from "@/lib/profileTrackSegment";

const PER_PAGE = 25;

function formatProfileNumber(value: unknown): string {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value.toLocaleString("en-IN");
  }
  return "—";
}

function formatProfileString(value: unknown): string {
  if (typeof value === "string" && value.trim()) return value;
  return "—";
}

function SubscriptionUsagePanel({ profile }: { profile: Record<string, unknown> | null }) {
  if (!profile) {
    return (
      <div className="rounded-lg border border-kal-border/60 bg-kal-card/30 px-3 py-2.5 text-sm text-kal-muted">
        No profile row.
      </div>
    );
  }

  const rows: { label: string; value: string }[] = [
    { label: "Subscription", value: formatProfileString(profile.subscription_status) },
    { label: "Plan", value: formatProfileString(profile.subscription_plan) },
    { label: "Tier", value: formatProfileString(profile.subscription_tier) },
    { label: "Ends", value: formatProfileString(profile.subscription_end_date) },
    { label: "Payment grace until", value: formatProfileString(profile.payment_grace_until) },
    { label: "Usage reset date", value: formatProfileString(profile.usage_reset_date) },
    { label: "Photo scans (this month)", value: formatProfileNumber(profile.photo_scans_used_this_month) },
    { label: "Voice minutes (this month)", value: formatProfileNumber(profile.voice_minutes_used_this_month) },
    { label: "Welcome AI tokens used", value: formatProfileNumber(profile.welcome_ai_tokens_used) },
    { label: "Monthly AI tokens used", value: formatProfileNumber(profile.ai_tokens_used) },
    { label: "Bonus photo scans", value: formatProfileNumber(profile.bonus_photo_scans) },
    { label: "Bonus voice minutes", value: formatProfileNumber(profile.bonus_voice_minutes) },
    { label: "Bonus AI tokens", value: formatProfileNumber(profile.bonus_ai_tokens) },
    { label: "Trial photo scans used", value: formatProfileNumber(profile.trial_photo_scans_used) },
    { label: "Trial voice seconds used", value: formatProfileNumber(profile.trial_voice_seconds_used) },
    { label: "Has used free trial", value: typeof profile.has_used_free_trial === "boolean" ? (profile.has_used_free_trial ? "Yes" : "No") : "—" },
    { label: "Has had trial", value: typeof profile.has_had_trial === "boolean" ? (profile.has_had_trial ? "Yes" : "No") : "—" },
  ];

  return (
    <div className="rounded-lg border border-kal-border/60 bg-kal-card/30 px-3 py-2.5 text-sm">
      <p className="text-[10px] font-bold uppercase text-kal-muted">Subscription / quota (profile)</p>
      <dl className="mt-2 grid gap-x-4 gap-y-2 sm:grid-cols-2 text-xs">
        {rows.map((r) => (
          <div key={r.label}>
            <dt className="text-kal-muted">{r.label}</dt>
            <dd className="font-medium text-kal-text">{r.value}</dd>
          </div>
        ))}
      </dl>
    </div>
  );
}

function AiProviderUsagePanel({
  ai,
}: {
  ai: UserLookupBundle["aiUsage"];
}) {
  const fmt = (n: number) => n.toLocaleString("en-IN");
  return (
    <div className="rounded-lg border border-kal-border/60 bg-kal-card/30 px-3 py-2.5 text-sm">
      <p className="text-[10px] font-bold uppercase text-kal-muted">AI provider usage</p>
      <p className="mt-1 text-[11px] text-kal-muted">
        PrepBrain = billed <span className="font-mono">estimate</span> on finalized reservations; voice = Groq in+out
        tokens. Same ~40d rolling window as Admin → AI usage.
      </p>
      <div className="mt-2 overflow-x-auto">
        <table className="w-full min-w-[320px] border-collapse text-left text-xs">
          <thead>
            <tr className="border-b border-kal-border text-[10px] font-bold uppercase tracking-wider text-kal-muted">
              <th className="py-1.5 pr-2">Source</th>
              <th className="py-1.5 pr-2">7d</th>
              <th className="py-1.5 pr-2">30d</th>
              <th className="py-1.5">Window</th>
            </tr>
          </thead>
          <tbody className="text-kal-text">
            <tr className="border-b border-kal-border/50">
              <td className="py-1.5 pr-2 font-medium">PrepBrain billed tok</td>
              <td className="py-1.5 pr-2 tabular-nums">{fmt(ai.prepbrainBilledTokens7d)}</td>
              <td className="py-1.5 pr-2 tabular-nums">{fmt(ai.prepbrainBilledTokens30d)}</td>
              <td className="py-1.5 tabular-nums">{fmt(ai.prepbrainBilledTokensWindow)}</td>
            </tr>
            <tr className="border-b border-kal-border/50">
              <td className="py-1.5 pr-2 font-medium">Voice tokens</td>
              <td className="py-1.5 pr-2 tabular-nums">{fmt(ai.voiceTokens7d)}</td>
              <td className="py-1.5 pr-2 tabular-nums">{fmt(ai.voiceTokens30d)}</td>
              <td className="py-1.5 tabular-nums">{fmt(ai.voiceTokensWindow)}</td>
            </tr>
            <tr>
              <td className="py-1.5 pr-2 font-medium text-kal-muted">Counts (30d)</td>
              <td className="py-1.5 pr-2 text-kal-muted" colSpan={2}>
                PrepBrain reservations: <span className="tabular-nums text-kal-text">{ai.reservationCount30d}</span>
              </td>
              <td className="py-1.5 text-kal-muted">
                Voice calls: <span className="tabular-nums text-kal-text">{ai.voiceCallCount30d}</span>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
}

function profileTrackSummary(profile: Record<string, unknown> | null): string {
  if (!profile) return "—";
  const label = adminSegmentLabelFromProfile({
    selected_track: typeof profile.selected_track === "string" ? profile.selected_track : null,
    target_exam: typeof profile.target_exam === "string" ? profile.target_exam : null,
    primary_exam: typeof profile.primary_exam === "string" ? profile.primary_exam : null,
  });
  const enabled = profile.enabled_exams_in_track;
  if (Array.isArray(enabled) && enabled.length > 1) {
    return `${label} · ${enabled.length} exams in track`;
  }
  return label;
}

export function AdminUsersClient({
  initial,
  initialQ,
  listData,
  isListView,
  listPage,
}: {
  initial: UserLookupBundle[];
  initialQ: string;
  listData: { rows: UserListRow[]; total: number };
  isListView: boolean;
  listPage: number;
}) {
  const router = useRouter();
  const [q, setQ] = useState(initialQ);
  const [busy, setBusy] = useState<string | null>(null);

  function search(e: React.FormEvent) {
    e.preventDefault();
    const params = new URLSearchParams();
    if (q.trim()) params.set("q", q.trim());
    router.push(`/admin/users?${params.toString()}`);
  }

  function goToListPage(page: number) {
    router.push(`/admin/users?view=list&page=${page}`);
  }

  async function act(
    userId: string,
    action: "extend_trial" | "reset_ai_tokens" | "add_note" | "log_refund" | "delete_user",
    extra?: Record<string, unknown>,
  ) {
    setBusy(`${userId}:${action}`);
    try {
      const res = await fetch("/api/admin/user-action", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, userId, ...extra }),
      });
      const j = (await res.json()) as { ok?: boolean; error?: string };
      if (!j.ok) alert(j.error ?? "Failed");
      else if (action === "delete_user") router.push("/admin/users");
      else router.refresh();
    } finally {
      setBusy(null);
    }
  }

  const totalPages = Math.max(1, Math.ceil(listData.total / PER_PAGE));

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-kal-text">Users</h1>
          <p className="mt-1 text-sm text-kal-muted">Search by email, name, or phone — or browse all users.</p>
        </div>
        <div className="flex rounded-lg border border-kal-border overflow-hidden text-sm">
          <button
            type="button"
            onClick={() => router.push("/admin/users")}
            className={`px-4 py-1.5 ${!isListView ? "bg-kal-accent text-white" : "text-kal-muted hover:bg-kal-card/60"}`}
          >
            Search
          </button>
          <button
            type="button"
            onClick={() => router.push("/admin/users?view=list")}
            className={`px-4 py-1.5 border-l border-kal-border ${isListView ? "bg-kal-accent text-white" : "text-kal-muted hover:bg-kal-card/60"}`}
          >
            All Users {listData.total > 0 && isListView ? `(${listData.total})` : ""}
          </button>
        </div>
      </div>

      {!isListView && (
        <>
          <form onSubmit={search} className="flex gap-2 max-w-xl">
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="email, name, or phone…"
              className="flex-1 min-w-0 rounded-lg border border-kal-border bg-kal-card/50 px-3 py-2 text-sm"
            />
            <button type="submit" className="rounded-lg bg-kal-accent px-4 py-2 text-sm font-medium text-white">
              Search
            </button>
          </form>

          {initial.length === 0 && initialQ && (
            <p className="text-sm text-kal-muted">No users found for &quot;{initialQ}&quot;.</p>
          )}

          {initial.map((u) => (
            <UserCard key={u.userId} u={u} busy={busy} onAct={act} />
          ))}
        </>
      )}

      {isListView && (
        <div className="space-y-4">
          <div className="overflow-x-auto rounded-xl border border-kal-border">
            <table className="w-full min-w-[580px] text-sm">
              <thead>
                <tr className="border-b border-kal-border bg-kal-card/60 text-left text-[11px] uppercase tracking-wide text-kal-muted">
                  <th className="px-4 py-2.5 min-w-[120px]">Name</th>
                  <th className="px-4 py-2.5 min-w-[100px]">Track / exam</th>
                  <th className="px-4 py-2.5 min-w-[100px] whitespace-nowrap">Phone</th>
                  <th className="px-4 py-2.5 whitespace-nowrap">Trial started</th>
                  <th className="px-4 py-2.5">Trial</th>
                  <th className="px-4 py-2.5 min-w-[80px]">Plan</th>
                  <th className="px-4 py-2.5"></th>
                </tr>
              </thead>
              <tbody>
                {listData.rows.length === 0 && (
                  <tr>
                    <td colSpan={7} className="px-4 py-6 text-center text-sm text-kal-muted">No users found.</td>
                  </tr>
                )}
                {listData.rows.map((row) => (
                  <tr key={row.userId} className="border-b border-kal-border/50 last:border-0 hover:bg-kal-card/30">
                    <td className="px-4 py-2.5 min-w-[120px]">
                      <p className="font-medium text-kal-text whitespace-nowrap">{row.fullName ?? <span className="text-kal-muted italic">—</span>}</p>
                      <p className="text-[10px] font-mono text-kal-muted">{row.userId.slice(0, 8)}…</p>
                    </td>
                    <td className="px-4 py-2.5 text-xs text-kal-text-secondary max-w-[9rem] truncate" title={row.trackOrExam}>
                      {row.trackOrExam}
                    </td>
                    <td className="px-4 py-2.5 text-kal-muted whitespace-nowrap">{row.phone ?? "—"}</td>
                    <td className="px-4 py-2.5 text-kal-muted whitespace-nowrap">
                      {row.trialStartedAt ? (
                        <>
                          <span>{new Date(row.trialStartedAt).toLocaleDateString()}</span>
                          <p className="text-[10px] text-kal-muted mt-0.5">
                            {new Date(row.trialStartedAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                          </p>
                        </>
                      ) : "—"}
                    </td>
                    <td className="px-4 py-2.5">
                      {row.hasHadTrial
                        ? <span className="text-xs text-emerald-600 font-medium">Yes</span>
                        : <span className="text-xs text-kal-muted">—</span>}
                    </td>
                    <td className="px-4 py-2.5">
                      {row.subscriptionStatus
                        ? (
                          <span className={`text-xs font-medium ${row.subscriptionStatus === "active" ? "text-emerald-600" : "text-kal-muted"}`}>
                            {row.subscriptionStatus}{row.subscriptionPlan ? ` · ${row.subscriptionPlan}` : ""}
                          </span>
                        )
                        : <span className="text-xs text-kal-muted">—</span>}
                    </td>
                    <td className="px-4 py-2.5 text-right">
                      <button
                        type="button"
                        onClick={() => router.push(`/admin/users?q=${row.userId}`)}
                        className="rounded border border-kal-border px-2.5 py-1 text-xs text-kal-accent hover:bg-kal-card/60"
                      >
                        Details
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-y-2 text-sm text-kal-muted">
            <p>Page {listPage} of {totalPages} · {listData.total} users total</p>
            <div className="flex gap-2">
              <button
                type="button"
                disabled={listPage <= 1}
                onClick={() => goToListPage(listPage - 1)}
                className="rounded border border-kal-border px-3 py-1 text-xs disabled:opacity-40"
              >
                ← Prev
              </button>
              <button
                type="button"
                disabled={listPage >= totalPages}
                onClick={() => goToListPage(listPage + 1)}
                className="rounded border border-kal-border px-3 py-1 text-xs disabled:opacity-40"
              >
                Next →
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function UserCard({
  u,
  busy,
  onAct,
}: {
  u: UserLookupBundle;
  busy: string | null;
  onAct: (userId: string, action: "extend_trial" | "reset_ai_tokens" | "add_note" | "log_refund" | "delete_user", extra?: Record<string, unknown>) => void;
}) {
  const [note, setNote] = useState("");
  const [refund, setRefund] = useState("");
  const [deleteStage, setDeleteStage] = useState<"idle" | "confirm">("idle");
  const [deleteConfirmText, setDeleteConfirmText] = useState("");

  return (
    <div className="rounded-2xl border border-kal-border bg-kal-card/40 p-5 space-y-3">
      <div className="flex flex-wrap justify-between gap-2">
        <div>
          <p className="font-semibold text-kal-text">{u.email ?? u.userId}</p>
          <p className="text-xs text-kal-muted font-mono">{u.userId}</p>
        </div>
        <div className="text-xs text-kal-muted text-right">
          <div>Created: {u.createdAt ?? "—"}</div>
          <div>Last sign-in: {u.lastSignIn ?? "—"}</div>
        </div>
      </div>

      <div className="rounded-lg border border-kal-border/60 bg-kal-card/30 px-3 py-2.5 text-sm">
        <p className="text-[10px] font-bold uppercase text-kal-muted">Exam track / goal</p>
        <p className="mt-0.5 font-medium text-kal-text">
          {profileTrackSummary(u.profile)}
        </p>
      </div>

      {u.journey ? (
        <div className="rounded-lg border border-kal-border/60 bg-kal-card/30 px-3 py-2.5 text-sm">
          <p className="text-[10px] font-bold uppercase text-kal-muted">Journey</p>
          <dl className="mt-2 grid gap-x-4 gap-y-1.5 sm:grid-cols-2 text-xs">
            <div>
              <dt className="text-kal-muted">Segment</dt>
              <dd className="font-medium capitalize">{u.journey.segment.replace("_", " ")}</dd>
            </div>
            <div>
              <dt className="text-kal-muted">Activated</dt>
              <dd className="font-medium">{u.journey.activated ? "Yes" : "No"}</dd>
            </div>
            <div>
              <dt className="text-kal-muted">Last active</dt>
              <dd className="font-medium">
                {u.journey.lastActiveAt
                  ? new Date(u.journey.lastActiveAt).toLocaleString("en-IN")
                  : "—"}
              </dd>
            </div>
            <div>
              <dt className="text-kal-muted">Sessions</dt>
              <dd className="font-medium tabular-nums">{u.journey.totalSessions}</dd>
            </div>
            <div>
              <dt className="text-kal-muted">Streak</dt>
              <dd className="font-medium tabular-nums">{u.journey.currentStreak}d</dd>
            </div>
            <div>
              <dt className="text-kal-muted">Active time (7d)</dt>
              <dd className="font-medium tabular-nums">
                {Math.round(u.journey.studySeconds7d / 60)} min
              </dd>
            </div>
            <div>
              <dt className="text-kal-muted">Returned D1 / D7</dt>
              <dd className="font-medium">
                {u.journey.returnedDay1 ? "D1 ✓" : "D1 —"} · {u.journey.returnedDay7 ? "D7 ✓" : "D7 —"}
              </dd>
            </div>
            <div>
              <dt className="text-kal-muted">Voice (7d)</dt>
              <dd className="font-medium tabular-nums">
                {formatVoiceDuration(u.journey.voiceSeconds7d)}
              </dd>
            </div>
            <div>
              <dt className="text-kal-muted">Voice instructions (7d)</dt>
              <dd className="font-medium tabular-nums">{u.journey.voiceInstructions7d}</dd>
            </div>
          </dl>
        </div>
      ) : null}

      <SubscriptionUsagePanel profile={u.profile} />
      <AiProviderUsagePanel ai={u.aiUsage} />

      <div className="grid gap-3 md:grid-cols-2 text-sm">
        <div>
          <p className="text-[10px] font-bold uppercase text-kal-muted">Mastermind threads</p>
          <p>{u.prepbrainConversations}</p>
        </div>
        <div>
          <p className="text-[10px] font-bold uppercase text-kal-muted">Payments</p>
          <ul className="text-xs space-y-0.5 max-h-24 overflow-y-auto">
            {u.payments.map((p) => (
              <li key={p.razorpay_payment_id}>
                {p.kind} · {p.created_at}
              </li>
            ))}
          </ul>
        </div>
      </div>

      <details className="text-xs">
        <summary className="cursor-pointer text-kal-accent">Raw profile JSON</summary>
        <pre className="mt-2 max-h-48 overflow-auto rounded bg-kal-page p-2 text-[10px]">
          {JSON.stringify(u.profile, null, 2)}
        </pre>
      </details>

      <div className="flex flex-wrap gap-2 border-t border-kal-border pt-3">
        <button
          type="button"
          disabled={busy !== null}
          onClick={() => onAct(u.userId, "extend_trial", { extendTrialDays: 2 })}
          className="rounded-md border border-kal-border px-2 py-1 text-xs"
        >
          +2d trial
        </button>
        <button
          type="button"
          disabled={busy !== null}
          onClick={() => onAct(u.userId, "reset_ai_tokens")}
          className="rounded-md border border-kal-border px-2 py-1 text-xs"
        >
          Reset AI tokens
        </button>
      </div>

      <div className="flex flex-wrap items-end gap-2">
        <div className="flex-1 min-w-[200px]">
          <label className="text-[10px] font-bold uppercase text-kal-muted">Note</label>
          <textarea
            value={note}
            onChange={(e) => setNote(e.target.value)}
            rows={2}
            className="mt-1 w-full rounded border border-kal-border bg-kal-card/50 px-2 py-1 text-xs"
          />
        </div>
        <button
          type="button"
          disabled={busy !== null}
          onClick={() => onAct(u.userId, "add_note", { note })}
          className="rounded-md bg-kal-accent px-2 py-1 text-xs text-white"
        >
          Save note
        </button>
      </div>

      <div className="flex flex-wrap items-end gap-2">
        <input
          type="number"
          placeholder="Refund ₹"
          value={refund}
          onChange={(e) => setRefund(e.target.value)}
          className="w-28 rounded border border-kal-border bg-kal-card/50 px-2 py-1 text-xs"
        />
        <button
          type="button"
          disabled={busy !== null}
          onClick={() =>
            onAct(u.userId, "log_refund", { refundInr: Number(refund) || 0, note: note || "manual refund log" })
          }
          className="rounded-md border border-amber-500/50 px-2 py-1 text-xs text-amber-700"
        >
          Log refund
        </button>
      </div>

      {u.supportNotes.length > 0 && (
        <div className="text-xs space-y-1">
          <p className="font-bold uppercase text-kal-muted">Support notes</p>
          {u.supportNotes.map((n, i) => (
            <p key={i} className="border-l-2 border-kal-border pl-2">
              {n.created_at}: {n.note}
            </p>
          ))}
        </div>
      )}

      <div className="border-t border-red-500/20 pt-3 space-y-3">
        {deleteStage === "idle" && (
          <button
            type="button"
            disabled={busy !== null}
            onClick={() => setDeleteStage("confirm")}
            className="rounded-md border border-red-500/50 px-3 py-1.5 text-xs font-medium text-red-600 hover:bg-red-50/10 disabled:opacity-50"
          >
            Delete account
          </button>
        )}

        {deleteStage === "confirm" && (
          <div className="rounded-lg border border-red-500/40 bg-red-500/5 p-3 space-y-3">
            <p className="text-xs font-semibold text-red-600">This will permanently delete all data for this account and cannot be undone.</p>
            <p className="text-xs text-kal-muted">
              Type <span className="font-mono font-bold text-kal-text">{u.email ?? u.userId}</span> to confirm.
            </p>
            <input
              type="text"
              value={deleteConfirmText}
              onChange={(e) => setDeleteConfirmText(e.target.value)}
              placeholder={u.email ?? u.userId}
              className="w-full rounded border border-red-500/40 bg-kal-card/50 px-2 py-1 text-xs font-mono"
            />
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                disabled={busy !== null || deleteConfirmText !== (u.email ?? u.userId)}
                onClick={() => {
                  onAct(u.userId, "delete_user", { targetEmail: u.email ?? "" });
                  setDeleteStage("idle");
                  setDeleteConfirmText("");
                }}
                className="rounded-md bg-red-600 px-3 py-1.5 text-xs font-medium text-white disabled:opacity-40"
              >
                {busy === `${u.userId}:delete_user` ? "Deleting…" : "Yes, delete permanently"}
              </button>
              <button
                type="button"
                disabled={busy !== null}
                onClick={() => { setDeleteStage("idle"); setDeleteConfirmText(""); }}
                className="rounded-md border border-kal-border px-3 py-1.5 text-xs text-kal-muted"
              >
                Cancel
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

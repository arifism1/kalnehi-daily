"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import type { UserLookupBundle } from "@/lib/admin/queries/userLookupQueries";

export function AdminUsersClient({ initial, initialQ }: { initial: UserLookupBundle[]; initialQ: string }) {
  const router = useRouter();
  const [q, setQ] = useState(initialQ);
  const [busy, setBusy] = useState<string | null>(null);

  function search(e: React.FormEvent) {
    e.preventDefault();
    const params = new URLSearchParams();
    if (q.trim()) params.set("q", q.trim());
    router.push(`/admin/users?${params.toString()}`);
  }

  async function act(
    userId: string,
    action: "extend_trial" | "reset_ai_tokens" | "add_note" | "log_refund",
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
      else router.refresh();
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-kal-text">User lookup</h1>
        <p className="mt-1 text-sm text-kal-muted">Search by email (exact), name, or phone fragment.</p>
      </div>

      <form onSubmit={search} className="flex gap-2 max-w-xl">
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="email, name, or phone…"
          className="flex-1 rounded-lg border border-kal-border bg-kal-card/50 px-3 py-2 text-sm"
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
  onAct: (userId: string, action: "extend_trial" | "reset_ai_tokens" | "add_note" | "log_refund", extra?: Record<string, unknown>) => void;
}) {
  const [note, setNote] = useState("");
  const [refund, setRefund] = useState("");

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

      <div className="grid gap-3 md:grid-cols-2 text-sm">
        <div>
          <p className="text-[10px] font-bold uppercase text-kal-muted">PrepBrain threads</p>
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
    </div>
  );
}

"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

import type { AdminDpdpBreachRow } from "@/lib/admin/dpdpQueries";

export function AdminDpdpBreachClient({ initial }: { initial: AdminDpdpBreachRow[] }) {
  const router = useRouter();
  const [rows, setRows] = useState(initial);
  const [description, setDescription] = useState("");
  const [userIdsRaw, setUserIdsRaw] = useState("");
  const [boardNotified, setBoardNotified] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const submit = async (notifyPrincipals: boolean) => {
    setBusy(true);
    setError(null);
    setSuccess(null);
    try {
      const userIds = userIdsRaw
        .split(/[\s,]+/)
        .map((s) => s.trim())
        .filter(Boolean);

      const res = await fetch("/api/admin/dpdp/breach-notify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          description: description.trim(),
          userIds,
          boardNotified,
          notifyPrincipals,
        }),
      });
      const payload = (await res.json().catch(() => ({}))) as {
        ok?: boolean;
        error?: string;
        incidentId?: string;
        emailsSent?: number;
      };
      if (!res.ok || !payload.ok) {
        throw new Error(payload.error ?? "Could not create incident.");
      }
      setSuccess(
        `Incident ${payload.incidentId} recorded.${notifyPrincipals ? ` ${payload.emailsSent ?? 0} emails sent.` : ""}`,
      );
      setDescription("");
      setUserIdsRaw("");
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-4 p-4 lg:p-6">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h1 className="text-xl font-semibold text-kal-text">Breach notifications</h1>
          <p className="text-sm text-kal-text-secondary">
            Log incidents and notify affected Data Principals (DPDP Rule 7)
          </p>
        </div>
        <Link
          href="/admin/dpdp"
          className="rounded-lg border border-kal-border px-3 py-1.5 text-sm font-medium hover:bg-kal-card"
        >
          ← Rights requests
        </Link>
      </div>

      {(error || success) && (
        <p
          className={
            error
              ? "rounded-lg border border-kal-danger-border bg-kal-danger-soft px-3 py-2 text-sm text-kal-danger-text"
              : "rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-3 py-2 text-sm text-emerald-700"
          }
        >
          {error ?? success}
        </p>
      )}

      <div className="max-w-xl space-y-3 rounded-xl border border-kal-border p-4">
        <label className="block text-sm font-medium">
          Breach description (plain language)
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={5}
            className="mt-1 w-full rounded-lg border border-kal-border bg-kal-input-bg px-3 py-2 text-sm"
            placeholder="What happened, possible impact, steps taken…"
          />
        </label>
        <label className="block text-sm font-medium">
          Affected user IDs (UUIDs, comma or newline separated)
          <textarea
            value={userIdsRaw}
            onChange={(e) => setUserIdsRaw(e.target.value)}
            rows={4}
            className="mt-1 w-full rounded-lg border border-kal-border bg-kal-input-bg px-3 py-2 font-mono text-xs"
          />
        </label>
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={boardNotified}
            onChange={(e) => setBoardNotified(e.target.checked)}
          />
          Data Protection Board already notified
        </label>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            disabled={busy}
            onClick={() => void submit(false)}
            className="rounded-lg border border-kal-border px-3 py-2 text-sm font-medium disabled:opacity-50"
          >
            Save draft incident
          </button>
          <button
            type="button"
            disabled={busy}
            onClick={() => void submit(true)}
            className="kal-btn-accent rounded-lg px-3 py-2 text-sm font-semibold disabled:opacity-50"
          >
            Notify affected users
          </button>
        </div>
      </div>

      <div className="overflow-x-auto rounded-xl border border-kal-border">
        <table className="min-w-full text-left text-sm">
          <thead className="border-b border-kal-border bg-kal-card/50 text-xs uppercase text-kal-text-secondary">
            <tr>
              <th className="px-3 py-2">Reported</th>
              <th className="px-3 py-2">Affected</th>
              <th className="px-3 py-2">Status</th>
              <th className="px-3 py-2">Board</th>
              <th className="px-3 py-2">Principals</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.id} className="border-b border-kal-border/60">
                <td className="px-3 py-2 text-xs">
                  {new Date(r.reported_at).toLocaleString("en-IN")}
                </td>
                <td className="px-3 py-2">{r.affected_count}</td>
                <td className="px-3 py-2">{r.status}</td>
                <td className="px-3 py-2 text-xs">
                  {r.board_notified_at
                    ? new Date(r.board_notified_at).toLocaleDateString("en-IN")
                    : "—"}
                </td>
                <td className="px-3 py-2 text-xs">
                  {r.principal_notified_at
                    ? new Date(r.principal_notified_at).toLocaleDateString("en-IN")
                    : "—"}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

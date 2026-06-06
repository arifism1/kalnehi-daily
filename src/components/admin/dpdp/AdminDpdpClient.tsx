"use client";

import clsx from "clsx";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

import type { AdminDpdpRightsRow } from "@/lib/admin/dpdpQueries";

export function AdminDpdpClient({ initial }: { initial: AdminDpdpRightsRow[] }) {
  const router = useRouter();
  const [rows, setRows] = useState(initial);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const now = Date.now();

  const updateStatus = async (
    id: string,
    status: "in_progress" | "resolved" | "rejected",
  ) => {
    setBusyId(id);
    setError(null);
    try {
      const res = await fetch("/api/admin/dpdp/rights-request", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ id, status }),
      });
      const payload = (await res.json().catch(() => ({}))) as {
        ok?: boolean;
        error?: string;
      };
      if (!res.ok || !payload.ok) {
        throw new Error(payload.error ?? "Update failed.");
      }
      setRows((prev) =>
        prev.map((r) =>
          r.id === id
            ? {
                ...r,
                status,
                resolved_at:
                  status === "resolved" || status === "rejected"
                    ? new Date().toISOString()
                    : r.resolved_at,
              }
            : r,
        ),
      );
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Update failed.");
    } finally {
      setBusyId(null);
    }
  };

  return (
    <div className="space-y-4 p-4 lg:p-6">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h1 className="text-xl font-semibold text-kal-text">DPDP compliance</h1>
          <p className="text-sm text-kal-text-secondary">
            Data Principal rights requests queue
          </p>
        </div>
        <Link
          href="/admin/dpdp/breach"
          className="rounded-lg border border-kal-border px-3 py-1.5 text-sm font-medium hover:bg-kal-card"
        >
          Breach notifications →
        </Link>
      </div>

      {error && (
        <p className="rounded-lg border border-kal-danger-border bg-kal-danger-soft px-3 py-2 text-sm text-kal-danger-text">
          {error}
        </p>
      )}

      <div className="overflow-x-auto rounded-xl border border-kal-border">
        <table className="min-w-full text-left text-sm">
          <thead className="border-b border-kal-border bg-kal-card/50 text-xs uppercase text-kal-text-secondary">
            <tr>
              <th className="px-3 py-2">Reference</th>
              <th className="px-3 py-2">User</th>
              <th className="px-3 py-2">Type</th>
              <th className="px-3 py-2">Status</th>
              <th className="px-3 py-2">Due</th>
              <th className="px-3 py-2">Actions</th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-3 py-6 text-center text-kal-muted">
                  No requests yet.
                </td>
              </tr>
            ) : (
              rows.map((r) => {
                const overdue =
                  r.status !== "resolved" &&
                  r.status !== "rejected" &&
                  new Date(r.due_at).getTime() < now;
                return (
                  <tr key={r.id} className="border-b border-kal-border/60">
                    <td className="px-3 py-2 font-mono text-xs">{r.reference_id}</td>
                    <td className="px-3 py-2 text-xs">
                      {r.user_email ?? r.user_id.slice(0, 8)}
                    </td>
                    <td className="px-3 py-2">{r.type}</td>
                    <td className="px-3 py-2">
                      <span
                        className={clsx(
                          "rounded-full px-2 py-0.5 text-xs font-medium",
                          overdue
                            ? "bg-red-500/15 text-red-600"
                            : "bg-kal-accent/10 text-kal-accent",
                        )}
                      >
                        {r.status}
                        {overdue ? " (overdue)" : ""}
                      </span>
                    </td>
                    <td className="px-3 py-2 text-xs">
                      {new Date(r.due_at).toLocaleDateString("en-IN")}
                    </td>
                    <td className="px-3 py-2">
                      <div className="flex flex-wrap gap-1">
                        {(["in_progress", "resolved", "rejected"] as const).map(
                          (status) => (
                            <button
                              key={status}
                              type="button"
                              disabled={busyId === r.id || r.status === status}
                              onClick={() => void updateStatus(r.id, status)}
                              className="rounded border border-kal-border px-2 py-0.5 text-[11px] disabled:opacity-40"
                            >
                              {status}
                            </button>
                          ),
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

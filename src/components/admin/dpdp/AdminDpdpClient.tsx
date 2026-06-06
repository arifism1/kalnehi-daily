"use client";

import clsx from "clsx";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

import type { AdminDpdpRightsRow } from "@/lib/admin/dpdpQueries";

type PendingErasureAction = {
  id: string;
  confirmText: string;
  userEmail: string | null;
  userId: string;
  referenceId: string;
};

export function AdminDpdpClient({ initial }: { initial: AdminDpdpRightsRow[] }) {
  const router = useRouter();
  const [rows, setRows] = useState(initial);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pendingErasure, setPendingErasure] = useState<PendingErasureAction | null>(
    null,
  );

  const now = Date.now();

  const patchRequest = async (
    id: string,
    payload: {
      status: "in_progress" | "resolved" | "rejected";
      fulfillErasure?: boolean;
    },
  ) => {
    setBusyId(id);
    setError(null);
    try {
      const res = await fetch("/api/admin/dpdp/rights-request", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ id, ...payload }),
      });
      const body = (await res.json().catch(() => ({}))) as {
        ok?: boolean;
        error?: string;
      };
      if (!res.ok || !body.ok) {
        throw new Error(body.error ?? "Update failed.");
      }
      setRows((prev) =>
        prev.map((r) =>
          r.id === id
            ? {
                ...r,
                status: payload.status,
                resolved_at:
                  payload.status === "resolved" || payload.status === "rejected"
                    ? new Date().toISOString()
                    : r.resolved_at,
              }
            : r,
        ),
      );
      setPendingErasure(null);
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Update failed.");
    } finally {
      setBusyId(null);
    }
  };

  const confirmTarget =
    pendingErasure?.userEmail ?? pendingErasure?.userId ?? "";

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

      {pendingErasure && (
        <div className="rounded-xl border border-red-500/40 bg-red-500/5 p-4 space-y-3">
          <p className="text-sm font-semibold text-red-600">
            Resolve &amp; delete account — {pendingErasure.referenceId}
          </p>
          <p className="text-xs text-kal-text-secondary">
            This permanently deletes the user&apos;s auth account and cascaded data.
            Type{" "}
            <span className="font-mono font-bold text-kal-text">{confirmTarget}</span>{" "}
            to confirm.
          </p>
          <input
            type="text"
            value={pendingErasure.confirmText}
            onChange={(e) =>
              setPendingErasure((prev) =>
                prev ? { ...prev, confirmText: e.target.value } : prev,
              )
            }
            placeholder={confirmTarget}
            className="w-full max-w-md rounded border border-red-500/40 bg-kal-card/50 px-2 py-1.5 text-xs font-mono"
          />
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              disabled={
                busyId === pendingErasure.id ||
                pendingErasure.confirmText !== confirmTarget
              }
              onClick={() =>
                void patchRequest(pendingErasure.id, {
                  status: "resolved",
                  fulfillErasure: true,
                })
              }
              className="rounded-md bg-red-600 px-3 py-1.5 text-xs font-medium text-white disabled:opacity-40"
            >
              {busyId === pendingErasure.id
                ? "Deleting…"
                : "Yes, delete account & resolve"}
            </button>
            <button
              type="button"
              disabled={busyId === pendingErasure.id}
              onClick={() => setPendingErasure(null)}
              className="rounded-md border border-kal-border px-3 py-1.5 text-xs text-kal-muted"
            >
              Cancel
            </button>
          </div>
        </div>
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
                const isErasure = r.type === "erasure";
                const isClosed = r.status === "resolved" || r.status === "rejected";
                const details =
                  r.request_details && Object.keys(r.request_details).length > 0
                    ? JSON.stringify(r.request_details)
                    : null;

                return (
                  <tr key={r.id} className="border-b border-kal-border/60 align-top">
                    <td className="px-3 py-2 font-mono text-xs">{r.reference_id}</td>
                    <td className="px-3 py-2 text-xs">
                      <div>{r.user_email ?? "—"}</div>
                      <div className="font-mono text-[10px] text-kal-muted">
                        {r.user_id}
                      </div>
                      {isErasure && details && (
                        <div className="mt-1 max-w-xs break-all text-[10px] text-kal-text-secondary">
                          {details}
                        </div>
                      )}
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
                      {!isClosed && (
                        <div className="flex flex-wrap gap-1">
                          <button
                            type="button"
                            disabled={busyId === r.id || r.status === "in_progress"}
                            onClick={() =>
                              void patchRequest(r.id, { status: "in_progress" })
                            }
                            className="rounded border border-kal-border px-2 py-0.5 text-[11px] disabled:opacity-40"
                          >
                            in progress
                          </button>
                          {isErasure ? (
                            <button
                              type="button"
                              disabled={busyId === r.id}
                              onClick={() =>
                                setPendingErasure({
                                  id: r.id,
                                  confirmText: "",
                                  userEmail: r.user_email,
                                  userId: r.user_id,
                                  referenceId: r.reference_id,
                                })
                              }
                              className="rounded border border-red-500/50 px-2 py-0.5 text-[11px] font-medium text-red-600 disabled:opacity-40"
                            >
                              resolve &amp; delete
                            </button>
                          ) : (
                            <button
                              type="button"
                              disabled={busyId === r.id || r.status === "resolved"}
                              onClick={() =>
                                void patchRequest(r.id, { status: "resolved" })
                              }
                              className="rounded border border-kal-border px-2 py-0.5 text-[11px] disabled:opacity-40"
                            >
                              resolved
                            </button>
                          )}
                          <button
                            type="button"
                            disabled={busyId === r.id || r.status === "rejected"}
                            onClick={() =>
                              void patchRequest(r.id, { status: "rejected" })
                            }
                            className="rounded border border-kal-border px-2 py-0.5 text-[11px] disabled:opacity-40"
                          >
                            rejected
                          </button>
                        </div>
                      )}
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

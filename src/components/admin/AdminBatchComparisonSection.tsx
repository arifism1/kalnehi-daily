"use client";

import { useState } from "react";

import type { BatchComparisonRow } from "@/lib/admin/queries/batchComparisonQueries";

export function AdminBatchComparisonSection({ rows }: { rows: BatchComparisonRow[] }) {
  return (
    <div className="mt-10 space-y-4">
      <div>
        <h2 className="text-lg font-semibold text-kal-text">Batch comparison</h2>
        <p className="text-sm text-kal-muted">Side-by-side metrics, revenue vs estimated AI cost, editable notes.</p>
      </div>
      <div className="overflow-x-auto rounded-2xl border border-kal-border">
        <table className="w-full border-collapse text-sm">
          <thead>
            <tr className="border-b border-kal-border bg-kal-card/70">
              {[
                "Batch",
                "Status",
                "Joined",
                "Activated",
                "Skipped",
                "Paid",
                "Revenue ₹",
                "AI cost ₹",
                "Net ₹",
                "Notes",
              ].map((h) => (
                <th
                  key={h}
                  className="p-3 text-left text-[10px] font-bold uppercase tracking-wider text-kal-muted whitespace-nowrap"
                >
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((r, i) => (
              <tr key={r.batchId} className={i % 2 === 0 ? "bg-kal-card/20" : ""}>
                <td className="px-3 py-2 font-semibold">#{r.batchNumber}</td>
                <td className="px-3 py-2">{r.status}</td>
                <td className="px-3 py-2 tabular-nums">{r.joined}</td>
                <td className="px-3 py-2 tabular-nums">{r.activated}</td>
                <td className="px-3 py-2 tabular-nums">{r.skipped}</td>
                <td className="px-3 py-2 tabular-nums">{r.paidInBatch}</td>
                <td className="px-3 py-2 tabular-nums">₹{Math.round(r.revenueInr).toLocaleString("en-IN")}</td>
                <td className="px-3 py-2 tabular-nums">₹{Math.round(r.aiCostInrApprox).toLocaleString("en-IN")}</td>
                <td className="px-3 py-2 tabular-nums font-medium">₹{Math.round(r.netInrApprox).toLocaleString("en-IN")}</td>
                <td className="px-3 py-2 min-w-[200px]">
                  <BatchNoteEditor batchId={r.batchId} initialNotes={r.notes ?? ""} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function BatchNoteEditor({ batchId, initialNotes }: { batchId: string; initialNotes: string }) {
  const [value, setValue] = useState(initialNotes);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  async function save() {
    setSaving(true);
    setMsg(null);
    try {
      const res = await fetch("/api/admin/batch-notes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ batchId, notes: value }),
      });
      const j = (await res.json()) as { ok?: boolean; error?: string };
      if (!j.ok) setMsg(j.error ?? "Error");
      else setMsg("Saved");
    } catch {
      setMsg("Network error");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-1">
      <textarea
        value={value}
        onChange={(e) => setValue(e.target.value)}
        rows={2}
        className="w-full rounded-lg border border-kal-border bg-kal-card/50 px-2 py-1 text-xs text-kal-text"
      />
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={() => void save()}
          disabled={saving}
          className="rounded-md bg-kal-accent px-2 py-0.5 text-[11px] font-medium text-white disabled:opacity-50"
        >
          {saving ? "…" : "Save"}
        </button>
        {msg && <span className="text-[10px] text-kal-muted">{msg}</span>}
      </div>
    </div>
  );
}

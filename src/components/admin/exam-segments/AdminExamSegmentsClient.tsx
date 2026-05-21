"use client";

import type { ExamSegmentsSnapshot } from "@/lib/admin/queries/examSegmentsQueries";
import { AdminKpiCard } from "@/components/admin/AdminKpiCard";

export function AdminExamSegmentsClient({ data }: { data: ExamSegmentsSnapshot }) {
  const top = data.rows.slice(0, 15);
  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-semibold text-kal-text">Exam segment intelligence</h1>
        <p className="mt-1 text-sm text-kal-muted">
          Grouped by exam track (selected_track) when set; otherwise legacy target exam from profile.
        </p>
      </div>

      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <AdminKpiCard label="Distinct tracks / segments" value={data.rows.length} />
      </div>

      <div className="overflow-x-auto rounded-2xl border border-kal-border">
        <table className="w-full border-collapse text-sm">
          <thead>
            <tr className="border-b border-kal-border bg-kal-card/70">
              {["Track / exam", "Users", "Paying", "Trials", "Conversion %", "Churn 30d", "ARPU ₹"].map((h) => (
                <th key={h} className="p-3 text-left text-[10px] font-bold uppercase text-kal-muted">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {top.map((r, i) => (
              <tr key={r.exam} className={i % 2 === 0 ? "bg-kal-card/20" : ""}>
                <td className="px-3 py-2 font-medium">{r.exam}</td>
                <td className="px-3 py-2 tabular-nums">{r.users}</td>
                <td className="px-3 py-2 tabular-nums">{r.paying}</td>
                <td className="px-3 py-2 tabular-nums">{r.trialOrFree}</td>
                <td className="px-3 py-2 tabular-nums">{r.conversionPct.toFixed(1)}%</td>
                <td className="px-3 py-2 tabular-nums">{r.churnedRecently}</td>
                <td className="px-3 py-2 tabular-nums">₹{r.arpuInr.toFixed(0)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

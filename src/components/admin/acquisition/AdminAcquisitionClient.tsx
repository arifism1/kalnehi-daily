"use client";

import { Bar, BarChart, CartesianGrid, Legend, Tooltip, XAxis, YAxis } from "recharts";

import type { AcquisitionSnapshot } from "@/lib/admin/queries/acquisitionQueries";
import { AdminChart } from "@/components/admin/AdminChart";
import { AdminKpiCard } from "@/components/admin/AdminKpiCard";

export function AdminAcquisitionClient({ data }: { data: AcquisitionSnapshot }) {
  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-semibold text-kal-text">Acquisition</h1>
        <p className="mt-1 text-sm text-kal-muted">
          Inferred sources from signup_attribution + auth user timestamps. Total auth users:{" "}
          {data.totalAuthUsers.toLocaleString("en-IN")}.
        </p>
      </div>

      <div className="grid grid-cols-2 gap-3 md:grid-cols-3">
        <AdminKpiCard label="Profiles w/ attribution" value={data.profilesWithAttribution} />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="rounded-2xl border border-kal-border bg-kal-card/40 p-4">
          <h2 className="text-sm font-semibold text-kal-text mb-2">Signups by source (inferred)</h2>
          <AdminChart height={260}>
            <BarChart data={data.signupsBySource} layout="vertical" margin={{ left: 8 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--kal-border)" />
              <XAxis type="number" tick={{ fontSize: 10 }} />
              <YAxis type="category" dataKey="source" width={88} tick={{ fontSize: 10 }} />
              <Tooltip />
              <Bar dataKey="count" fill="var(--kal-accent)" radius={[0, 4, 4, 0]} />
            </BarChart>
          </AdminChart>
        </div>
        <div className="rounded-2xl border border-kal-border bg-kal-card/40 p-4">
          <h2 className="text-sm font-semibold text-kal-text mb-2">Signups by day</h2>
          <AdminChart height={260}>
            <BarChart data={data.signupsByDay}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--kal-border)" />
              <XAxis dataKey="day" tick={{ fontSize: 9 }} angle={-45} textAnchor="end" height={60} />
              <YAxis tick={{ fontSize: 10 }} />
              <Tooltip />
              <Bar dataKey="count" fill="oklch(0.55 0.14 250)" radius={[4, 4, 0, 0]} />
            </BarChart>
          </AdminChart>
        </div>
      </div>

      <div className="rounded-2xl border border-kal-border bg-kal-card/40 p-4">
        <h2 className="text-sm font-semibold text-kal-text mb-2">Top tracks / exams (from profile)</h2>
        <AdminChart height={280}>
          <BarChart data={data.signupsByExam.slice(0, 12)}>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--kal-border)" />
            <XAxis dataKey="exam" tick={{ fontSize: 9 }} angle={-30} textAnchor="end" height={70} />
            <YAxis tick={{ fontSize: 10 }} />
            <Tooltip />
            <Legend />
            <Bar dataKey="count" name="Users" fill="oklch(0.6 0.16 35)" radius={[4, 4, 0, 0]} />
          </BarChart>
        </AdminChart>
      </div>

      {data.examsBySource.length > 0 && (() => {
        // Group rows back into { source, exams[] } for rendering.
        const grouped = new Map<string, { exam: string; count: number }[]>();
        for (const row of data.examsBySource) {
          if (!grouped.has(row.source)) grouped.set(row.source, []);
          grouped.get(row.source)!.push({ exam: row.exam, count: row.count });
        }
        return (
          <div className="rounded-2xl border border-kal-border bg-kal-card/40 p-4">
            <h2 className="mb-1 text-sm font-semibold text-kal-text">Exams by acquisition source</h2>
            <p className="mb-3 text-xs text-kal-muted">
              Top tracks or exams per source. <span className="font-medium text-kal-accent">instagram_referral</span> = users who arrived via a referral code.
            </p>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {[...grouped.entries()].map(([source, exams]) => {
                const maxCount = exams[0]?.count ?? 1;
                return (
                  <div key={source} className="rounded-xl border border-kal-border/60 bg-kal-card/30 p-3">
                    <p className="mb-2 text-[10px] font-bold uppercase tracking-wider text-kal-accent">
                      {source}
                    </p>
                    <div className="space-y-1.5">
                      {exams.map((e) => {
                        const pctW = Math.max(4, Math.round((e.count / maxCount) * 100));
                        return (
                          <div key={e.exam} className="flex items-center gap-1.5 text-xs">
                            <span className="w-24 shrink-0 truncate text-kal-text-secondary">{e.exam}</span>
                            <div className="flex h-4 flex-1 items-center overflow-hidden rounded-sm bg-kal-border/30">
                              <div
                                className="h-full rounded-sm bg-kal-accent/55"
                                style={{ width: `${pctW}%` }}
                              />
                            </div>
                            <span className="w-5 shrink-0 text-right tabular-nums text-kal-text-secondary">
                              {e.count}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        );
      })()}

      <div className="rounded-2xl border border-kal-border bg-kal-card/40 p-4">
        <h2 className="text-sm font-semibold text-kal-text mb-2">Top UTM campaigns</h2>
        {data.topUtmCampaigns.length === 0 ? (
          <p className="text-sm text-kal-muted">No UTM campaigns recorded yet.</p>
        ) : (
          <ul className="divide-y divide-kal-border text-sm">
            {data.topUtmCampaigns.map((u) => (
              <li key={u.campaign} className="flex justify-between py-2">
                <span className="text-kal-text-secondary">{u.campaign}</span>
                <span className="tabular-nums font-medium">{u.count}</span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

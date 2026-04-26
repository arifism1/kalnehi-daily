"use client";

import { Check, Plus, ToggleLeft, ToggleRight } from "lucide-react";
import { useRouter } from "next/navigation";
import { useTransition, useState } from "react";

import {
  adminCreateReferralCode,
  adminToggleReferralCode,
} from "@/actions/referral";
import { AdminKpiCard } from "@/components/admin/AdminKpiCard";
import type { ReferralSnapshot } from "@/lib/admin/queries/referralQueries";

function pct(num: number, denom: number): string {
  if (!denom) return "—";
  return `${((num / denom) * 100).toFixed(1)}%`;
}

function DailyBar({ day, signups, max }: { day: string; signups: number; max: number }) {
  const pctWidth = max > 0 ? Math.max(4, Math.round((signups / max) * 100)) : 4;
  return (
    <div className="flex items-center gap-2 text-xs">
      <span className="w-20 shrink-0 tabular-nums text-kal-muted">{day.slice(5)}</span>
      <div className="flex h-5 flex-1 items-center overflow-hidden rounded-sm bg-kal-border/30">
        <div
          className="h-full rounded-sm bg-kal-accent/70"
          style={{ width: `${pctWidth}%` }}
        />
      </div>
      <span className="w-6 shrink-0 text-right tabular-nums text-kal-text-secondary">{signups}</span>
    </div>
  );
}

export function AdminReferralsClient({ data }: { data: ReferralSnapshot }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  const [newCode, setNewCode] = useState("");
  const [newDesc, setNewDesc] = useState("");
  const [newCampaign, setNewCampaign] = useState("");
  const [addError, setAddError] = useState<string | null>(null);
  const [addSuccess, setAddSuccess] = useState(false);

  const maxSignups = Math.max(...data.daily.map((d) => d.signups), 1);

  function handleToggle(id: string, currentActive: boolean) {
    startTransition(async () => {
      await adminToggleReferralCode(id, !currentActive);
      router.refresh();
    });
  }

  function handleAddCode(e: React.FormEvent) {
    e.preventDefault();
    setAddError(null);
    setAddSuccess(false);
    const code = newCode.trim().toUpperCase();
    if (!code || !newDesc.trim()) {
      setAddError("Code and description are required.");
      return;
    }
    startTransition(async () => {
      const result = await adminCreateReferralCode({
        code,
        description: newDesc.trim(),
        campaign: newCampaign.trim() || "instagram_manychat",
      });
      if (!result.ok) {
        setAddError(result.error ?? "Failed to create code.");
      } else {
        setAddSuccess(true);
        setNewCode("");
        setNewDesc("");
        setNewCampaign("");
        router.refresh();
      }
    });
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-semibold text-kal-text">Referral Sources</h1>
        <p className="mt-1 text-sm text-kal-muted">
          Last 30 days — Instagram / ManyChat attribution funnel.
        </p>
      </div>

      {/* KPI totals */}
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <AdminKpiCard label="Link clicks" value={data.totals.clicks} />
        <AdminKpiCard label="Signups" value={data.totals.signups} sub={pct(data.totals.signups, data.totals.clicks) + " click→signup"} />
        <AdminKpiCard label="Trials started" value={data.totals.trials} sub={pct(data.totals.trials, data.totals.signups) + " signup→trial"} />
        <AdminKpiCard label="Converted to paid" value={data.totals.conversions} sub={pct(data.totals.conversions, data.totals.trials) + " trial→paid"} />
      </div>

      {/* Per-code funnel table */}
      <div className="rounded-2xl border border-kal-border bg-kal-card/40 p-4">
        <h2 className="mb-3 text-sm font-semibold text-kal-text">Funnel by referral code</h2>
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-kal-border text-left text-[10px] font-bold uppercase tracking-wider text-kal-muted">
                <th className="pb-2 pr-4">Code</th>
                <th className="pb-2 pr-4">Description</th>
                <th className="pb-2 pr-4 text-right">Clicks</th>
                <th className="pb-2 pr-4 text-right">Signups</th>
                <th className="pb-2 pr-4 text-right">Trials</th>
                <th className="pb-2 pr-4 text-right">Paid</th>
                <th className="pb-2 text-right">Conv %</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-kal-border/40">
              {data.codes.map((c) => (
                <tr key={c.id} className={c.is_active ? "" : "opacity-50"}>
                  <td className="py-2 pr-4 font-mono font-semibold text-kal-text">{c.code}</td>
                  <td className="py-2 pr-4 text-kal-text-secondary">{c.description ?? "—"}</td>
                  <td className="py-2 pr-4 text-right tabular-nums">{c.clicks}</td>
                  <td className="py-2 pr-4 text-right tabular-nums">{c.signups}</td>
                  <td className="py-2 pr-4 text-right tabular-nums">{c.trials}</td>
                  <td className="py-2 pr-4 text-right tabular-nums">{c.conversions}</td>
                  <td className="py-2 text-right tabular-nums text-kal-accent">
                    {pct(c.conversions, c.clicks)}
                  </td>
                </tr>
              ))}
              {data.codes.length === 0 && (
                <tr>
                  <td colSpan={7} className="py-4 text-center text-kal-muted">
                    No referral codes yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Daily referral signups chart */}
      {data.daily.length > 0 && (
        <div className="rounded-2xl border border-kal-border bg-kal-card/40 p-4">
          <h2 className="mb-3 text-sm font-semibold text-kal-text">
            Daily referral signups (last 30 days)
          </h2>
          <div className="space-y-1.5">
            {data.daily.map((d) => (
              <DailyBar key={d.day} day={d.day} signups={d.signups} max={maxSignups} />
            ))}
          </div>
        </div>
      )}

      {/* Top exams from referral users */}
      {data.igExamsSummary.length > 0 && (
        <div className="rounded-2xl border border-kal-border bg-kal-card/40 p-4">
          <h2 className="mb-1 text-sm font-semibold text-kal-text">Top tracks / exams — referral users</h2>
          <p className="mb-3 text-xs text-kal-muted">
            Exams targeted by users who signed up via any referral code.
          </p>
          <div className="grid gap-6 lg:grid-cols-2">
            {/* Summary bar list */}
            <div className="space-y-1.5">
              {data.igExamsSummary.map((e) => {
                const maxCount = data.igExamsSummary[0]?.count ?? 1;
                const pctW = Math.max(4, Math.round((e.count / maxCount) * 100));
                return (
                  <div key={e.exam} className="flex items-center gap-2 text-xs">
                    <span className="w-28 shrink-0 truncate text-kal-text-secondary">{e.exam}</span>
                    <div className="flex h-5 flex-1 items-center overflow-hidden rounded-sm bg-kal-border/30">
                      <div
                        className="h-full rounded-sm bg-kal-accent/60"
                        style={{ width: `${pctW}%` }}
                      />
                    </div>
                    <span className="w-6 shrink-0 text-right tabular-nums text-kal-text-secondary">
                      {e.count}
                    </span>
                  </div>
                );
              })}
            </div>

            {/* Per-code exam breakdown */}
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-kal-border text-left text-[10px] font-bold uppercase tracking-wider text-kal-muted">
                    <th className="pb-2 pr-3">Code</th>
                    <th className="pb-2 pr-3">Exam</th>
                    <th className="pb-2 text-right">Users</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-kal-border/30">
                  {data.examsByCode.map((row) => (
                    <tr key={`${row.code}-${row.exam}`}>
                      <td className="py-1.5 pr-3 font-mono text-kal-muted">{row.code}</td>
                      <td className="py-1.5 pr-3 text-kal-text-secondary">{row.exam}</td>
                      <td className="py-1.5 text-right tabular-nums font-medium text-kal-text">
                        {row.count}
                      </td>
                    </tr>
                  ))}
                  {data.examsByCode.length === 0 && (
                    <tr>
                      <td colSpan={3} className="py-3 text-center text-kal-muted">
                        No track / exam data yet.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Code management */}
      <div className="rounded-2xl border border-kal-border bg-kal-card/40 p-4">
        <h2 className="mb-3 text-sm font-semibold text-kal-text">Referral code management</h2>
        <div className="divide-y divide-kal-border/40">
          {data.codes.map((c) => (
            <div key={c.id} className="flex items-center justify-between gap-4 py-2.5">
              <div className="min-w-0">
                <p className="flex items-center gap-2 text-sm font-mono font-semibold text-kal-text">
                  {c.code}
                  {!c.is_active && (
                    <span className="rounded bg-kal-border/50 px-1 py-0.5 text-[10px] text-kal-muted">
                      inactive
                    </span>
                  )}
                </p>
                <p className="mt-0.5 truncate text-xs text-kal-text-secondary">
                  {c.description} · {c.campaign}
                </p>
              </div>
              <button
                type="button"
                onClick={() => handleToggle(c.id, c.is_active)}
                disabled={pending}
                aria-label={c.is_active ? "Deactivate code" : "Activate code"}
                className="shrink-0 text-kal-muted transition-colors hover:text-kal-text disabled:opacity-50"
              >
                {c.is_active ? (
                  <ToggleRight className="size-6 text-kal-accent" />
                ) : (
                  <ToggleLeft className="size-6" />
                )}
              </button>
            </div>
          ))}
        </div>

        {/* Add new code form */}
        <form
          onSubmit={handleAddCode}
          className="mt-4 space-y-2.5 border-t border-kal-border pt-4"
        >
          <p className="text-[11px] font-bold uppercase tracking-wider text-kal-muted">
            Add new code
          </p>
          <div className="grid gap-2 sm:grid-cols-3">
            <input
              value={newCode}
              onChange={(e) => setNewCode(e.target.value.toUpperCase())}
              placeholder="IGTRIAL_REEL3"
              className="rounded-lg border border-kal-border bg-kal-input-bg px-3 py-2 font-mono text-sm text-kal-text placeholder:text-kal-muted focus:border-kal-accent/40 focus:outline-none focus:ring-1 focus:ring-kal-accent/20"
            />
            <input
              value={newDesc}
              onChange={(e) => setNewDesc(e.target.value)}
              placeholder="Description (internal)"
              className="rounded-lg border border-kal-border bg-kal-input-bg px-3 py-2 text-sm text-kal-text placeholder:text-kal-muted focus:border-kal-accent/40 focus:outline-none focus:ring-1 focus:ring-kal-accent/20"
            />
            <input
              value={newCampaign}
              onChange={(e) => setNewCampaign(e.target.value)}
              placeholder="Campaign (e.g. instagram_manychat)"
              className="rounded-lg border border-kal-border bg-kal-input-bg px-3 py-2 text-sm text-kal-text placeholder:text-kal-muted focus:border-kal-accent/40 focus:outline-none focus:ring-1 focus:ring-kal-accent/20"
            />
          </div>
          {addError && (
            <p className="text-xs text-red-500">{addError}</p>
          )}
          {addSuccess && (
            <p className="flex items-center gap-1 text-xs text-emerald-500">
              <Check className="size-3.5" /> Code created.
            </p>
          )}
          <button
            type="submit"
            disabled={pending}
            className="flex items-center gap-1.5 rounded-lg bg-kal-accent px-4 py-2 text-xs font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-50"
          >
            <Plus className="size-3.5" />
            Add code
          </button>
        </form>
      </div>

      {/* ManyChat URL reference */}
      <div className="rounded-2xl border border-kal-border/50 bg-kal-card/20 p-4">
        <p className="text-[10px] font-bold uppercase tracking-wider text-kal-muted">
          ManyChat URL format
        </p>
        <code className="mt-2 block break-all text-[11px] leading-relaxed text-kal-text-secondary">
          kalnehi.com/start?ref=IGTRIAL3&amp;utm_source=instagram&amp;utm_medium=manychat&amp;utm_campaign=reel_comment
        </code>
      </div>
    </div>
  );
}

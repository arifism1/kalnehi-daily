"use client";

import Link from "next/link";
import { Area, AreaChart, CartesianGrid, Tooltip, XAxis, YAxis } from "recharts";

import type { AiPrepbrainDeepinfraWindow, AiUsageSnapshot } from "@/lib/admin/queries/aiUsageQueries";
import { AdminChart } from "@/components/admin/AdminChart";
import { AdminKpiCard } from "@/components/admin/AdminKpiCard";

function DeepinfraWindowCell({ w }: { w: AiPrepbrainDeepinfraWindow }) {
  if (w.finalizedCount === 0) {
    return <span className="text-kal-muted">—</span>;
  }
  return (
    <div className="space-y-0.5 text-xs">
      <div className="font-medium text-kal-text">{w.billedTokens.toLocaleString("en-IN")} billed tok</div>
      <div className="text-kal-muted">
        {w.finalizedCount} finalized · est. ₹{w.costInr.toFixed(0)}
      </div>
      <div className="text-[10px] text-kal-muted/80">
        in {w.inputTokens.toLocaleString("en-IN")} · out {w.outputTokens.toLocaleString("en-IN")}
      </div>
    </div>
  );
}

export function AdminAiUsageClient({ data }: { data: AiUsageSnapshot }) {
  const chartData = data.tokensFinalizedByDay;
  const split = data.prepbrainDeepinfraSplit;
  const pt = data.providerBreakdownToday;

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-semibold text-kal-text">AI usage &amp; cost</h1>
        <p className="mt-1 text-sm text-kal-muted">
          Tokens from finalized Mastermind reservations and voice (Groq). Mastermind Mistral 24B cost uses{" "}
          <strong className="font-medium text-kal-text">live list pricing from DeepInfra&apos;s public model API</strong>{" "}
          (converted with <span className="font-mono">ai_usd_to_inr_rate</span>, cached about{" "}
          {Math.round(data.mastermindMistralPricing.cacheRevalidateSeconds / 60)} minutes). Groq and other DeepInfra
          models use rates from Admin Config; USD→INR for Mistral matches that setting.
        </p>
      </div>

      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <AdminKpiCard label="Tokens today" value={data.tokensToday.toLocaleString("en-IN")} />
        <AdminKpiCard label="Tokens (7d)" value={data.tokensThisWeek.toLocaleString("en-IN")} />
        <AdminKpiCard label="Tokens (30d)" value={data.tokensThisMonth.toLocaleString("en-IN")} />
        <AdminKpiCard label="Cost today (est.)" value={`₹${data.costTodayInr.toFixed(0)}`} />
        <AdminKpiCard label="Cost 7d (est.)" value={`₹${data.costThisWeekInr.toFixed(0)}`} />
        <AdminKpiCard label="Cost 30d (est.)" value={`₹${data.costThisMonthInr.toFixed(0)}`} />
        <AdminKpiCard
          label="AI cost % of MRR (30d)"
          value={data.costPercentOfMrr != null ? `${data.costPercentOfMrr.toFixed(1)}%` : "—"}
        />
        <AdminKpiCard
          label="Trial token hit rate (~90% cap)"
          value={`${data.trialTokenHitRatePct.toFixed(0)}%`}
        />
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <AdminKpiCard
          label="Avg tokens / paying user (window)"
          value={Math.round(data.avgTokensPerPayingUser).toLocaleString("en-IN")}
        />
        <AdminKpiCard
          label="Avg tokens / trial user (window)"
          value={Math.round(data.avgTokensPerTrialUser).toLocaleString("en-IN")}
        />
      </div>

      <div className="rounded-2xl border border-kal-border bg-kal-card/40 p-4">
        <h2 className="mb-1 text-sm font-semibold text-kal-text">Top users by AI tokens</h2>
        <p className="mb-3 text-xs text-kal-muted">
          PrepBrain billed + voice (same ~40d window as charts above). Open user lookup for detail.
        </p>
        {data.topUsersByAiTokens.length === 0 ? (
          <p className="text-xs text-kal-muted">No usage in this window.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[480px] border-collapse text-left text-sm">
              <thead>
                <tr className="border-b border-kal-border text-[10px] font-bold uppercase tracking-wider text-kal-muted">
                  <th className="py-2 pr-2">#</th>
                  <th className="py-2 pr-2">User</th>
                  <th className="py-2 pr-2 text-right">PrepBrain</th>
                  <th className="py-2 pr-2 text-right">Voice</th>
                  <th className="py-2 pr-2 text-right">Total</th>
                  <th className="py-2 text-right">Est. ₹</th>
                </tr>
              </thead>
              <tbody>
                {data.topUsersByAiTokens.map((row, idx) => (
                  <tr key={row.userId} className="border-b border-kal-border/50 align-middle last:border-0">
                    <td className="py-2 pr-2 text-kal-muted tabular-nums">{idx + 1}</td>
                    <td className="py-2 pr-2">
                      <Link
                        href={`/admin/users?q=${encodeURIComponent(row.userId)}`}
                        className="font-mono text-xs text-kal-accent hover:underline"
                        title={row.userId}
                      >
                        {row.userId.slice(0, 8)}…
                      </Link>
                    </td>
                    <td className="py-2 pr-2 text-right tabular-nums">{row.prepbrainTokens.toLocaleString("en-IN")}</td>
                    <td className="py-2 pr-2 text-right tabular-nums">{row.voiceTokens.toLocaleString("en-IN")}</td>
                    <td className="py-2 pr-2 text-right font-medium tabular-nums text-kal-text">
                      {row.totalTokens.toLocaleString("en-IN")}
                    </td>
                    <td className="py-2 text-right tabular-nums text-kal-muted">₹{row.costInr.toFixed(0)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <div className="rounded-2xl border border-kal-border bg-kal-card/40 p-4">
        <h2 className="mb-1 text-sm font-semibold text-kal-text">Today by provider (incl. voice Groq)</h2>
        <p className="mb-3 text-xs text-kal-muted">Input/output split where available; cost uses the same rates as totals above.</p>
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="rounded-xl border border-kal-border/80 bg-kal-card/30 p-3 text-sm">
            <div className="font-medium text-kal-text">DeepInfra</div>
            <div className="mt-1 text-xs text-kal-muted">
              {pt.deepinfra.inputTokens.toLocaleString("en-IN")} in ·{" "}
              {pt.deepinfra.outputTokens.toLocaleString("en-IN")} out
            </div>
            <div className="mt-1 text-sm font-semibold text-kal-text">₹{pt.deepinfra.costInr.toFixed(0)}</div>
          </div>
          <div className="rounded-xl border border-kal-border/80 bg-kal-card/30 p-3 text-sm">
            <div className="font-medium text-kal-text">Groq</div>
            <div className="mt-1 text-xs text-kal-muted">
              {pt.groq.inputTokens.toLocaleString("en-IN")} in · {pt.groq.outputTokens.toLocaleString("en-IN")} out
            </div>
            <div className="mt-1 text-sm font-semibold text-kal-text">₹{pt.groq.costInr.toFixed(0)}</div>
          </div>
        </div>
      </div>

      <div className="rounded-2xl border border-kal-border bg-kal-card/40 p-4">
        <h2 className="mb-1 text-sm font-semibold text-kal-text">Mastermind — Mistral vs other DeepInfra</h2>
        <p className="mb-3 text-xs text-kal-muted">
          Finalized PrepBrain rows only, provider DeepInfra. <span className="font-mono">Mistral-Small-24B</span> is
          the Mastermind hard-tier model; other slugs include chat / backlog routes and legacy rows without model.
        </p>
        {data.mastermindMistralPricing.source === "deepinfra_live" ? (
          <div className="mb-3 rounded-lg border border-emerald-500/25 bg-emerald-500/10 px-3 py-2 text-xs text-emerald-400">
            Mistral cost rate:{" "}
            <span className="font-mono">
              ₹{data.mastermindMistralPricing.inputInrPerM}/M in · ₹{data.mastermindMistralPricing.outputInrPerM}/M out
            </span>{" "}
            (DeepInfra public API, refreshed at most every {Math.round(data.mastermindMistralPricing.cacheRevalidateSeconds / 60)}{" "}
            min).
          </div>
        ) : (
          <div className="mb-3 rounded-lg border border-amber-500/25 bg-amber-500/10 px-3 py-2 text-xs text-amber-400">
            Mistral cost rate fell back to Admin Config (₹{data.mastermindMistralPricing.inputInrPerM}/M in · ₹
            {data.mastermindMistralPricing.outputInrPerM}/M out) — could not read DeepInfra:{" "}
            {data.mastermindMistralPricing.liveFetchError ?? "unknown error"}.
          </div>
        )}
        <div className="overflow-x-auto">
          <table className="w-full min-w-[520px] border-collapse text-left text-sm">
            <thead>
              <tr className="border-b border-kal-border text-[10px] font-bold uppercase tracking-wider text-kal-muted">
                <th className="py-2 pr-3">Source</th>
                <th className="py-2 pr-3">Today (IST)</th>
                <th className="py-2 pr-3">Last 7d</th>
                <th className="py-2">Last 30d</th>
              </tr>
            </thead>
            <tbody>
              <tr className="border-b border-kal-border/60 align-top">
                <td className="py-3 pr-3 font-medium text-kal-text">Mistral 24B (Mastermind)</td>
                <td className="py-3 pr-3">
                  <DeepinfraWindowCell w={split.mastermindMistral.today} />
                </td>
                <td className="py-3 pr-3">
                  <DeepinfraWindowCell w={split.mastermindMistral.week} />
                </td>
                <td className="py-3">
                  <DeepinfraWindowCell w={split.mastermindMistral.month} />
                </td>
              </tr>
              <tr className="align-top">
                <td className="py-3 pr-3 font-medium text-kal-text">Other DeepInfra</td>
                <td className="py-3 pr-3">
                  <DeepinfraWindowCell w={split.otherDeepinfra.today} />
                </td>
                <td className="py-3 pr-3">
                  <DeepinfraWindowCell w={split.otherDeepinfra.week} />
                </td>
                <td className="py-3">
                  <DeepinfraWindowCell w={split.otherDeepinfra.month} />
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <div className="rounded-2xl border border-kal-border bg-kal-card/40 p-4">
        <h2 className="text-sm font-semibold text-kal-text mb-2">Tokens finalized by day</h2>
        <AdminChart height={280}>
          <AreaChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--kal-border)" />
            <XAxis dataKey="day" tick={{ fontSize: 10 }} stroke="var(--kal-muted)" />
            <YAxis tick={{ fontSize: 10 }} stroke="var(--kal-muted)" />
            <Tooltip />
            <Area type="monotone" dataKey="tokens" stroke="var(--kal-accent)" fill="var(--kal-accent)" fillOpacity={0.2} />
          </AreaChart>
        </AdminChart>
      </div>
    </div>
  );
}

"use client";

import type { OverviewSnapshot } from "@/lib/admin/queries/overviewQueries";
import { AdminKpiCard } from "@/components/admin/AdminKpiCard";

export function AdminOverviewClient({ data }: { data: OverviewSnapshot }) {
  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-semibold text-kal-text">Live overview</h1>
        <p className="mt-1 text-sm text-kal-muted">What&apos;s happening right now (IST day boundaries for signups/revenue).</p>
      </div>

      {data.alerts.length > 0 && (
        <div className="space-y-2">
          {data.alerts.map((a, i) => (
            <div
              key={i}
              className={
                a.level === "critical"
                  ? "rounded-xl border border-red-500/40 bg-red-500/10 px-4 py-3 text-sm text-red-600"
                  : "rounded-xl border border-amber-500/40 bg-amber-500/10 px-4 py-3 text-sm text-amber-800"
              }
            >
              {a.message}
            </div>
          ))}
        </div>
      )}

      <div className="grid grid-cols-2 gap-3 md:grid-cols-4 lg:grid-cols-6">
        <AdminKpiCard label="Active users (24h)" value={data.activeUsers24h} />
        <AdminKpiCard label="Active free trials" value={data.activeFreeTrialUsers} />
        <AdminKpiCard label="Smart Plan · monthly" value={data.smartPlanMonthly} />
        <AdminKpiCard label="Smart Plan · annual" value={data.smartPlanAnnual} />
        <AdminKpiCard label="Signups today" value={data.signupsToday} sub={`yesterday: ${data.signupsYesterday}`} />
        <AdminKpiCard
          label="Signups (same weekday −7d)"
          value={data.signupsSameDayLastWeek}
        />
        <AdminKpiCard label="Conversions today" value={data.conversionsToday} sub="plan_upgrade + annual" />
        <AdminKpiCard
          label="Revenue today (est.)"
          value={`₹${Math.round(data.revenueTodayInr).toLocaleString("en-IN")}`}
        />
        <AdminKpiCard
          label="AI tokens finalized today"
          value={data.aiTokensFinalizedToday.toLocaleString("en-IN")}
        />
        <AdminKpiCard
          label="AI cost today (est.)"
          value={`₹${data.aiCostTodayInr.toFixed(0)}`}
        />
        <AdminKpiCard label="Waitlist depth" value={data.waitlistDepth} sub={`waiting: ${data.waitlistWaiting}`} />
        <AdminKpiCard label="Trial queue pending" value={data.trialQueuePending} sub="activates at midnight IST" />
        <AdminKpiCard
          label="Batch system"
          value={data.batchSystemActive ? "On" : "Off"}
        />
      </div>

      {data.trialCohortsByDayRemaining.length > 0 && (
        <div className="rounded-2xl border border-kal-border bg-kal-card/40 p-5">
          <h2 className="text-sm font-semibold text-kal-text">Trial cohorts (days left)</h2>
          <div className="mt-3 flex flex-wrap gap-2">
            {data.trialCohortsByDayRemaining.map((c) => (
              <span
                key={c.daysRemaining}
                className="rounded-full bg-kal-accent/15 px-3 py-1 text-xs font-medium text-kal-accent"
              >
                {c.daysRemaining}d left · {c.userCount} users
              </span>
            ))}
          </div>
        </div>
      )}

      {data.activeBatch && (
        <div className="rounded-2xl border border-kal-accent/30 bg-kal-accent/[0.06] p-5">
          <h2 className="text-sm font-semibold text-kal-accent">Current batch</h2>
          <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-4 text-sm">
            <div>
              <p className="text-kal-muted text-xs">Batch #</p>
              <p className="font-semibold">{data.activeBatch.batchNumber}</p>
            </div>
            <div>
              <p className="text-kal-muted text-xs">Status</p>
              <p className="font-semibold">{data.activeBatch.status}</p>
            </div>
            <div>
              <p className="text-kal-muted text-xs">Spots filled</p>
              <p className="font-semibold tabular-nums">{data.activeBatch.spotsFilled}</p>
            </div>
            <div>
              <p className="text-kal-muted text-xs">Spots remaining</p>
              <p className="font-semibold tabular-nums">{data.activeBatch.spotsRemaining}</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

"use client";

import Link from "next/link";

import type { ActivationSnapshot } from "@/lib/admin/queries/featureEventQueries";
import { AdminKpiCard } from "@/components/admin/AdminKpiCard";

export function AdminActivationClient({ data }: { data: ActivationSnapshot }) {
  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-semibold text-kal-text">Activation</h1>
        <p className="mt-1 text-sm text-kal-muted">
          Profile milestones + activity logs. Full funnels:{" "}
          <Link href="/admin/journey" className="text-kal-accent underline">
            Journey
          </Link>
          .
        </p>
      </div>

      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <AdminKpiCard label="Profiles (all)" value={data.profilesSampled} />
        <AdminKpiCard
          label="Onboarding complete"
          value={`${data.onboardingPct.toFixed(0)}%`}
          sub={`${data.onboardingCompleted} users`}
        />
        <AdminKpiCard
          label="Track / exam goal set"
          value={`${data.targetExamPct.toFixed(0)}%`}
          sub={`${data.withTargetExam} users`}
        />
        <AdminKpiCard label="Mastermind (events, users)" value={data.prepbrainUserCount} />
        <AdminKpiCard label="Voice (events, users)" value={data.voiceUserCount} />
      </div>

      <div>
        <h2 className="text-lg font-semibold text-kal-text">Retention scoreboard (30d cohort)</h2>
        <div className="mt-3 grid grid-cols-2 gap-3 md:grid-cols-4">
          <AdminKpiCard label="Signups (30d)" value={data.cohortSignups30d} />
          <AdminKpiCard
            label="Activation rate"
            value={`${data.activationRatePct30d.toFixed(0)}%`}
            sub="Onboarded + syllabus aha"
          />
          <AdminKpiCard
            label="Day-1 return"
            value={`${data.day1RetentionPct30d.toFixed(0)}%`}
            sub="Eligible cohort ≥2d old"
          />
          <AdminKpiCard label="Explorer (1 session)" value={data.explorerCount} />
          <AdminKpiCard
            label="Median TTFA"
            value={
              data.medianTtfaSeconds != null
                ? data.medianTtfaSeconds < 60
                  ? `${data.medianTtfaSeconds}s`
                  : `${Math.round(data.medianTtfaSeconds / 60)}m`
                : "—"
            }
            sub="Time to first value"
          />
        </div>
      </div>

      {data.summary && (
        <div className="rounded-2xl border border-kal-border bg-kal-card/40 p-4">
          <h2 className="text-sm font-semibold text-kal-text mb-2">Feature events (14d)</h2>
          <p className="text-xs text-kal-muted mb-2">Total: {data.summary.totalEvents}</p>
          <div className="grid md:grid-cols-2 gap-4 text-sm">
            <ul className="space-y-1">
              {data.summary.byFeature.map((f) => (
                <li key={f.feature} className="flex justify-between">
                  <span>{f.feature}</span>
                  <span className="tabular-nums text-kal-muted">{f.count}</span>
                </li>
              ))}
            </ul>
            <ul className="space-y-1">
              {data.summary.byEvent.slice(0, 15).map((f) => (
                <li key={f.event} className="flex justify-between gap-2">
                  <span className="truncate">{f.event}</span>
                  <span className="tabular-nums text-kal-muted">{f.count}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}
    </div>
  );
}

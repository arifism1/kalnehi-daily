"use client";

import Link from "next/link";
import { Bar, BarChart, CartesianGrid, Cell, Tooltip, XAxis, YAxis } from "recharts";

import type { JourneySnapshot } from "@/lib/admin/queries/journeyQueries";
import { formatVoiceDuration } from "@/lib/admin/queries/journeyQueries";
import { AdminChart } from "@/components/admin/AdminChart";
import { AdminKpiCard } from "@/components/admin/AdminKpiCard";

function formatTtfa(seconds: number | null): string {
  if (seconds == null) return "—";
  if (seconds < 60) return `${seconds}s`;
  return `${Math.round(seconds / 60)}m`;
}

function FunnelChart({ steps, title }: { steps: JourneySnapshot["onboardingFunnel"]; title: string }) {
  return (
    <div className="rounded-2xl border border-kal-border bg-kal-card/40 p-4">
      <h2 className="text-sm font-semibold text-kal-text mb-3">{title}</h2>
      <AdminChart height={220}>
        <BarChart data={steps} layout="vertical" margin={{ left: 8, right: 16 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="var(--kal-border)" />
          <XAxis type="number" tick={{ fontSize: 10 }} />
          <YAxis type="category" dataKey="label" width={120} tick={{ fontSize: 9 }} />
          <Tooltip />
          <Bar dataKey="count" fill="oklch(0.52 0.12 160)" radius={[0, 4, 4, 0]} />
        </BarChart>
      </AdminChart>
    </div>
  );
}

export function AdminJourneyClient({ data }: { data: JourneySnapshot }) {
  const ns = data.northStar;

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-semibold text-kal-text">Aspirant journey</h1>
        <p className="mt-1 text-sm text-kal-muted">
          Product retention, activation, and funnels ({data.windowDays}d activity window). True north: did they
          come back tomorrow?
        </p>
        <p className="mt-2 text-xs text-kal-muted">
          Subscription retention lives on{" "}
          <Link href="/admin/retention" className="text-kal-accent underline">
            Retention
          </Link>
          . Activation milestones on{" "}
          <Link href="/admin/activation" className="text-kal-accent underline">
            Activation
          </Link>
          .
        </p>
      </div>

      <div>
        <h2 className="text-lg font-semibold text-kal-text">North star</h2>
        <div className="mt-3 grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-5">
          <AdminKpiCard
            label="Day-1 retention"
            value={`${ns.day1RetentionPct.toFixed(0)}%`}
            sub="Cohort 2–30d old"
          />
          <AdminKpiCard
            label="Day-7 retention"
            value={`${ns.day7RetentionPct.toFixed(0)}%`}
            sub="Cohort 8–30d old"
          />
          <AdminKpiCard
            label="Activation rate"
            value={`${ns.activationRatePct.toFixed(0)}%`}
            sub="Onboarded + value action"
          />
          <AdminKpiCard
            label="Median TTFA"
            value={formatTtfa(ns.medianTtfaSeconds)}
            sub={`p75 ${formatTtfa(ns.p75TtfaSeconds)}`}
          />
          <AdminKpiCard
            label="Avg session (active)"
            value={ns.avgSessionMinutes7d != null ? `${ns.avgSessionMinutes7d.toFixed(1)} min` : "—"}
            sub="7d among active users"
          />
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <FunnelChart steps={data.onboardingFunnel} title="Onboarding funnel" />
        <FunnelChart steps={data.activationFunnel} title="Activation funnel" />
      </div>

      <div>
        <h2 className="text-lg font-semibold text-kal-text">Retention & churn</h2>
        <div className="mt-3 grid grid-cols-2 gap-3 md:grid-cols-5">
          <AdminKpiCard label="DAU (7d active)" value={data.retention.dau} />
          <AdminKpiCard label="WAU" value={data.retention.wau} sub="Same 7d window" />
          <AdminKpiCard label="MAU" value={data.retention.mau} sub="30d active days" />
          <AdminKpiCard label="Inactive 7d+" value={data.retention.churned7d} sub="No foreground time" />
          <AdminKpiCard label="Inactive 14d+" value={data.retention.churned14d} />
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="rounded-2xl border border-kal-border bg-kal-card/40 p-4">
          <h2 className="text-sm font-semibold text-kal-text mb-2">Feature usage (events)</h2>
          {data.featureUsage.length === 0 ? (
            <p className="text-sm text-kal-muted">No feature events in window.</p>
          ) : (
            <ul className="space-y-1 text-sm">
              {data.featureUsage.map((f) => (
                <li key={f.feature} className="flex justify-between gap-2">
                  <span>{f.feature}</span>
                  <span className="tabular-nums text-kal-muted">{f.count}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
        <div className="rounded-2xl border border-kal-border bg-kal-card/40 p-4">
          <h2 className="text-sm font-semibold text-kal-text mb-2">AI & study (7d)</h2>
          <dl className="grid gap-2 text-sm">
            <div className="flex justify-between">
              <dt className="text-kal-muted">Mastermind messages</dt>
              <dd className="font-medium tabular-nums">{data.aiUsage.questionsLast7d}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-kal-muted">Repeat AI users</dt>
              <dd className="font-medium tabular-nums">{data.aiUsage.repeatUsersLast7d}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-kal-muted">Tasks created</dt>
              <dd className="font-medium tabular-nums">{data.studyBehavior.tasksCreated7d}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-kal-muted">Tasks completed</dt>
              <dd className="font-medium tabular-nums">{data.studyBehavior.tasksCompleted7d}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-kal-muted">Study sessions</dt>
              <dd className="font-medium tabular-nums">{data.studyBehavior.studySessions7d}</dd>
            </div>
          </dl>
        </div>
        <div className="rounded-2xl border border-kal-border bg-kal-card/40 p-4">
          <h2 className="text-sm font-semibold text-kal-text mb-2">Voice usage (7d)</h2>
          <dl className="grid gap-2 text-sm">
            <div className="flex justify-between">
              <dt className="text-kal-muted">Total voice time</dt>
              <dd className="font-medium tabular-nums">
                {formatVoiceDuration(data.voiceUsage.totalSeconds7d)}
              </dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-kal-muted">Instructions</dt>
              <dd className="font-medium tabular-nums">{data.voiceUsage.totalInstructions7d}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-kal-muted">Users with voice</dt>
              <dd className="font-medium tabular-nums">{data.voiceUsage.usersWithVoice7d}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-kal-muted">Avg / voice user</dt>
              <dd className="font-medium tabular-nums">
                {formatVoiceDuration(Math.round(data.voiceUsage.avgSecondsPerVoiceUser7d))}
              </dd>
            </div>
          </dl>
          {data.voiceUsage.byFeature.length > 0 ? (
            <ul className="mt-3 space-y-1 border-t border-kal-border pt-2 text-xs">
              {data.voiceUsage.byFeature.slice(0, 5).map((f) => (
                <li key={f.feature} className="flex justify-between gap-2">
                  <span className="text-kal-muted">{f.feature}</span>
                  <span className="tabular-nums">
                    {f.instructions} · {formatVoiceDuration(f.seconds)}
                  </span>
                </li>
              ))}
            </ul>
          ) : null}
        </div>
      </div>

      <div>
        <h2 className="text-lg font-semibold text-kal-text">User segments</h2>
        <AdminChart height={200}>
          <BarChart data={data.segments}>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--kal-border)" />
            <XAxis dataKey="segment" tick={{ fontSize: 9 }} angle={-25} textAnchor="end" height={50} />
            <YAxis tick={{ fontSize: 10 }} />
            <Tooltip />
            <Bar dataKey="count" radius={[4, 4, 0, 0]}>
              {data.segments.map((_, i) => (
                <Cell key={i} fill={`oklch(${0.45 + i * 0.04} 0.1 160)`} />
              ))}
            </Bar>
          </BarChart>
        </AdminChart>
      </div>

      <div className="rounded-2xl border border-kal-border bg-kal-card/40 p-4 overflow-x-auto">
        <h2 className="text-sm font-semibold text-kal-text mb-3">Sample users (metrics rollup)</h2>
        <table className="w-full min-w-[720px] text-left text-xs">
          <thead>
            <tr className="border-b border-kal-border text-[10px] font-bold uppercase tracking-wider text-kal-muted">
              <th className="py-2 pr-2">Exam</th>
              <th className="py-2 pr-2">Segment</th>
              <th className="py-2 pr-2">Signup</th>
              <th className="py-2 pr-2">Last active</th>
              <th className="py-2 pr-2">Sessions</th>
              <th className="py-2 pr-2">Streak</th>
              <th className="py-2 pr-2">D1</th>
              <th className="py-2 pr-2">D7</th>
              <th className="py-2 pr-2">Voice 7d</th>
              <th className="py-2 pr-2">Instructions 7d</th>
              <th className="py-2">Activated</th>
            </tr>
          </thead>
          <tbody>
            {data.segmentUsers.map((u) => (
              <tr key={u.userId} className="border-b border-kal-border/40">
                <td className="py-2 pr-2">{u.exam}</td>
                <td className="py-2 pr-2 capitalize">{u.segment.replace("_", " ")}</td>
                <td className="py-2 pr-2 tabular-nums">
                  {u.signupAt ? new Date(u.signupAt).toLocaleDateString("en-IN") : "—"}
                </td>
                <td className="py-2 pr-2 tabular-nums">
                  {u.lastActiveAt ? new Date(u.lastActiveAt).toLocaleDateString("en-IN") : "—"}
                </td>
                <td className="py-2 pr-2 tabular-nums">{u.totalSessions}</td>
                <td className="py-2 pr-2 tabular-nums">{u.currentStreak}</td>
                <td className="py-2 pr-2">{u.returnedDay1 ? "Yes" : "—"}</td>
                <td className="py-2 pr-2">{u.returnedDay7 ? "Yes" : "—"}</td>
                <td className="py-2 pr-2 tabular-nums">{formatVoiceDuration(u.voiceSeconds7d)}</td>
                <td className="py-2 pr-2 tabular-nums">{u.voiceInstructions7d}</td>
                <td className="py-2">{u.activated ? "Yes" : "—"}</td>
              </tr>
            ))}
          </tbody>
        </table>
        <p className="mt-2 text-[11px] text-kal-muted">
          Full lookup:{" "}
          <Link href="/admin/users" className="text-kal-accent underline">
            User lookup
          </Link>
        </p>
      </div>
    </div>
  );
}

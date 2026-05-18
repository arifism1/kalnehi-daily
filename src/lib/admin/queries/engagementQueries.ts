import { addDaysISTKey, todayISTKey } from "@/lib/admin/istDates";
import { fetchFeatureEventsSince } from "@/lib/admin/queries/featureEventQueries";
import type { FeatureEventSummary } from "@/lib/admin/queries/featureEventQueries";
import { getSupabaseServiceRoleClient } from "@/lib/supabase/serviceRoleClient";

function summarizeEventsLocal(
  list: { feature: string; event: string; created_at: string; user_id: string }[],
): FeatureEventSummary {
  const byFeature = new Map<string, number>();
  const byEvent = new Map<string, number>();
  for (const r of list) {
    byFeature.set(r.feature, (byFeature.get(r.feature) ?? 0) + 1);
    byEvent.set(r.event, (byEvent.get(r.event) ?? 0) + 1);
  }
  return {
    totalEvents: list.length,
    byFeature: [...byFeature.entries()]
      .sort((a, b) => b[1] - a[1])
      .map(([feature, count]) => ({ feature, count })),
    byEvent: [...byEvent.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 25)
      .map(([event, count]) => ({ event, count })),
    recentSamples: [...list].sort((a, b) => b.created_at.localeCompare(a.created_at)).slice(0, 20),
  };
}

function num(v: unknown): number {
  if (typeof v === "number" && Number.isFinite(v)) return v;
  if (typeof v === "string" && v.trim() !== "" && !Number.isNaN(Number(v))) return Number(v);
  return 0;
}

function parseActiveSummary(raw: unknown): {
  total_seconds: number;
  distinct_users: number;
  by_day: { day: string; total_seconds: number }[];
} | null {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return null;
  const o = raw as Record<string, unknown>;
  const bd = o.by_day;
  if (!Array.isArray(bd)) return null;
  const rows: { day: string; total_seconds: number }[] = [];
  for (const item of bd) {
    if (!item || typeof item !== "object") continue;
    const r = item as Record<string, unknown>;
    const day = r.day;
    if (typeof day !== "string") continue;
    rows.push({ day, total_seconds: num(r.total_seconds) });
  }
  return {
    total_seconds: num(o.total_seconds),
    distinct_users: num(o.distinct_users),
    by_day: rows,
  };
}

export type EngagementSnapshot = {
  trialUsersApprox: number;
  studySessionsLast7d: number;
  voiceEntriesLast7d: number;
  prepbrainConversationsLast7d: number;
  featureSummary: FeatureEventSummary | null;
  tokenHitRateTrialPct: number;
  /** Null until migrations + RPC deployed or RPC fails. */
  activeTime: {
    hoursLast7d: number;
    hoursLast30d: number;
    distinctUsersLast7d: number;
    avgDailyMinutesAmongActiveLast7d: number;
    minutesByDayLast7d: { day: string; minutes: number }[];
  } | null;
};

const TRIAL_CAP = 60_000;

export async function getEngagementSnapshot(): Promise<EngagementSnapshot | null> {
  const admin = getSupabaseServiceRoleClient();
  if (!admin) return null;

  const since = new Date(Date.now() - 7 * 24 * 3600 * 1000).toISOString();

  const today = todayISTKey();
  const from7 = addDaysISTKey(today, -6);
  const from30 = addDaysISTKey(today, -29);

  const [
    events,
    { data: activityLogs },
    { count: sessCount },
    { count: voiceCount },
    { count: convCount },
    { data: trials },
    res7,
    res30,
  ] = await Promise.all([
    fetchFeatureEventsSince(since),
    admin
      .from("user_activity_logs")
      .select("feature, action, created_at, user_id")
      .gte("created_at", since)
      .limit(8000),
    admin
      .from("study_sessions")
      .select("id", { count: "exact", head: true })
      .gte("started_at", since),
    admin
      .from("voice_timeline_entries")
      .select("id", { count: "exact", head: true })
      .gte("created_at", since),
    admin
      .from("prepbrain_conversations")
      .select("id", { count: "exact", head: true })
      .gte("created_at", since),
    admin
      .from("user_profiles")
      .select(
        "welcome_ai_tokens_used, subscription_status, subscription_end_date, has_used_free_trial, has_had_trial",
      )
      .or("has_used_free_trial.eq.true,has_had_trial.eq.true"),
    admin.rpc("admin_active_time_summary", { p_from: from7, p_to: today }),
    admin.rpc("admin_active_time_summary", { p_from: from30, p_to: today }),
  ]);

  if (res7.error) {
    console.warn("[admin] admin_active_time_summary 7d:", res7.error.message);
  }
  if (res30.error) {
    console.warn("[admin] admin_active_time_summary 30d:", res30.error.message);
  }

  const a7 = parseActiveSummary(res7.data as unknown);
  const a30 = parseActiveSummary(res30.data as unknown);

  let activeTime: EngagementSnapshot["activeTime"] = null;
  if (a7 && a30 && !res7.error && !res30.error) {
    const dayKeys7: string[] = [];
    for (let i = 6; i >= 0; i--) dayKeys7.push(addDaysISTKey(today, -i));
    const map7 = new Map(a7.by_day.map((r) => [r.day, r.total_seconds]));

    activeTime = {
      hoursLast7d: a7.total_seconds / 3600,
      hoursLast30d: a30.total_seconds / 3600,
      distinctUsersLast7d: a7.distinct_users,
      avgDailyMinutesAmongActiveLast7d:
        a7.distinct_users > 0 ? a7.total_seconds / a7.distinct_users / 7 / 60 : 0,
      minutesByDayLast7d: dayKeys7.map((day) => ({
        day,
        minutes: Math.round(((map7.get(day) ?? 0) / 60) * 10) / 10,
      })),
    };
  }

  const trialProfiles = (trials ?? []) as {
    welcome_ai_tokens_used: number | null;
    subscription_status: string | null;
    subscription_end_date: string | null;
    has_used_free_trial: boolean | null;
    has_had_trial: boolean | null;
  }[];

  const isPaid = (p: (typeof trialProfiles)[0]) =>
    (p.subscription_status === "active" || p.subscription_status === "cancelled") &&
    p.subscription_end_date &&
    new Date(p.subscription_end_date) > new Date();

  const activeTrials = trialProfiles.filter((p) => !isPaid(p));
  const hits = activeTrials.filter((p) => (p.welcome_ai_tokens_used ?? 0) >= TRIAL_CAP * 0.9).length;

  return {
    trialUsersApprox: activeTrials.length,
    studySessionsLast7d: sessCount ?? 0,
    voiceEntriesLast7d: voiceCount ?? 0,
    prepbrainConversationsLast7d: convCount ?? 0,
    featureSummary: (() => {
      const activityAsEvents = ((activityLogs ?? []) as { feature: string | null; action: string; created_at: string; user_id: string }[]).map(
        (r) => ({
          feature: r.feature ?? "app",
          event: r.action,
          created_at: r.created_at,
          user_id: r.user_id,
        }),
      );
      const merged = [...events, ...activityAsEvents];
      return merged.length ? summarizeEventsLocal(merged) : null;
    })(),
    tokenHitRateTrialPct: activeTrials.length > 0 ? (hits / activeTrials.length) * 100 : 0,
    activeTime,
  };
}

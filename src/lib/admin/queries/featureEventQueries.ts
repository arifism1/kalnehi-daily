import { JourneyAction } from "@/lib/analytics/journeyEvents";
import { getSupabaseServiceRoleClient } from "@/lib/supabase/serviceRoleClient";

import { profileHasExamGoalSet } from "@/lib/profileTrackSegment";

export type FeatureEventRow = {
  feature: string;
  event: string;
  created_at: string;
  user_id: string;
};

export type FeatureEventSummary = {
  totalEvents: number;
  byFeature: { feature: string; count: number }[];
  byEvent: { event: string; count: number }[];
  recentSamples: FeatureEventRow[];
};

function summarizeEvents(list: FeatureEventRow[]): FeatureEventSummary {
  const byFeature = new Map<string, number>();
  const byEvent = new Map<string, number>();
  for (const r of list) {
    byFeature.set(r.feature, (byFeature.get(r.feature) ?? 0) + 1);
    byEvent.set(r.event, (byEvent.get(r.event) ?? 0) + 1);
  }
  return {
    totalEvents: list.length,
    byFeature: [...byFeature.entries()]
      .toSorted((a, b) => b[1] - a[1])
      .map(([feature, count]) => ({ feature, count })),
    byEvent: [...byEvent.entries()]
      .toSorted((a, b) => b[1] - a[1])
      .slice(0, 30)
      .map(([event, count]) => ({ event, count })),
    recentSamples: [...list].toSorted((a, b) => b.created_at.localeCompare(a.created_at)).slice(0, 25),
  };
}

export async function fetchFeatureEventsSince(sinceIso: string): Promise<FeatureEventRow[]> {
  const admin = getSupabaseServiceRoleClient();
  if (!admin) return [];

  const { data, error } = await admin
    .from("feature_events")
    .select("feature, event, created_at, user_id")
    .gte("created_at", sinceIso)
    .limit(8000);

  if (error) {
    console.warn("[admin] feature_events", error.message);
    return [];
  }
  return (data ?? []) as FeatureEventRow[];
}

export async function getFeatureEventSummarySince(sinceIso: string): Promise<FeatureEventSummary | null> {
  const rows = await fetchFeatureEventsSince(sinceIso);
  if (rows.length === 0) return null;
  return summarizeEvents(rows);
}

export type ActivationSnapshot = {
  profilesSampled: number;
  onboardingCompleted: number;
  onboardingPct: number;
  withTargetExam: number;
  targetExamPct: number;
  prepbrainUserCount: number;
  voiceUserCount: number;
  /** Recent cohort (30d signups) */
  cohortSignups30d: number;
  activationRatePct30d: number;
  day1RetentionPct30d: number;
  explorerCount: number;
  medianTtfaSeconds: number | null;
  summary: FeatureEventSummary | null;
};

export async function getActivationSnapshot(): Promise<ActivationSnapshot | null> {
  const admin = getSupabaseServiceRoleClient();
  if (!admin) return null;

  const since = new Date(Date.now() - 14 * 24 * 3600 * 1000).toISOString();

  const [{ data: profiles }, events, { data: activityRows }, { data: voiceRows }, { data: journeyMetrics }] =
    await Promise.all([
    admin
      .from("user_profiles")
      .select("mandatory_onboarding_completed_at, target_exam, primary_exam, selected_track, user_id"),
    fetchFeatureEventsSince(since),
    admin
      .from("user_activity_logs")
      .select("user_id, action, feature")
      .gte("created_at", since)
      .in("action", [JourneyAction.AI_CHAT_SENT])
      .limit(8000),
    admin
      .from("voice_ai_usage_log")
      .select("user_id")
      .gte("created_at", since)
      .limit(8000),
    admin.from("user_journey_metrics" as never).select("*").limit(5000),
  ]);

  const profs = (profiles ?? []) as {
    mandatory_onboarding_completed_at: string | null;
    target_exam: string | null;
    primary_exam: string | null;
    selected_track: string | null;
    user_id: string | null;
  }[];

  const n = profs.length;
  const onboardingCompleted = profs.filter((p) => p.mandatory_onboarding_completed_at).length;
  const withTargetExam = profs.filter((p) => profileHasExamGoalSet(p)).length;

  const prepbrainFromActivity = (activityRows ?? []) as { user_id: string }[];
  const prepbrainUserCount = new Set([
    ...prepbrainFromActivity.map((r) => r.user_id),
    // react-doctor-disable-next-line react-doctor/js-combine-iterations -- filter-then-map for deduplication into Set; readable as-is
    ...events.filter((e) => e.feature === "prepbrain").map((e) => e.user_id),
  ]).size;
  const voiceUserCount = new Set([
    ...((voiceRows ?? []) as { user_id: string }[]).map((r) => r.user_id),
    // react-doctor-disable-next-line react-doctor/js-combine-iterations -- filter-then-map for deduplication into Set; readable as-is
    ...events.filter((e) => e.feature === "voice").map((e) => e.user_id),
  ]).size;

  const cohortSince = new Date(Date.now() - 30 * 24 * 3600 * 1000).toISOString();
  type MetricsRow = {
    signup_at: string | null;
    activated_at: string | null;
    returned_day_1: boolean;
    segment: string;
    time_to_first_value_seconds: number | null;
  };
  const metrics = (journeyMetrics ?? []) as MetricsRow[];
  const cohortUsers = metrics.filter(
    (m) => m.signup_at && new Date(m.signup_at).getTime() >= new Date(cohortSince).getTime(),
  );
  const d1Eligible = cohortUsers.filter((m) => {
    if (!m.signup_at) return false;
    const ageDays = (Date.now() - new Date(m.signup_at).getTime()) / (24 * 3600 * 1000);
    return ageDays >= 2;
  });
  const activationRatePct30d =
    cohortUsers.length > 0
      ? (cohortUsers.filter((m) => m.activated_at).length / cohortUsers.length) * 100
      : 0;
  const day1RetentionPct30d =
    d1Eligible.length > 0
      ? (d1Eligible.filter((m) => m.returned_day_1).length / d1Eligible.length) * 100
      : 0;
  const explorerCount = metrics.filter((m) => m.segment === "explorer").length;
  const ttfaValues = metrics
    .map((m) => m.time_to_first_value_seconds)
    .filter((v): v is number => typeof v === "number" && v >= 0);
  const medianTtfaSeconds =
    ttfaValues.length > 0
      ? (() => {
          const s = [...ttfaValues].toSorted((a, b) => a - b);
          const mid = Math.floor(s.length / 2);
          return s.length % 2 ? s[mid]! : (s[mid - 1]! + s[mid]!) / 2;
        })()
      : null;

  return {
    profilesSampled: n,
    onboardingCompleted,
    onboardingPct: n > 0 ? (onboardingCompleted / n) * 100 : 0,
    withTargetExam,
    targetExamPct: n > 0 ? (withTargetExam / n) * 100 : 0,
    prepbrainUserCount,
    voiceUserCount,
    cohortSignups30d: cohortUsers.length,
    activationRatePct30d,
    day1RetentionPct30d,
    explorerCount,
    medianTtfaSeconds,
    summary: events.length ? summarizeEvents(events) : null,
  };
}

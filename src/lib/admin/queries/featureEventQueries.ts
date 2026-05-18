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
      .sort((a, b) => b[1] - a[1])
      .map(([feature, count]) => ({ feature, count })),
    byEvent: [...byEvent.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 30)
      .map(([event, count]) => ({ event, count })),
    recentSamples: [...list].sort((a, b) => b.created_at.localeCompare(a.created_at)).slice(0, 25),
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
  summary: FeatureEventSummary | null;
};

export async function getActivationSnapshot(): Promise<ActivationSnapshot | null> {
  const admin = getSupabaseServiceRoleClient();
  if (!admin) return null;

  const since = new Date(Date.now() - 14 * 24 * 3600 * 1000).toISOString();

  const [{ data: profiles }, events, { data: activityRows }, { data: voiceRows }] = await Promise.all([
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
    ...events.filter((e) => e.feature === "prepbrain").map((e) => e.user_id),
  ]).size;
  const voiceUserCount = new Set([
    ...((voiceRows ?? []) as { user_id: string }[]).map((r) => r.user_id),
    ...events.filter((e) => e.feature === "voice").map((e) => e.user_id),
  ]).size;

  return {
    profilesSampled: n,
    onboardingCompleted,
    onboardingPct: n > 0 ? (onboardingCompleted / n) * 100 : 0,
    withTargetExam,
    targetExamPct: n > 0 ? (withTargetExam / n) * 100 : 0,
    prepbrainUserCount,
    voiceUserCount,
    summary: events.length ? summarizeEvents(events) : null,
  };
}

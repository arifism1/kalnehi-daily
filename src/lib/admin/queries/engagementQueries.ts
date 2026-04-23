import { getSupabaseServiceRoleClient } from "@/lib/supabase/serviceRoleClient";

import { fetchFeatureEventsSince } from "@/lib/admin/queries/featureEventQueries";
import type { FeatureEventSummary } from "@/lib/admin/queries/featureEventQueries";

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

export type EngagementSnapshot = {
  trialUsersApprox: number;
  studySessionsLast7d: number;
  voiceEntriesLast7d: number;
  prepbrainConversationsLast7d: number;
  featureSummary: FeatureEventSummary | null;
  tokenHitRateTrialPct: number;
};

const TRIAL_CAP = 60_000;

export async function getEngagementSnapshot(): Promise<EngagementSnapshot | null> {
  const admin = getSupabaseServiceRoleClient();
  if (!admin) return null;

  const since = new Date(Date.now() - 7 * 24 * 3600 * 1000).toISOString();

  const [events, { count: sessCount }, { count: voiceCount }, { count: convCount }, { data: trials }] =
    await Promise.all([
      fetchFeatureEventsSince(since),
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
        .select("welcome_ai_tokens_used, subscription_status, subscription_end_date, has_used_free_trial, has_had_trial")
        .or("has_used_free_trial.eq.true,has_had_trial.eq.true"),
    ]);

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
    featureSummary: events.length ? summarizeEventsLocal(events) : null,
    tokenHitRateTrialPct: activeTrials.length > 0 ? (hits / activeTrials.length) * 100 : 0,
  };
}

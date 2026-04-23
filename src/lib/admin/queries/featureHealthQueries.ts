import { getSupabaseServiceRoleClient } from "@/lib/supabase/serviceRoleClient";

import { fetchFeatureEventsSince } from "@/lib/admin/queries/featureEventQueries";

export type FeatureHealthSnapshot = {
  adoptionByFeature: { feature: string; uniqueUsers: number }[];
  correlationHints: { feature: string; payingWithFeature: number; payingTotal: number; pct: number }[];
};

export async function getFeatureHealthSnapshot(): Promise<FeatureHealthSnapshot | null> {
  const admin = getSupabaseServiceRoleClient();
  if (!admin) return null;

  const since = new Date(Date.now() - 30 * 24 * 3600 * 1000).toISOString();
  const events = await fetchFeatureEventsSince(since);

  const byFeatureUsers = new Map<string, Set<string>>();
  for (const e of events) {
    if (!byFeatureUsers.has(e.feature)) byFeatureUsers.set(e.feature, new Set());
    byFeatureUsers.get(e.feature)!.add(e.user_id);
  }

  const adoptionByFeature = [...byFeatureUsers.entries()]
    .map(([feature, set]) => ({ feature, uniqueUsers: set.size }))
    .sort((a, b) => b.uniqueUsers - a.uniqueUsers);

  const { data: profiles } = await admin
    .from("user_profiles")
    .select("user_id, subscription_status, subscription_end_date");

  const profs = (profiles ?? []) as {
    user_id: string | null;
    subscription_status: string | null;
    subscription_end_date: string | null;
  }[];

  const paying = profs.filter(
    (p) =>
      (p.subscription_status === "active" || p.subscription_status === "cancelled") &&
      p.subscription_end_date &&
      new Date(p.subscription_end_date) > new Date() &&
      p.user_id,
  );
  const payingTotal = paying.length;
  const payingIdSet = new Set(paying.map((p) => p.user_id!));

  const correlationHints = adoptionByFeature.map(({ feature }) => {
    const usersWith = byFeatureUsers.get(feature) ?? new Set();
    let payingWithFeature = 0;
    for (const id of usersWith) {
      if (payingIdSet.has(id)) payingWithFeature++;
    }
    return {
      feature,
      payingWithFeature,
      payingTotal,
      pct: payingTotal > 0 ? (payingWithFeature / payingTotal) * 100 : 0,
    };
  });

  return { adoptionByFeature, correlationHints: correlationHints.sort((a, b) => b.pct - a.pct) };
}

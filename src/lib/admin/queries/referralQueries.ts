import { getSupabaseServiceRoleClient } from "@/lib/supabase/serviceRoleClient";

export type ReferralCodeRow = {
  id: string;
  code: string;
  description: string | null;
  campaign: string | null;
  is_active: boolean;
  created_at: string;
  clicks: number;
  signups: number;
  trials: number;
  conversions: number;
};

export type ReferralDailyRow = {
  day: string;
  signups: number;
};

export type ReferralSnapshot = {
  codes: ReferralCodeRow[];
  daily: ReferralDailyRow[];
  totals: {
    clicks: number;
    signups: number;
    trials: number;
    conversions: number;
  };
};

export async function getReferralSnapshot(): Promise<ReferralSnapshot | null> {
  const admin = getSupabaseServiceRoleClient();
  if (!admin) return null;

  const since = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();

  const [{ data: codesData }, { data: eventsData }] = await Promise.all([
    admin
      .from("referral_codes" as never)
      .select("id, code, description, campaign, is_active, created_at")
      .order("created_at" as never, { ascending: false }),
    admin
      .from("referral_events" as never)
      .select("code, event_type, created_at")
      .gte("created_at" as never, since),
  ]);

  const codes = (codesData ?? []) as {
    id: string;
    code: string;
    description: string | null;
    campaign: string | null;
    is_active: boolean;
    created_at: string;
  }[];

  const events = (eventsData ?? []) as {
    code: string | null;
    event_type: string;
    created_at: string;
  }[];

  // Aggregate events per code.
  type Counts = { clicks: number; signups: number; trials: number; conversions: number };
  const byCode = new Map<string, Counts>();

  for (const ev of events) {
    const key = ev.code ?? "__unknown__";
    if (!byCode.has(key)) byCode.set(key, { clicks: 0, signups: 0, trials: 0, conversions: 0 });
    const c = byCode.get(key)!;
    if (ev.event_type === "link_clicked") c.clicks++;
    else if (ev.event_type === "signup_completed") c.signups++;
    else if (ev.event_type === "trial_started") c.trials++;
    else if (ev.event_type === "converted_to_paid") c.conversions++;
  }

  const codeRows: ReferralCodeRow[] = codes.map((c) => {
    const counts = byCode.get(c.code) ?? { clicks: 0, signups: 0, trials: 0, conversions: 0 };
    return { ...c, ...counts };
  });

  // Daily signup volume.
  const dailyMap = new Map<string, number>();
  for (const ev of events) {
    if (ev.event_type !== "signup_completed") continue;
    const day = ev.created_at.slice(0, 10);
    dailyMap.set(day, (dailyMap.get(day) ?? 0) + 1);
  }
  const daily: ReferralDailyRow[] = Array.from(dailyMap.entries())
    .map(([day, signups]) => ({ day, signups }))
    .sort((a, b) => a.day.localeCompare(b.day));

  // Grand totals.
  let totals = { clicks: 0, signups: 0, trials: 0, conversions: 0 };
  for (const c of byCode.values()) {
    totals = {
      clicks: totals.clicks + c.clicks,
      signups: totals.signups + c.signups,
      trials: totals.trials + c.trials,
      conversions: totals.conversions + c.conversions,
    };
  }

  return { codes: codeRows, daily, totals };
}

export async function toggleReferralCodeActive(
  id: string,
  isActive: boolean,
): Promise<{ ok: boolean }> {
  const admin = getSupabaseServiceRoleClient();
  if (!admin) return { ok: false };
  const { error } = await admin
    .from("referral_codes" as never)
    .update({ is_active: isActive } as never)
    .eq("id" as never, id);
  return { ok: !error };
}

export async function createReferralCode(params: {
  code: string;
  description: string;
  campaign: string;
}): Promise<{ ok: boolean; error?: string }> {
  const admin = getSupabaseServiceRoleClient();
  if (!admin) return { ok: false, error: "Service unavailable." };
  const { error } = await admin.from("referral_codes" as never).insert({
    code: params.code.toUpperCase().trim(),
    description: params.description.trim(),
    campaign: params.campaign.trim(),
    is_active: true,
  } as never);
  if (error) return { ok: false, error: error.message };
  return { ok: true };
}

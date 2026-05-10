import { getSupabaseServiceRoleClient } from "@/lib/supabase/serviceRoleClient";

/** Same rolling window as `getAiUsageSnapshot` for apples-to-apples admin numbers. */
const SNAPSHOT_WINDOW_DAYS = 40;

export type UserAiUsageRollups = {
  prepbrainBilledTokens7d: number;
  prepbrainBilledTokens30d: number;
  prepbrainBilledTokensWindow: number;
  voiceTokens7d: number;
  voiceTokens30d: number;
  voiceTokensWindow: number;
  reservationCount30d: number;
  voiceCallCount30d: number;
};

const EMPTY: UserAiUsageRollups = {
  prepbrainBilledTokens7d: 0,
  prepbrainBilledTokens30d: 0,
  prepbrainBilledTokensWindow: 0,
  voiceTokens7d: 0,
  voiceTokens30d: 0,
  voiceTokensWindow: 0,
  reservationCount30d: 0,
  voiceCallCount30d: 0,
};

/**
 * Per-user Mastermind (PrepBrain reservation `estimate`) + voice Groq token totals
 * for 7d / 30d / full snapshot window (~40d). Service role only.
 */
export async function getUserAiUsageRollups(userId: string): Promise<UserAiUsageRollups> {
  const admin = getSupabaseServiceRoleClient();
  if (!admin) return { ...EMPTY };

  const sinceIso = new Date(Date.now() - SNAPSHOT_WINDOW_DAYS * 24 * 3600 * 1000).toISOString();
  const now = Date.now();
  const dayMs = 24 * 3600 * 1000;

  const [prepRes, voiceRes] = await Promise.all([
    admin
      .from("prepbrain_ai_token_reservations")
      .select("estimate, finalized_at")
      .eq("user_id", userId)
      .not("finalized_at", "is", null)
      .gte("finalized_at", sinceIso),
    admin
      .from("voice_ai_usage_log")
      .select("input_tokens, output_tokens, created_at")
      .eq("user_id", userId)
      .gte("created_at", sinceIso),
  ]);

  const prepRows = (prepRes.data ?? []) as { estimate: number; finalized_at: string }[];
  const voiceRows = (voiceRes.data ?? []) as {
    input_tokens: number;
    output_tokens: number;
    created_at: string;
  }[];

  let prep7 = 0;
  let prep30 = 0;
  let prepWin = 0;
  let resCount30 = 0;

  for (const r of prepRows) {
    const t = new Date(r.finalized_at).getTime();
    const est = Number.isFinite(r.estimate) ? r.estimate : 0;
    prepWin += est;
    if (now - t <= 7 * dayMs) prep7 += est;
    if (now - t <= 30 * dayMs) {
      prep30 += est;
      resCount30 += 1;
    }
  }

  let voice7 = 0;
  let voice30 = 0;
  let voiceWin = 0;
  let voiceCount30 = 0;

  for (const v of voiceRows) {
    const t = new Date(v.created_at).getTime();
    const tok = (v.input_tokens ?? 0) + (v.output_tokens ?? 0);
    voiceWin += tok;
    if (now - t <= 7 * dayMs) voice7 += tok;
    if (now - t <= 30 * dayMs) {
      voice30 += tok;
      voiceCount30 += 1;
    }
  }

  return {
    prepbrainBilledTokens7d: prep7,
    prepbrainBilledTokens30d: prep30,
    prepbrainBilledTokensWindow: prepWin,
    voiceTokens7d: voice7,
    voiceTokens30d: voice30,
    voiceTokensWindow: voiceWin,
    reservationCount30d: resCount30,
    voiceCallCount30d: voiceCount30,
  };
}

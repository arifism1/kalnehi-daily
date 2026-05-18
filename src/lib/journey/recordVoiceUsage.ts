import { JourneyAction } from "@/lib/analytics/journeyEvents";
import {
  clampVoiceBillingDurationSeconds,
} from "@/lib/voiceDurationBilling";
import { getSupabaseServiceRoleClient } from "@/lib/supabase/serviceRoleClient";

const FEATURE_RE = /^[a-z][a-z0-9_]{0,63}$/;

/** Seconds charged from explicit duration or billed fractional minutes. */
export function voiceSecondsFromBilling(
  durationSeconds?: number | null,
  billedMinutes?: number,
): number {
  if (durationSeconds != null && Number.isFinite(durationSeconds)) {
    return clampVoiceBillingDurationSeconds(durationSeconds);
  }
  if (billedMinutes != null && Number.isFinite(billedMinutes) && billedMinutes > 0) {
    return Math.max(0, Math.round(billedMinutes * 60));
  }
  return 0;
}

export type VoiceUsageFeature =
  | "voice_command"
  | "voice_draft"
  | "voice_consume"
  | "voice_transcribe"
  | "voice_revision"
  | "voice_doubt"
  | "voice_dictate"
  | "voice_time"
  | "voice_motivation"
  | (string & {});

/**
 * Records one billed voice interaction for journey analytics.
 * Call after successful quota charge only.
 */
export async function recordVoiceUsageEvent(
  userId: string,
  opts: { feature: VoiceUsageFeature; secondsCharged: number },
): Promise<void> {
  const admin = getSupabaseServiceRoleClient();
  if (!admin) return;

  const feature = FEATURE_RE.test(opts.feature) ? opts.feature : "voice_other";
  const seconds = Math.max(0, Math.round(opts.secondsCharged));
  const at = new Date().toISOString();

  const { error: insErr } = await admin.from("user_voice_usage_events" as never).insert({
    user_id: userId,
    feature,
    seconds_charged: seconds,
    created_at: at,
  } as never);
  if (insErr) {
    console.warn("[recordVoiceUsageEvent] insert:", insErr.message);
    return;
  }

  const { data: state } = await admin
    .from("user_journey_state" as never)
    .select("first_voice_instruction_at")
    .eq("user_id", userId)
    .maybeSingle();

  if (!(state as { first_voice_instruction_at?: string | null } | null)?.first_voice_instruction_at) {
    await admin.from("user_journey_state" as never).upsert({
      user_id: userId,
      first_voice_instruction_at: at,
      updated_at: at,
    } as never);
  }

  void admin.from("user_activity_logs").insert({
    user_id: userId,
    session_id: "voice-server",
    page: "/voice",
    feature: "voice",
    action: JourneyAction.VOICE_INSTRUCTION,
    metadata: { voice_feature: feature, seconds_charged: seconds },
    platform: "web",
    created_at: at,
  });
}

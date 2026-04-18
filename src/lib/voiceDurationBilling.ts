/** Server + client: clamp speaking duration used for voice quota billing. */

export const VOICE_BILLING_DURATION_SEC_MIN = 1;
export const VOICE_BILLING_DURATION_SEC_MAX = 300;
export const VOICE_BILLING_DURATION_SEC_DEFAULT = 60;

export function clampVoiceBillingDurationSeconds(input: unknown): number {
  if (input === undefined || input === null) {
    return VOICE_BILLING_DURATION_SEC_DEFAULT;
  }
  const n =
    typeof input === "number"
      ? input
      : typeof input === "string"
        ? Number(input)
        : Number.NaN;
  if (!Number.isFinite(n)) {
    return VOICE_BILLING_DURATION_SEC_DEFAULT;
  }
  const rounded = Math.round(n);
  return Math.min(
    VOICE_BILLING_DURATION_SEC_MAX,
    Math.max(VOICE_BILLING_DURATION_SEC_MIN, rounded),
  );
}

/** Minutes to pass to `incrementVoiceMinuteUsage` from an optional client-reported duration. */
export function voiceBillingMinutesFromOptionalDurationSeconds(
  durationSeconds?: number | null,
): number {
  if (durationSeconds == null || !Number.isFinite(durationSeconds)) {
    return VOICE_BILLING_DURATION_SEC_DEFAULT / 60;
  }
  return clampVoiceBillingDurationSeconds(durationSeconds) / 60;
}

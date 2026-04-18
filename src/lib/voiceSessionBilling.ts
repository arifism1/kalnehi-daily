/** Voice session duration billing: shared normalization for API + server actions. */

const DURATION_MIN = 1;
const DURATION_MAX = 300;
/** When `durationSeconds` is omitted or invalid, charge legacy default (full minute). */
const DURATION_DEFAULT_LEGACY = 60;

function toFiniteDurationNumber(raw: unknown): number | null {
  if (typeof raw === "number" && Number.isFinite(raw)) {
    return raw;
  }
  if (typeof raw === "string") {
    const t = raw.trim();
    if (!t) return null;
    const n = Number(t);
    if (Number.isFinite(n)) return n;
  }
  return null;
}

/**
 * If `durationSeconds` is missing or not parseable (number or numeric string) → 60 (legacy default).
 * If present (e.g. 45 or `"45"` from JSON) → clamp to [1, 300] (so explicit 0 becomes 1s, not 60s).
 */
export function normalizeDurationSecondsFromRequest(raw: unknown): number {
  const n = toFiniteDurationNumber(raw);
  if (n == null) return DURATION_DEFAULT_LEGACY;
  return Math.min(DURATION_MAX, Math.max(DURATION_MIN, Math.trunc(n)));
}

export function minutesFromDurationSeconds(seconds: number): number {
  return seconds / 60;
}

/** After API/request normalization; guards invalid values. */
export function clampBilledVoiceSeconds(n: number): number {
  if (!Number.isFinite(n)) return DURATION_DEFAULT_LEGACY;
  return Math.min(DURATION_MAX, Math.max(DURATION_MIN, Math.trunc(n)));
}

/** Coerce DB `numeric` / JSON values to a finite number for arithmetic. */
export function coerceVoiceMinutesUsed(raw: unknown): number {
  if (typeof raw === "number" && Number.isFinite(raw)) return raw;
  if (typeof raw === "string" && raw.trim() !== "") {
    const n = Number(raw);
    if (Number.isFinite(n)) return n;
  }
  return 0;
}

/** Fractional minutes → "14m 52s" (no suffix). */
export function formatVoiceMinutesClock(minutes: number): string {
  const sec = Math.max(0, Math.round(minutes * 60));
  if (sec <= 0) return "0s";
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return `${m}m ${s}s`;
}

/** Paid path: fractional minutes remaining → "14m 52s remaining". */
export function formatPaidVoiceTimeRemaining(remainingMinutes: number): string {
  return `${formatVoiceMinutesClock(remainingMinutes)} remaining`;
}

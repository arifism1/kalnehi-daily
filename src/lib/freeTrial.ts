/** Welcome trial: 1 calendar day from trial_started_at, separate from Razorpay 2-day paid trial. */
export const FREE_TRIAL_MS = 24 * 60 * 60 * 1000;
export const FREE_TRIAL_PHOTO_CAP = 5;
/** Five minutes of voice during welcome trial, stored as seconds in the database (RPC cap 300). */
export const FREE_TRIAL_VOICE_CAP_SECONDS = 5 * 60;

/** @deprecated use FREE_TRIAL_VOICE_CAP_SECONDS */
export const FREE_TRIAL_VOICE_CAP_MINUTES = 5;

export function isFreeTrialWindowActive(
  trialStartedAt: string | null | undefined,
  now: Date = new Date(),
): boolean {
  if (!trialStartedAt) return false;
  const start = new Date(trialStartedAt);
  if (Number.isNaN(start.getTime())) return false;
  return now.getTime() < start.getTime() + FREE_TRIAL_MS;
}

export function freeTrialEndsAt(
  trialStartedAt: string | null | undefined,
): Date | null {
  if (!trialStartedAt) return null;
  const start = new Date(trialStartedAt);
  if (Number.isNaN(start.getTime())) return null;
  return new Date(start.getTime() + FREE_TRIAL_MS);
}

export function remainingPhotoScansTrial(used: number): number {
  return Math.max(0, FREE_TRIAL_PHOTO_CAP - Math.max(0, used));
}

export function remainingVoiceSecondsTrial(usedSeconds: number): number {
  return Math.max(0, FREE_TRIAL_VOICE_CAP_SECONDS - Math.max(0, usedSeconds));
}

/**
 * Compact Xm Ys (or Xh Ym Zs) from fractional minutes — for paid voice remaining / monthly cap.
 */
export function formatVoiceMinutesFractionalCompact(minutesFractional: number): string {
  const secTotal = Math.max(0, Math.round(minutesFractional * 60));
  if (secTotal <= 0) return "0s";
  const h = Math.floor(secTotal / 3600);
  const m = Math.floor((secTotal % 3600) / 60);
  const s = secTotal % 60;
  if (h > 0) {
    if (m > 0 && s > 0) return `${h}h ${m}m ${s}s`;
    if (m > 0) return `${h}h ${m}m`;
    if (s > 0) return `${h}h ${s}s`;
    return `${h}h`;
  }
  if (m > 0 && s > 0) return `${m}m ${s}s`;
  if (m > 0) return `${m}m`;
  return `${s}s`;
}

/** Paid plan: human-readable remaining vs total voice allowance. */
export function formatPaidVoiceQuotaStatus(
  remainingMinutesFractional: number,
  limitMinutesFractional: number,
): string {
  const rem = formatVoiceMinutesFractionalCompact(remainingMinutesFractional);
  const lim = formatVoiceMinutesFractionalCompact(limitMinutesFractional);
  return `${rem} left · ${lim} cap`;
}

/** e.g. "2 min 45 sec left" */
export function formatWelcomeVoiceTimeLeft(secondsRemaining: number): string {
  const sec = Math.max(0, Math.floor(secondsRemaining));
  if (sec <= 0) return "0 sec left";
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  if (m > 0 && s > 0) return `${m} min ${s} sec left`;
  if (m > 0) return `${m} min left`;
  return `${s} sec left`;
}

/** e.g. "Ends in 18h 42m" — for live ticking UI */
export function formatWelcomeTrialEndsIn(endsAtIso: string | null, nowMs: number): string {
  if (!endsAtIso) return "";
  const end = new Date(endsAtIso).getTime();
  if (Number.isNaN(end)) return "";
  const leftMs = Math.max(0, end - nowMs);
  const totalSec = Math.floor(leftMs / 1000);
  if (totalSec <= 0) return "Trial ended";
  const h = Math.floor(totalSec / 3600);
  const m = Math.floor((totalSec % 3600) / 60);
  const s = totalSec % 60;
  if (h > 0) return `Ends in ${h}h ${m}m`;
  if (m > 0) return `Ends in ${m}m ${s}s`;
  return `Ends in ${s}s`;
}

/** Paid subscription currently in effect (trial/active/cancelled with future end date). */
export function isPaidSubscriptionAccess(
  status: string | null | undefined,
  endDate: string | null | undefined,
): boolean {
  if (status !== "trial" && status !== "active" && status !== "cancelled") {
    return false;
  }
  if (!endDate) return false;
  const end = new Date(endDate);
  if (Number.isNaN(end.getTime())) return false;
  return end.getTime() > Date.now();
}

/**
 * True when the 24h welcome trial window has ended (started and past end), and user is not on paid access.
 */
export function isWelcomeTrialExpired(
  trialStartedAt: string | null | undefined,
  hasPaidAccess: boolean,
  now: Date = new Date(),
): boolean {
  if (hasPaidAccess) return false;
  if (!trialStartedAt) return false;
  return !isFreeTrialWindowActive(trialStartedAt, now);
}

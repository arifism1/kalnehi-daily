/** Max HelpyJi assistant replies per UTC calendar day (counted after a successful model response). */
export const HELPYJI_DAILY_LIMIT_ANONYMOUS = 5;
export const HELPYJI_DAILY_LIMIT_LOGGED_IN = 10;

/** Minimum milliseconds between sends (server-enforced using last_message_at). */
export const HELPYJI_COOLDOWN_MS_ANONYMOUS = 9_000;
export const HELPYJI_COOLDOWN_MS_LOGGED_IN = 2_000;

/** UTC date string YYYY-MM-DD for quota buckets (matches DB `date` column). */
export function helpyjiUtcDayString(d = new Date()): string {
  return d.toISOString().slice(0, 10);
}

export function helpyjiDailyLimitReachedMessage(hasAccount: boolean): string {
  if (hasAccount) {
    return "You've used today's HelpyJi messages. Come back tomorrow—or upgrade for full PrepBrain coaching inside the app.";
  }
  return "You've used today's free HelpyJi messages. Come back tomorrow, or sign in for more daily messages and a personalized pitch.";
}

export function helpyjiCooldownMessage(seconds: number): string {
  return `Give me just a moment—try again in ${seconds} second${seconds === 1 ? "" : "s"}.`;
}

/**
 * Subscription-anniversary usage boundaries (IST): voice, photo scans, and Mastermind base
 * tokens roll on the same calendar day-of-month as `subscription_start_date`, not on the 1st.
 * Trial / welcome quotas use separate counters (7-day window / RPCs) — never tied here.
 */

const USAGE_MONTH_TZ = "Asia/Kolkata";

/** IST calendar date YYYY-MM-DD for an instant. */
export function istCalendarDateStringFromInstant(d: Date = new Date()): string {
  return istCalendarDateString(d);
}

function istCalendarDateString(d: Date): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: USAGE_MONTH_TZ,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(d);
}

/** Parse leading YYYY-MM-DD from a DB date or timestamptz string. */
function normalizeStoredUsageResetDate(raw: string | null | undefined): string | null {
  if (typeof raw !== "string" || !raw.trim()) return null;
  const m = /^(\d{4}-\d{2}-\d{2})/.exec(raw.trim());
  return m ? m[1] : null;
}

function parseYmd(s: string): { y: number; m: number; d: number } | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(s);
  if (!m) return null;
  return { y: Number(m[1]), m: Number(m[2]), d: Number(m[3]) };
}

function ymdToStr(p: { y: number; m: number; d: number }): string {
  return `${p.y}-${String(p.m).padStart(2, "0")}-${String(p.d).padStart(2, "0")}`;
}

function compareYmd(a: string, b: string): number {
  if (a < b) return -1;
  if (a > b) return 1;
  return 0;
}

/** Days in month (1–12), Gregorian. */
function daysInMonth(year: number, month: number): number {
  return new Date(Date.UTC(year, month, 0)).getUTCDate();
}

/** Add one calendar month with day clamping (e.g. Jan 31 → Feb 28). */
function addOneMonthYmd(y: number, m: number, d: number): { y: number; m: number; d: number } {
  let nm = m + 1;
  let ny = y;
  if (nm > 12) {
    nm = 1;
    ny += 1;
  }
  const maxD = daysInMonth(ny, nm);
  return { y: ny, m: nm, d: Math.min(d, maxD) };
}

/**
 * Start (IST calendar date) of the current subscription-anniversary usage period.
 * `null` when there is no subscription anchor — callers should not force a calendar reset.
 */
export function currentUsagePeriodStartDateString(
  subscriptionStartDate: string | null | undefined,
  now: Date = new Date(),
): string | null {
  const anchorIso = typeof subscriptionStartDate === "string" ? subscriptionStartDate.trim() : "";
  if (!anchorIso) return null;
  const anchorT = Date.parse(anchorIso);
  if (Number.isNaN(anchorT)) return null;

  const anchorYmd = istCalendarDateString(new Date(anchorT));
  const todayYmd = istCalendarDateString(now);

  if (compareYmd(anchorYmd, todayYmd) > 0) {
    return anchorYmd;
  }

  const startParts = parseYmd(anchorYmd);
  if (!startParts) return null;
  let p = startParts;
  let curStr = anchorYmd;
  for (;;) {
    const n = addOneMonthYmd(p.y, p.m, p.d);
    p = n;
    const nextStr = ymdToStr(p);
    if (compareYmd(nextStr, todayYmd) > 0) break;
    curStr = nextStr;
  }
  return curStr;
}

/** IST date (YYYY-MM-DD) when the **next** monthly usage period begins (day after current period ends). */
export function istNextUsagePeriodStartDateString(
  subscriptionStartDate: string | null | undefined,
  now: Date = new Date(),
): string | null {
  const cur = currentUsagePeriodStartDateString(subscriptionStartDate, now);
  if (!cur) return null;
  const parts = parseYmd(cur);
  if (!parts) return null;
  const n = addOneMonthYmd(parts.y, parts.m, parts.d);
  return ymdToStr(n);
}

/** `p_month_key` for PrepBrain RPCs; stable per period. */
export function prepbrainMonthKeyFromSubscriptionStart(
  subscriptionStartDate: string | null | undefined,
  now: Date = new Date(),
): string {
  const period = currentUsagePeriodStartDateString(subscriptionStartDate, now);
  const suffix = period ?? istCalendarDateString(now);
  return `u:${suffix}`;
}

export function needsUsagePeriodReset(
  usageResetDate: string | null | undefined,
  subscriptionStartDate: string | null | undefined,
  now: Date = new Date(),
): boolean {
  const expected = currentUsagePeriodStartDateString(subscriptionStartDate, now);
  if (expected === null) return false;
  const stored = normalizeStoredUsageResetDate(usageResetDate);
  return stored === null || stored !== expected;
}

/**
 * For display: zero paid monthly counters when the stored period does not match
 * the current subscription-anniversary period. Trial-only users typically have null
 * `subscription_start_date` — raw DB values are shown (trial does not use these counters).
 */
export function effectiveUsageForDisplay(
  usageResetDate: string | null | undefined,
  subscriptionStartDate: string | null | undefined,
  photoScansUsed: number,
  voiceMinutesUsed: number,
  now: Date = new Date(),
): { photoScansUsed: number; voiceMinutesUsed: number } {
  if (needsUsagePeriodReset(usageResetDate, subscriptionStartDate, now)) {
    return { photoScansUsed: 0, voiceMinutesUsed: 0 };
  }
  return { photoScansUsed, voiceMinutesUsed };
}

/** Postgres NUMERIC may arrive as string from the client; normalize for fractional voice minutes. */
export function coerceVoiceMinutesUsed(value: unknown): number {
  if (typeof value === "number" && Number.isFinite(value)) {
    return Math.max(0, value);
  }
  if (typeof value === "string" && value.trim()) {
    const n = parseFloat(value);
    if (Number.isFinite(n)) return Math.max(0, n);
  }
  return 0;
}

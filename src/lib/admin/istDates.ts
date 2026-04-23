/** Helpers for IST (Asia/Kolkata) calendar boundaries used in admin dashboards. */

const TZ = "Asia/Kolkata";

export function dateKeyIST(d: Date): string {
  return d.toLocaleDateString("en-CA", { timeZone: TZ });
}

export function startOfDayUTCFromISTDateKey(dateKey: string): Date {
  const [y, m, day] = dateKey.split("-").map(Number);
  const utcGuess = Date.UTC(y, m - 1, day, 0, 0, 0) - 5.5 * 60 * 60 * 1000;
  return new Date(utcGuess);
}

export function todayISTKey(): string {
  return dateKeyIST(new Date());
}

export function yesterdayISTKey(): string {
  const d = new Date();
  d.setDate(d.getDate() - 1);
  return dateKeyIST(d);
}

export function sameDayLastWeekISTKey(): string {
  const d = new Date();
  d.setDate(d.getDate() - 7);
  return dateKeyIST(d);
}

export function addDaysISTKey(key: string, deltaDays: number): string {
  const [y, m, day] = key.split("-").map(Number);
  const dt = new Date(Date.UTC(y, m - 1, day));
  dt.setUTCDate(dt.getUTCDate() + deltaDays);
  return dateKeyIST(dt);
}

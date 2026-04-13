/**
 * Calendar yyyy-MM-dd in Asia/Kolkata (IST), aligned with scheduled system pushes.
 */
export function getIstCalendarDateString(now = new Date()): string {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Kolkata",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(now);
  const y = parts.find((p) => p.type === "year")?.value;
  const m = parts.find((p) => p.type === "month")?.value;
  const d = parts.find((p) => p.type === "day")?.value;
  if (!y || !m || !d) {
    return now.toISOString().slice(0, 10);
  }
  return `${y}-${m}-${d}`;
}

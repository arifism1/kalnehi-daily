import { format, parseISO, startOfDay } from "date-fns";

/** session_kind values that count as "revision activity" for streaks/heatmap. */
export const HEATMAP_SESSION_KINDS = new Set([
  "active_recall_typed",
  "active_recall_voice",
  "confidence_only",
  "suggestion_accepted",
]);

export type LogRow = {
  created_at: string;
  session_kind: string;
};

/**
 * Count qualifying sessions per local calendar day (yyyy-MM-dd).
 */
export function aggregateRevisionHeatmap(
  logs: LogRow[],
  fromDate: Date,
  toDate: Date,
): Record<string, number> {
  const counts: Record<string, number> = {};
  const fromT = startOfDay(fromDate).getTime();
  const toT = startOfDay(toDate).getTime();

  for (const row of logs) {
    if (!HEATMAP_SESSION_KINDS.has(row.session_kind)) continue;
    const day = startOfDay(new Date(row.created_at));
    const t = day.getTime();
    if (t < fromT || t > toT) continue;
    const key = format(day, "yyyy-MM-dd");
    counts[key] = (counts[key] ?? 0) + 1;
  }
  return counts;
}

function dayKeysWithActivity(
  logs: LogRow[],
  fromYyyyMmDd: string,
  toYyyyMmDd: string,
): Set<string> {
  const from = startOfDay(parseISO(fromYyyyMmDd));
  const to = startOfDay(parseISO(toYyyyMmDd));
  const set = new Set<string>();
  for (const row of logs) {
    if (!HEATMAP_SESSION_KINDS.has(row.session_kind)) continue;
    const d = startOfDay(new Date(row.created_at));
    if (d < from || d > to) continue;
    set.add(format(d, "yyyy-MM-dd"));
  }
  return set;
}

/**
 * Consecutive calendar days with activity, ending at the most recent active day
 * (today if you revised today, otherwise the streak ends at your last active day).
 */
export function computeRevisionStreak(
  logs: LogRow[],
  todayYyyyMmDd: string,
  lookbackDays = 400,
): { streak: number; lastActiveDay: string | null } {
  const today = startOfDay(parseISO(todayYyyyMmDd));
  const from = new Date(today);
  from.setDate(from.getDate() - lookbackDays);
  const fromStr = format(from, "yyyy-MM-dd");
  const toStr = format(today, "yyyy-MM-dd");
  const active = dayKeysWithActivity(logs, fromStr, toStr);
  if (active.size === 0) {
    return { streak: 0, lastActiveDay: null };
  }

  let cursor = new Date(today);
  const todayKey = format(today, "yyyy-MM-dd");
  if (!active.has(todayKey)) {
    cursor.setDate(cursor.getDate() - 1);
  }
  // Find last active day
  let lastKey: string | null = null;
  for (let i = 0; i < lookbackDays; i++) {
    const k = format(cursor, "yyyy-MM-dd");
    if (active.has(k)) {
      lastKey = k;
      break;
    }
    cursor.setDate(cursor.getDate() - 1);
  }
  if (!lastKey) {
    return { streak: 0, lastActiveDay: null };
  }

  // Walk back from lastKey
  const end = startOfDay(parseISO(lastKey));
  let streak = 0;
  for (let i = 0; i < lookbackDays; i++) {
    const d = new Date(end);
    d.setDate(d.getDate() - i);
    const k = format(d, "yyyy-MM-dd");
    if (active.has(k)) streak++;
    else break;
  }
  return { streak, lastActiveDay: lastKey };
}

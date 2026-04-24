/**
 * Persists start-of-day projected marks so we can show "today's marginal progress
 * toward target" without server-side history.
 *
 * On calendar rollover, `startOfDayMastered` becomes the last `lastMastered`
 * from the previous day (closing projected marks).
 */
export const LIVE_TARGET_BAR_STORAGE_KEY = "kalnehi_live_target_bar_baseline_v1";

export type LiveTargetBarPersisted = {
  date: string;
  startOfDayMastered: number;
  lastMastered: number;
};

export function updateLiveTargetBaseline(
  today: string,
  currentMastered: number,
): { startOfDayMastered: number } {
  if (typeof window === "undefined") {
    return { startOfDayMastered: currentMastered };
  }
  try {
    const raw = localStorage.getItem(LIVE_TARGET_BAR_STORAGE_KEY);
    const parsed = raw
      ? (JSON.parse(raw) as LiveTargetBarPersisted)
      : null;

    if (!parsed || typeof parsed.date !== "string") {
      const init: LiveTargetBarPersisted = {
        date: today,
        startOfDayMastered: currentMastered,
        lastMastered: currentMastered,
      };
      localStorage.setItem(LIVE_TARGET_BAR_STORAGE_KEY, JSON.stringify(init));
      return { startOfDayMastered: currentMastered };
    }

    if (parsed.date < today) {
      const next: LiveTargetBarPersisted = {
        date: today,
        startOfDayMastered: parsed.lastMastered,
        lastMastered: currentMastered,
      };
      localStorage.setItem(LIVE_TARGET_BAR_STORAGE_KEY, JSON.stringify(next));
      return { startOfDayMastered: next.startOfDayMastered };
    }

    if (parsed.date > today) {
      const next: LiveTargetBarPersisted = {
        date: today,
        startOfDayMastered: currentMastered,
        lastMastered: currentMastered,
      };
      localStorage.setItem(LIVE_TARGET_BAR_STORAGE_KEY, JSON.stringify(next));
      return { startOfDayMastered: currentMastered };
    }

    const next: LiveTargetBarPersisted = {
      ...parsed,
      lastMastered: currentMastered,
    };
    localStorage.setItem(LIVE_TARGET_BAR_STORAGE_KEY, JSON.stringify(next));
    return { startOfDayMastered: parsed.startOfDayMastered };
  } catch {
    return { startOfDayMastered: currentMastered };
  }
}

/**
 * Gap-closure percent: how much of the remaining distance to `target` (from
 * start-of-day projected marks) was closed by today's projected marks increase.
 */
export function computeGapClosurePercentTowardTarget(args: {
  target: number;
  startOfDayMastered: number;
  currentMastered: number;
}): number {
  const { target, startOfDayMastered, currentMastered } = args;
  if (target <= 0) return 0;
  const delta = Math.max(0, currentMastered - startOfDayMastered);
  if (delta <= 0) return 0;
  const gapAtStart = Math.max(0, target - startOfDayMastered);
  if (gapAtStart <= 0) return 0;
  return Math.min(1000, (delta / gapAtStart) * 100);
}

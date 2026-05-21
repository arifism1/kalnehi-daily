import { addDays, format, parseISO } from "date-fns";

/**
 * v1 capacity rules (single place). User-local hour + calendar date come from the client.
 * Tune later via profile prefs without scattering magic numbers.
 */
export const BACKLOG_RECOVERY_DAILY_CAPACITY_MINUTES = 360;
export const BACKLOG_RECOVERY_LATE_DAY_CUTOFF_HOUR = 21;

export type BacklogScheduleIntensity = "lighter" | "heavier";

export function perDayFromIntensity(intensity: BacklogScheduleIntensity): number {
  return intensity === "lighter" ? 2 : 3;
}

export type SchedulableBacklogItem = {
  title: string;
  details: string;
  syllabus_master_id: string | null;
  group_label: string | null;
  difficulty: string | null;
  effort_estimate_minutes: number;
  /** When rescheduling existing pending rows from Backlog List */
  existing_backlog_id?: string | null;
  retry_count?: number;
  last_attempt_date?: string | null;
};

export type BacklogSchedulePreviewRow = {
  plan_date: string;
  title: string;
  estimated_minutes: number;
  group_label: string | null;
};

export type ComputedBacklogSchedule = {
  /** First calendar day that receives at least one new item */
  startYmd: string;
  startsToday: boolean;
  headline: string;
  rows: BacklogSchedulePreviewRow[];
  /** Stable item → plan date for writes (retry-sorted order). */
  assignments: { item: SchedulableBacklogItem; plan_date: string }[];
  perDay: number;
};

function sortForRetryPriority<T extends SchedulableBacklogItem>(items: T[]): T[] {
  return [...items].toSorted((a, b) => {
    const rc = (b.retry_count ?? 0) - (a.retry_count ?? 0);
    if (rc !== 0) return rc;
    const ad = a.last_attempt_date ?? "";
    const bd = b.last_attempt_date ?? "";
    if (ad !== bd) return bd.localeCompare(ad);
    return 0;
  });
}

function tomorrowYmd(todayYmd: string): string {
  return format(addDays(parseISO(`${todayYmd}T12:00:00`), 1), "yyyy-MM-dd");
}

function headlineForChosenStart(todayYmd: string, startYmd: string): string {
  if (startYmd === todayYmd) return "Begins today";
  if (startYmd === tomorrowYmd(todayYmd)) return "Begins tomorrow";
  try {
    return `Begins ${format(parseISO(`${startYmd}T12:00:00`), "MMM d, yyyy")}`;
  } catch {
    return "Begins on the date you picked";
  }
}

function roundRobinDates(startYmd: string, count: number, perDay: number): string[] {
  const start = parseISO(`${startYmd}T12:00:00`);
  const dates: string[] = [];
  let dayOffset = 0;
  let placed = 0;
  while (placed < count) {
    const ymd = format(addDays(start, dayOffset), "yyyy-MM-dd");
    for (let k = 0; k < perDay && placed < count; k++) {
      dates.push(ymd);
      placed++;
    }
    dayOffset++;
  }
  return dates;
}

/** Avoid stacking the same subject back-to-back within one day in preview / display order. */
export function balanceSubjectsWithinDay<T extends { group_label: string | null }>(
  items: T[],
): T[] {
  if (items.length <= 1) return items;
  const result: T[] = [];
  const pool = [...items];
  let lastLabel: string | null = null;
  while (pool.length > 0) {
    const diffIdx = pool.findIndex((x) => (x.group_label ?? "") !== (lastLabel ?? ""));
    const pick = (diffIdx >= 0 ? pool.splice(diffIdx, 1) : pool.splice(0, 1))[0]!;
    result.push(pick);
    lastLabel = pick.group_label ?? null;
  }
  return result;
}

/**
 * Decide first plan day and per-item dates. Does not hit the database.
 */
export function computeBacklogSchedule(args: {
  todayYmd: string;
  /** 0–23, user's local hour */
  userLocalHour: number;
  items: SchedulableBacklogItem[];
  intensity: BacklogScheduleIntensity;
  /** Sum of estimated_minutes for non-done, non-skipped tasks on today's plan */
  usedMinutesToday: number;
  /** Backlog-sourced daily tasks on today not done/skipped */
  backlogTaskCountToday: number;
  /**
   * First calendar day to place recovery tasks (yyyy-MM-dd, >= todayYmd).
   * When omitted, uses automatic today vs tomorrow based on time and capacity.
   */
  scheduleStartYmd?: string | null;
}): ComputedBacklogSchedule {
  const perDay = perDayFromIntensity(args.intensity);
  const sorted = sortForRetryPriority(args.items);
  const overrideRaw = (args.scheduleStartYmd ?? "").trim();

  let startsToday: boolean;
  let startYmd: string;

  if (/^\d{4}-\d{2}-\d{2}$/.test(overrideRaw) && overrideRaw >= args.todayYmd) {
    startYmd = overrideRaw;
    startsToday = overrideRaw === args.todayYmd;
  } else {
    const firstMinutes = sorted[0]?.effort_estimate_minutes ?? 0;

    startsToday = true;
    startYmd = args.todayYmd;

    if (args.userLocalHour >= BACKLOG_RECOVERY_LATE_DAY_CUTOFF_HOUR) {
      startsToday = false;
      startYmd = tomorrowYmd(args.todayYmd);
    } else {
      const slotsLeft = perDay - args.backlogTaskCountToday;
      const remaining = BACKLOG_RECOVERY_DAILY_CAPACITY_MINUTES - args.usedMinutesToday;
      if (slotsLeft <= 0 || remaining < firstMinutes) {
        startsToday = false;
        startYmd = tomorrowYmd(args.todayYmd);
      }
    }
  }

  const rawDates = roundRobinDates(startYmd, sorted.length, perDay);
  const rows = buildPreviewRows({ items: sorted, rawDates });
  const assignments = sorted.map((item, i) => ({
    item,
    plan_date: rawDates[i]!,
  }));

  const usedChosenStart =
    /^\d{4}-\d{2}-\d{2}$/.test(overrideRaw) && overrideRaw >= args.todayYmd;

  const headline = usedChosenStart
    ? headlineForChosenStart(args.todayYmd, startYmd)
    : startsToday
      ? "Begins today"
      : "Begins tomorrow";

  return {
    startYmd,
    startsToday,
    headline,
    rows,
    assignments,
    perDay,
  };
}

/** Preview rows in calendar order with balanced subject order within each day. */
export function buildPreviewRows(args: {
  items: SchedulableBacklogItem[];
  rawDates: string[];
}): BacklogSchedulePreviewRow[] {
  const { items, rawDates } = args;
  const byDate = new Map<string, SchedulableBacklogItem[]>();
  items.forEach((item, idx) => {
    const d = rawDates[idx] ?? rawDates[0]!;
    const list = byDate.get(d) ?? [];
    list.push(item);
    byDate.set(d, list);
  });
  const out: BacklogSchedulePreviewRow[] = [];
  const dates = [...new Set(rawDates)].toSorted();
  for (const d of dates) {
    const bucket = byDate.get(d) ?? [];
    const bal = balanceSubjectsWithinDay(bucket);
    for (const item of bal) {
      out.push({
        plan_date: d,
        title: item.title,
        estimated_minutes: item.effort_estimate_minutes,
        group_label: item.group_label,
      });
    }
  }
  return out;
}

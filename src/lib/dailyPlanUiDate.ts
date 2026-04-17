import { addDays, format, parseISO } from "date-fns";

const PLAN_DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

export function isValidPlanDateString(
  s: string | null | undefined,
): s is string {
  return Boolean(s && PLAN_DATE_RE.test(s));
}

/**
 * Primary CTA when committing preview rows to `daily_tasks` for `planDate`.
 */
export function addToPlanButtonLabel(planDate: string, today: string): string {
  if (planDate === today) return "Add to Today's Plan";
  const tomorrow = format(addDays(parseISO(today), 1), "yyyy-MM-dd");
  if (planDate === tomorrow) return "Add to Tomorrow's Plan";
  return `Add to ${format(parseISO(planDate), "EEEE")}'s Plan`;
}

/** Heading above `UnifiedDailyPlanList` for the selected plan date. */
export function dailyPlanLiveHeading(planDate: string, today: string): string {
  if (planDate === today) return "Today's plan (live)";
  const tomorrow = format(addDays(parseISO(today), 1), "yyyy-MM-dd");
  if (planDate === tomorrow) return "Tomorrow's plan (live)";
  const yesterday = format(addDays(parseISO(today), -1), "yyyy-MM-dd");
  if (planDate === yesterday) return "Yesterday's plan (live)";
  return `${format(parseISO(planDate), "EEE d MMM")} · plan (live)`;
}

/** Page hero line for `/daily-plan` (without the smaller “(live)” span). */
export function dailyPlanPageHeroTitle(planDate: string, today: string): string {
  if (planDate === today) return "Today's plan";
  const tomorrow = format(addDays(parseISO(today), 1), "yyyy-MM-dd");
  if (planDate === tomorrow) return "Tomorrow's plan";
  const yesterday = format(addDays(parseISO(today), -1), "yyyy-MM-dd");
  if (planDate === yesterday) return "Yesterday's plan";
  return `${format(parseISO(planDate), "EEEE d MMM")}`;
}

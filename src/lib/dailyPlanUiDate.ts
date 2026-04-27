import { addDays, format, parse, parseISO } from "date-fns";

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
  // Use parse (local midnight) not parseISO (UTC midnight) for the locally-
  // derived today string to avoid day-boundary skew in non-UTC timezones.
  const todayLocal = parse(today, "yyyy-MM-dd", new Date());
  const tomorrow = format(addDays(todayLocal, 1), "yyyy-MM-dd");
  if (planDate === tomorrow) return "Add to Tomorrow's Plan";
  return `Add to ${format(parseISO(planDate), "EEEE")}'s Plan`;
}

/** Page hero and list title for the selected plan date. */
export function dailyPlanPageHeroTitle(planDate: string, today: string): string {
  if (planDate === today) return "Today's plan";
  const todayLocal = parse(today, "yyyy-MM-dd", new Date());
  const tomorrow = format(addDays(todayLocal, 1), "yyyy-MM-dd");
  if (planDate === tomorrow) return "Tomorrow's plan";
  const yesterday = format(addDays(todayLocal, -1), "yyyy-MM-dd");
  if (planDate === yesterday) return "Yesterday's plan";
  return `${format(parseISO(planDate), "EEEE d MMM")}`;
}

/** Heading above `UnifiedDailyPlanList` — same copy as the plan page hero. */
export function dailyPlanLiveHeading(planDate: string, today: string): string {
  return dailyPlanPageHeroTitle(planDate, today);
}

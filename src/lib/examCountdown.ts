import { differenceInCalendarDays, parseISO, startOfDay } from "date-fns";

/** Calendar days until exam date (exclusive of today); null if invalid or not in the future. */
export function computeDaysToExam(dateStr: string): number | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) return null;
  const today = startOfDay(new Date());
  const exam = startOfDay(parseISO(dateStr));
  const diff = differenceInCalendarDays(exam, today);
  return diff > 0 ? diff : null;
}

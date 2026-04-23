import { startOfWeek } from "date-fns";
import { fromZonedTime, toZonedTime } from "date-fns-tz";

const IST = "Asia/Kolkata";

/**
 * IST calendar week: Monday 00:00 IST through the following Monday 00:00 IST (exclusive end).
 */
export function getIstWeekBounds(now: Date = new Date()): {
  weekStartInstant: Date;
  weekEndExclusive: Date;
  /** Monday date in IST as YYYY-MM-DD (for DB `date` and recompute RPC). */
  weekStartDate: string;
} {
  const zoned = toZonedTime(now, IST);
  const mondayLocal = startOfWeek(zoned, { weekStartsOn: 1 });
  mondayLocal.setHours(0, 0, 0, 0);
  const weekStartInstant = fromZonedTime(mondayLocal, IST);
  const nextMondayLocal = new Date(mondayLocal);
  nextMondayLocal.setDate(nextMondayLocal.getDate() + 7);
  const weekEndExclusive = fromZonedTime(nextMondayLocal, IST);
  const y = mondayLocal.getFullYear();
  const m = String(mondayLocal.getMonth() + 1).padStart(2, "0");
  const d = String(mondayLocal.getDate()).padStart(2, "0");
  return {
    weekStartInstant,
    weekEndExclusive,
    weekStartDate: `${y}-${m}-${d}`,
  };
}

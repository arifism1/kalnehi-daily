"use client";

import { useEffect, useRef, type Dispatch, type SetStateAction } from "react";

/**
 * When the device calendar day advances (e.g. after midnight), keep `logDate`
 * aligned only if the user was still viewing "yesterday" as "today" — do not
 * clobber an explicit future/past pick or a deep-linked `planDate`.
 */
export function usePlannerDateMidnightRollover(
  calendarToday: string,
  setPlanDate: Dispatch<SetStateAction<string>>,
): void {
  const prevCalDayRef = useRef(calendarToday);
  useEffect(() => {
    const prev = prevCalDayRef.current;
    if (prev === calendarToday) return;
    setPlanDate((current) => (current === prev ? calendarToday : current));
    prevCalDayRef.current = calendarToday;
  }, [calendarToday, setPlanDate]);
}

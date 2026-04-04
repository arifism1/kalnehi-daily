"use client";

import { format } from "date-fns";
import { useEffect, useState } from "react";

/**
 * Local calendar date `yyyy-MM-dd`, refreshed on an interval and when the tab
 * becomes visible so “today” rolls over after midnight without a full reload.
 */
export function useCalendarDate(): string {
  const [day, setDay] = useState(() => format(new Date(), "yyyy-MM-dd"));

  useEffect(() => {
    const sync = () => {
      const next = format(new Date(), "yyyy-MM-dd");
      setDay((prev) => (next !== prev ? next : prev));
    };

    const interval = window.setInterval(sync, 15_000);
    const onVis = () => {
      if (document.visibilityState === "visible") sync();
    };
    document.addEventListener("visibilitychange", onVis);

    return () => {
      window.clearInterval(interval);
      document.removeEventListener("visibilitychange", onVis);
    };
  }, []);

  return day;
}

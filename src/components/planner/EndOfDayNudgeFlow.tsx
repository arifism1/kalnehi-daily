"use client";

import { MoonStar, X } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";

import { EndOfDaySheet } from "@/components/planner/EndOfDaySheet";
import {
  isWithinEveningBannerWindow,
  readEodBannerDismissedForDate,
  writeEodBannerDismissedForDate,
} from "@/lib/endOfDayNudge";

type EndOfDayNudgeFlowProps = {
  /** Active plan date yyyy-MM-dd (must equal todayCalendar to show banner) */
  planDate: string;
  /** Today's calendar yyyy-MM-dd from useCalendarDate() */
  todayCalendar: string;
};

/**
 * Dismissible evening banner when viewing Today's plan for today; opens combined recap + debrief sheet.
 */
export function EndOfDayNudgeFlow({ planDate, todayCalendar }: EndOfDayNudgeFlowProps) {
  const [hydratedStorage, setHydratedStorage] = useState(false);
  const [, setRefresh] = useState(0);
  const [tick, setTick] = useState(0);
  const [sheetOpen, setSheetOpen] = useState(false);

  useEffect(() => {
    const id = window.setTimeout(() => {
      setHydratedStorage(true);
    }, 0);

    const now = new Date();
    const msUntilNextMinute =
      (60 - now.getSeconds()) * 1000 - now.getMilliseconds();

    let intervalId: number | undefined;
    const intervalTimer = window.setTimeout(() => {
      setTick((t) => t + 1);
      intervalId = window.setInterval(() => {
        setTick((t) => t + 1);
      }, 60_000);
    }, msUntilNextMinute);

    return () => {
      window.clearTimeout(id);
      window.clearTimeout(intervalTimer);
      if (typeof intervalId !== "undefined") window.clearInterval(intervalId);
    };
  }, []);

  const inEvening = useMemo(() => {
    void tick;
    return isWithinEveningBannerWindow(new Date());
  }, [tick]);

  const storageDismissed =
    hydratedStorage && readEodBannerDismissedForDate(todayCalendar);

  const shouldShowBanner =
    hydratedStorage &&
    planDate === todayCalendar &&
    inEvening &&
    !storageDismissed;

  const onDismissBanner = useCallback(() => {
    writeEodBannerDismissedForDate(todayCalendar);
    setRefresh((x) => x + 1);
  }, [todayCalendar]);

  return (
    <>
      {shouldShowBanner ? (
        <div
          className="mb-5 flex gap-3 rounded-2xl border border-violet-500/35 bg-gradient-to-br from-violet-500/[0.12] via-kal-card-muted to-fuchsia-500/[0.08] px-4 py-3.5 shadow-sm sm:px-5"
          role="status"
        >
          <MoonStar className="mt-0.5 h-9 w-9 shrink-0 text-violet-500" aria-hidden />
          <div className="min-w-0 flex-1">
            <p className="font-semibold text-kal-text">Wrap up tonight</p>
            <p className="mt-1 text-sm text-kal-text-secondary">
              See your recap and quick debrief — one tap before you rest.
            </p>
            <button
              type="button"
              onClick={() => setSheetOpen(true)}
              className="mt-3 inline-flex min-h-[44px] items-center rounded-xl bg-kal-accent px-4 text-sm font-semibold text-white shadow-sm transition-opacity hover:opacity-95"
            >
              Wrap up today
            </button>
          </div>
          <button
            type="button"
            onClick={onDismissBanner}
            aria-label="Dismiss banner until tomorrow"
            className="h-10 w-10 shrink-0 rounded-full border border-kal-border text-kal-muted hover:bg-kal-card-muted hover:text-kal-text"
          >
            <X className="mx-auto h-5 w-5" aria-hidden />
          </button>
        </div>
      ) : null}

      <EndOfDaySheet open={sheetOpen} onClose={() => setSheetOpen(false)} isoDate={todayCalendar} />
    </>
  );
}

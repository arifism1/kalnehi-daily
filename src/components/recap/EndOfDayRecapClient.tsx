"use client";

import { useCalendarDate } from "@/hooks/useCalendarDate";

import { EndOfDayRecapPanel } from "@/components/recap/EndOfDayRecapPanel";

export function EndOfDayRecapClient() {
  const today = useCalendarDate();

  return (
    <div className="mx-auto flex max-w-lg flex-col gap-6 pb-8">
      <div>
        <h1 className="kal-section-heading">Today&apos;s recap</h1>
        <p className="mt-1 text-sm text-kal-text-secondary">
          Cinematic card — screenshot or share to Stories.
        </p>
      </div>

      <EndOfDayRecapPanel isoDate={today} showMagazineLinks />
    </div>
  );
}

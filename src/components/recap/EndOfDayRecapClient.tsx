"use client";

import { useCalendarDate } from "@/hooks/useCalendarDate";

import { EndOfDayRecapPanel } from "@/components/recap/EndOfDayRecapPanel";
import { RecapMagazinePageHeader } from "@/components/recap/RecapMagazinePageHeader";

export function EndOfDayRecapClient() {
  const today = useCalendarDate();

  return (
    <div className="mx-auto flex max-w-lg flex-col gap-6 pb-8">
      <RecapMagazinePageHeader
        period="daily"
        title="Today's recap"
        subtitle="Cinematic card — screenshot or share to Stories."
      />

      <EndOfDayRecapPanel isoDate={today} />
    </div>
  );
}

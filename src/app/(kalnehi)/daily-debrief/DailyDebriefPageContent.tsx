"use client";

import { ShareYourDayCard } from "@/components/daily/ShareYourDayCard";
import { DailyReflectionClient } from "@/components/reflection/DailyReflectionClient";
import { PreviousDailyDebriefsSection } from "@/components/reflection/PreviousDailyDebriefsSection";

export default function DailyDebriefPageContent() {
  return (
    <div className="space-y-4 sm:space-y-6">
      <ShareYourDayCard />
      <DailyReflectionClient showInlineRecentHistory={false} />
      <PreviousDailyDebriefsSection />
    </div>
  );
}

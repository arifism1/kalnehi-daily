"use client";

import { ShareYourDayCard } from "@/components/daily/ShareYourDayCard";
import { DailyReflectionClient } from "@/components/reflection/DailyReflectionClient";

export default function DailyLogPageContent() {
  return (
    <div className="space-y-4 sm:space-y-6">
      <ShareYourDayCard />
      <DailyReflectionClient />
    </div>
  );
}

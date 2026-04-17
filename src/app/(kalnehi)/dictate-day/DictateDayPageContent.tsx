"use client";

import { useSearchParams } from "next/navigation";

import { DictateMyDay } from "@/components/voice/DictateMyDay";
import { isValidPlanDateString } from "@/lib/dailyPlanUiDate";

export default function DictateDayPageContent() {
  const searchParams = useSearchParams();
  const raw = searchParams.get("planDate") ?? searchParams.get("date");
  const urlInitialPlanDate =
    raw && isValidPlanDateString(raw) ? raw : null;

  return (
    <div className="mx-auto max-w-2xl px-4 py-6 sm:px-5 sm:py-8">
      <DictateMyDay urlInitialPlanDate={urlInitialPlanDate} />
    </div>
  );
}

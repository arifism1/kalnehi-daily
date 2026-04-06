"use client";

import { DictateMyDay } from "@/components/voice/DictateMyDay";
import { useRefreshTasksOnHomeFocus } from "@/hooks/useRefreshTasksOnHomeFocus";

export default function DictateDayPage() {
  useRefreshTasksOnHomeFocus();

  return (
    <div className="mx-auto max-w-2xl px-4 py-6 sm:px-5 sm:py-8">
      <DictateMyDay />
    </div>
  );
}

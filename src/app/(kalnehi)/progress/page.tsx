"use client";

import { useRefreshTasksOnHomeFocus } from "@/hooks/useRefreshTasksOnHomeFocus";
import { ProgressOverview } from "@/components/home/ProgressOverview";
import { StudyCameraProgressCard } from "@/components/study/StudyCameraProgressCard";

export default function ProgressPage() {
  useRefreshTasksOnHomeFocus();

  return (
    <div className="space-y-4">
      <header className="max-w-2xl">
        <p className="text-[0.65rem] font-semibold uppercase tracking-widest text-violet-400/90">
          Momentum
        </p>
        <h1 className="mt-1 text-xl font-bold text-white sm:text-2xl">
          Progress
        </h1>
        <p className="mt-2 text-sm leading-relaxed text-zinc-400">
          Marks and coverage from what you&apos;ve completed — see the trend and
          keep pushing.
        </p>
      </header>
      <StudyCameraProgressCard />
      <ProgressOverview />
    </div>
  );
}

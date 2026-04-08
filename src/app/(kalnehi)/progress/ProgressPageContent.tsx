"use client";

import { useRefreshTasksOnHomeFocus } from "@/hooks/useRefreshTasksOnHomeFocus";
import { ProgressOverview } from "@/components/home/ProgressOverview";

export default function ProgressPageContent() {
  useRefreshTasksOnHomeFocus();

  return (
    <div className="space-y-4">
      <header className="max-w-2xl">
        <p className="text-[0.65rem] font-semibold uppercase tracking-widest text-kal-accent">
          Momentum
        </p>
        <h1 className="mt-1 text-xl font-bold tracking-tight text-kal-text sm:text-2xl">
          Progress
        </h1>
        <p className="mt-2 text-sm leading-relaxed text-kal-text-secondary sm:text-[15px]">
          Marks and syllabus completion — stay focused on coverage and scoring
          momentum.
        </p>
      </header>
      <ProgressOverview />
    </div>
  );
}

"use client";

import { DailyExecutionPanel } from "@/components/progress/DailyExecutionPanel";
import { ProgressOverview } from "@/components/home/ProgressOverview";
import { useRefreshTasksOnHomeFocus } from "@/hooks/useRefreshTasksOnHomeFocus";

export default function ProgressPageContent() {
  useRefreshTasksOnHomeFocus();

  return (
    <div className="space-y-6">
      <header className="max-w-2xl">
        <p className="text-[0.65rem] font-semibold uppercase tracking-widest text-kal-accent">
          Momentum
        </p>
        <h1 className="kal-feature-title mt-1">Progress</h1>
        <p className="kal-feature-lead mt-2 text-kal-text-secondary">
          Daily execution first — then marks and syllabus so you see both
          discipline and coverage.
        </p>
      </header>
      <DailyExecutionPanel />
      <ProgressOverview />
    </div>
  );
}

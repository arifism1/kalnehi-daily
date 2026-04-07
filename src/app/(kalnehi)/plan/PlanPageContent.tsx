"use client";

import { useRefreshTasksOnHomeFocus } from "@/hooks/useRefreshTasksOnHomeFocus";
import { Planner } from "@/components/home/Planner";

export default function PlanPageContent() {
  useRefreshTasksOnHomeFocus();

  return (
    <div className="space-y-4 sm:space-y-6">
      <header className="max-w-2xl">
        <p className="text-[0.65rem] font-semibold uppercase tracking-widest text-kal-accent/90">
          Win daily
        </p>
        <h1 className="mt-1 text-xl font-bold tracking-tight text-kal-text sm:text-2xl">
          Execution planner
        </h1>
        <p className="mt-2 text-sm leading-relaxed text-kal-text-secondary sm:text-[15px]">
          Lock targets for any day — name them, time them, link syllabus. Then
          show up and execute.
        </p>
      </header>
      <Planner />
    </div>
  );
}

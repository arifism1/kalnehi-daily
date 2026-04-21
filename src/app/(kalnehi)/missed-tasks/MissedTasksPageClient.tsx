"use client";

import { AlertTriangle } from "lucide-react";

import { MissedTasks } from "@/components/home/MissedTasks";

export function MissedTasksPageClient() {
  return (
    <div className="flex flex-col gap-6">
      <header className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-100 text-amber-800 dark:bg-amber-500/15 dark:text-amber-200">
          <AlertTriangle className="h-5 w-5" aria-hidden />
        </div>
        <div>
          <h1 className="text-xl font-medium tracking-tight text-kal-text">
            Missed Tasks
          </h1>
          <p className="text-sm text-kal-muted">
            Carry-over targets from days you didn&apos;t close out.
          </p>
        </div>
      </header>
      <MissedTasks />
    </div>
  );
}

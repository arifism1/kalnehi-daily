"use client";

import { MissedTasks } from "@/components/home/MissedTasks";

export function MissedTasksPageClient() {
  return (
    <div className="flex flex-col gap-6">
      <header className="max-w-2xl">
        <h1 className="kal-feature-title">Missed Tasks</h1>
        <p className="mt-2 text-sm text-kal-muted">
          Overdue daily plan work and past-due Revision Tracker items — one place to
          clear your backlog. Overdue Revision Tracker items appear here; the
          Revision Tracker page is for today and what&apos;s ahead.
        </p>
      </header>
      <MissedTasks />
    </div>
  );
}

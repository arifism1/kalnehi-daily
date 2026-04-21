"use client";

import { MissedTasks } from "@/components/home/MissedTasks";

export function MissedTasksPageClient() {
  return (
    <div className="flex flex-col gap-6">
      <header>
        <h1 className="text-xl font-medium tracking-tight text-kal-text">
          Missed Tasks
        </h1>
      </header>
      <MissedTasks />
    </div>
  );
}

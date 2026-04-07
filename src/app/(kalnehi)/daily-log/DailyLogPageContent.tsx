"use client";

import { ExecutionLogClient } from "@/components/execution/ExecutionLogClient";
import { useRefreshTasksOnHomeFocus } from "@/hooks/useRefreshTasksOnHomeFocus";

export default function DailyLogPageContent() {
  useRefreshTasksOnHomeFocus();

  return (
    <div className="space-y-4 sm:space-y-6">
      <ExecutionLogClient />
    </div>
  );
}

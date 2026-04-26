"use client";

import type { DailyReflectionRow } from "@/actions/dailyReflections";

function formatReflectionDate(dateStr: string): string {
  const d = new Date(dateStr + "T00:00:00");
  return d.toLocaleDateString("en-IN", { weekday: "short", day: "numeric", month: "short" });
}

export type ReflectionHistoryListProps = {
  rows: DailyReflectionRow[];
  /** Optional class on the outer `<ul>` */
  className?: string;
};

export function ReflectionHistoryList({ rows, className }: ReflectionHistoryListProps) {
  if (rows.length === 0) return null;

  return (
    <ul className={className ?? "space-y-2"}>
      {rows.map((r) => (
        <li key={r.id} className="kal-glass-subtle space-y-2 rounded-xl p-4">
          <p className="text-xs font-semibold text-kal-text-secondary">
            {formatReflectionDate(r.reflection_date)}
          </p>
          <div className="grid gap-1">
            {r.finished_today && (
              <p className="text-sm text-kal-text">
                <span className="font-medium text-emerald-600 dark:text-emerald-400">Finished: </span>
                {r.finished_today}
              </p>
            )}
            {r.skipped_today && (
              <p className="text-sm text-kal-text">
                <span className="font-medium text-amber-600 dark:text-amber-400">Skipped: </span>
                {r.skipped_today}
              </p>
            )}
            {r.tomorrow_priority && (
              <p className="text-sm text-kal-text">
                <span className="font-medium text-violet-600 dark:text-violet-400">Planned: </span>
                {r.tomorrow_priority}
              </p>
            )}
          </div>
        </li>
      ))}
    </ul>
  );
}

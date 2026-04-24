"use client";

import { addDays, format, parseISO, subDays } from "date-fns";
import clsx from "clsx";

export function getRelativeCalendarYmds(todayYmd: string): {
  yesterday: string;
  today: string;
  tomorrow: string;
} {
  const t = parseISO(todayYmd);
  return {
    yesterday: format(subDays(t, 1), "yyyy-MM-dd"),
    today: todayYmd,
    tomorrow: format(addDays(t, 1), "yyyy-MM-dd"),
  };
}

/** True when a specific day is selected and it is not All / today / yesterday / tomorrow preset. */
export function isCustomDateFilter(
  selectedDate: string | null,
  todayYmd: string,
): boolean {
  if (selectedDate == null) return false;
  const { yesterday, today, tomorrow } = getRelativeCalendarYmds(todayYmd);
  return (
    selectedDate !== today &&
    selectedDate !== yesterday &&
    selectedDate !== tomorrow
  );
}

type RelativeDatePresetChipsProps = {
  todayYmd: string;
  /** Count of items in scope when “All” is selected (e.g. full sorted list / filtered rows). */
  totalAll: number;
  /** Per-calendar-day counts; keys are `yyyy-MM-dd`. */
  countByDate: Map<string, number>;
  selectedDate: string | null;
  onSelect: (next: string | null) => void;
  /** Revisions use /10, missed panel uses /15 for active chip. */
  activeVariant?: "default" | "strong";
  className?: string;
};

const activeDefault =
  "border-kal-accent bg-kal-accent/10 text-kal-text";
const activeStrong =
  "border-kal-accent bg-kal-accent/15 text-kal-text";
const idle =
  "border-kal-border/70 bg-white/50 text-kal-text-secondary hover:border-kal-accent/40 hover:text-kal-text dark:bg-zinc-900/50";

/**
 * All + Today + Tomorrow + Yesterday with count badges. Does not include “Pick date” — place that next to this row.
 */
export function RelativeDatePresetChips({
  todayYmd,
  totalAll,
  countByDate,
  selectedDate,
  onSelect,
  activeVariant = "default",
  className,
}: RelativeDatePresetChipsProps) {
  const { yesterday, today, tomorrow } = getRelativeCalendarYmds(todayYmd);
  const activeClass = activeVariant === "strong" ? activeStrong : activeDefault;

  const chips: {
    key: string;
    label: string;
    value: string | null;
    count: number;
  }[] = [
    { key: "all", label: "All", value: null, count: totalAll },
    {
      key: "today",
      label: "Today",
      value: today,
      count: countByDate.get(today) ?? 0,
    },
    {
      key: "tomorrow",
      label: "Tomorrow",
      value: tomorrow,
      count: countByDate.get(tomorrow) ?? 0,
    },
    {
      key: "yesterday",
      label: "Yesterday",
      value: yesterday,
      count: countByDate.get(yesterday) ?? 0,
    },
  ];

  return (
    <div
      className={clsx(
        "flex min-w-0 flex-1 flex-wrap gap-2 overflow-x-auto pb-1 [scrollbar-width:thin] sm:flex-nowrap sm:-mx-1 sm:px-1",
        className,
      )}
      role="group"
      aria-label="Filter by due date"
    >
      {chips.map((c) => {
        const isActive =
          c.value == null
            ? selectedDate == null
            : selectedDate === c.value;
        return (
          <button
            key={c.key}
            type="button"
            onClick={() => onSelect(c.value)}
            className={clsx(
              "inline-flex shrink-0 items-center gap-1.5 rounded-full border px-3.5 py-1.5 text-xs font-semibold transition-colors",
              isActive ? activeClass : idle,
            )}
          >
            {c.label}
            <span className="rounded-full bg-kal-text/10 px-1.5 py-px text-[10px] tabular-nums text-kal-text">
              {c.count}
            </span>
          </button>
        );
      })}
    </div>
  );
}

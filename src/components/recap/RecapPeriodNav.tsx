"use client";

import clsx from "clsx";
import Link from "next/link";

export type RecapPeriod = "daily" | "weekly" | "monthly";

const SEGMENTS: { period: RecapPeriod; href: string; label: string }[] = [
  { period: "daily", href: "/recap", label: "Today" },
  { period: "weekly", href: "/recap/weekly", label: "Week" },
  { period: "monthly", href: "/recap/monthly", label: "Month" },
];

export type RecapPeriodNavProps = {
  active: RecapPeriod;
  className?: string;
};

export function RecapPeriodNav({ active, className }: RecapPeriodNavProps) {
  return (
    <nav
      role="tablist"
      aria-label="Recap period"
      className={clsx(
        "flex gap-0.5 rounded-xl border border-kal-border bg-kal-card-muted/40 p-0.5",
        className,
      )}
    >
      {SEGMENTS.map(({ period, href, label }) => {
        const isActive = period === active;
        return (
          <Link
            key={period}
            href={href}
            role="tab"
            aria-selected={isActive}
            aria-current={isActive ? "page" : undefined}
            className={clsx(
              "inline-flex min-h-[40px] min-w-[3.25rem] items-center justify-center rounded-lg px-2.5 text-xs font-semibold transition-colors sm:min-h-[44px] sm:px-3 sm:text-sm",
              isActive
                ? "bg-kal-card text-kal-text shadow-sm ring-1 ring-kal-accent/30"
                : "text-kal-muted hover:text-kal-text",
            )}
          >
            {label}
          </Link>
        );
      })}
    </nav>
  );
}

"use client";

export type ThreeDayStripProps = {
  yesterdayPercent: number;
  todayPercent: number;
  /** Tasks on tomorrow's unified daily plan (`daily_tasks`). */
  tomorrowTaskCount: number;
  /** Sum of slot durations (time_start→time_end) for tomorrow's plan, when set. */
  tomorrowMinutes: number;
};

function formatMinutesShort(minutes: number): string {
  const m = Math.max(0, Math.round(minutes));
  const h = Math.floor(m / 60);
  const min = m % 60;
  if (m <= 0) return "0m";
  if (h === 0) return `${min}m`;
  if (min === 0) return `${h}h`;
  return `${h}h ${min}m`;
}

/** Tomorrow cell: task count plus optional estimated load from timed slots. */
function formatTomorrowLoad(taskCount: number, totalMinutes: number): string {
  const n = Math.max(0, Math.round(taskCount));
  if (n <= 0) return "0 tasks";
  const mins = Math.max(0, Math.round(totalMinutes));
  if (mins <= 0) return `${n} task${n === 1 ? "" : "s"}`;
  return `${n} task${n === 1 ? "" : "s"} · ${formatMinutesShort(mins)}`;
}

function MiniBar({ percent }: { percent: number }) {
  const p = Math.min(100, Math.max(0, percent));
  return (
    <div className="mt-3 h-1.5 w-full overflow-hidden rounded-full bg-kal-border/80">
      <div
        className="h-full rounded-full bg-gradient-to-r from-kal-accent to-red-400 transition-[width] duration-500 ease-out"
        style={{ width: `${p}%` }}
      />
    </div>
  );
}

export function ThreeDayStrip({
  yesterdayPercent,
  todayPercent,
  tomorrowTaskCount,
  tomorrowMinutes,
}: ThreeDayStripProps) {
  const y = Math.min(100, Math.max(0, Math.round(yesterdayPercent)));
  const t = Math.min(100, Math.max(0, Math.round(todayPercent)));

  const cells = [
    {
      label: "Yesterday",
      sub: "Captured",
      main: `${y}%`,
      bar: y,
      small: false,
    },
    {
      label: "Today",
      sub: "Execute now",
      main: `${t}%`,
      bar: t,
      small: false,
    },
    {
      label: "Tomorrow",
      sub: "Planned load",
      main: formatTomorrowLoad(tomorrowTaskCount, tomorrowMinutes),
      bar: null as number | null,
      small: true,
    },
  ];

  return (
    <section
      aria-label="Three day execution strip"
      className="kal-glass-panel overflow-hidden rounded-2xl sm:rounded-2xl"
    >
      <p className="border-b border-kal-border px-5 py-4 text-[0.6rem] font-semibold uppercase tracking-[0.22em] text-kal-accent sm:px-6 sm:py-5 sm:text-[0.65rem] sm:tracking-[0.28em]">
        3-day execution
      </p>
      <div className="grid grid-cols-3 divide-x divide-kal-border">
        {cells.map((c) => (
          <div key={c.label} className="px-3 py-5 text-center sm:px-5 sm:py-7">
            <p className="text-[8px] font-semibold uppercase tracking-wide text-kal-muted sm:text-[9px] sm:tracking-wider">
              {c.label}
            </p>
            <p className="mt-0.5 text-[9px] font-medium uppercase tracking-wide text-kal-text-secondary sm:mt-1 sm:text-[10px]">
              {c.sub}
            </p>
            <p
              className={`mt-2 font-bold text-kal-text sm:mt-3 ${
                c.small
                  ? "text-[10px] leading-tight sm:text-xs md:text-sm"
                  : "text-2xl tabular-nums sm:text-3xl md:text-4xl"
              }`}
            >
              {c.main}
            </p>
            {c.bar != null ? <MiniBar percent={c.bar} /> : (
              <div className="mt-2 h-1.5 w-full rounded-full bg-kal-card-muted sm:mt-3" />
            )}
          </div>
        ))}
      </div>
    </section>
  );
}

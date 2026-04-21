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

function formatTomorrowValue(taskCount: number, totalMinutes: number): string {
  const n = Math.max(0, Math.round(taskCount));
  if (n <= 0) return "No tasks yet";
  const mins = Math.max(0, Math.round(totalMinutes));
  if (mins <= 0) return `${n} task${n === 1 ? "" : "s"} planned`;
  return `${n} task${n === 1 ? "" : "s"} · ${formatMinutesShort(mins)}`;
}

function ProgressBar({
  percent,
  today,
}: {
  percent: number | null;
  today: boolean;
}) {
  const p = percent != null ? Math.min(100, Math.max(0, percent)) : 0;
  return (
    <div
      className="h-1 w-full overflow-hidden rounded-full"
      style={{ background: "rgba(210,192,168,0.35)" }}
    >
      {percent != null ? (
        <div
          className="h-full rounded-full transition-[width] duration-500 ease-out"
          style={{
            width: `${p}%`,
            background: today ? "#EF9F27" : "#FAC775",
          }}
        />
      ) : (
        // Tomorrow — dashed line
        <div
          className="h-full w-full rounded-full opacity-50"
          style={{
            backgroundImage:
              "repeating-linear-gradient(90deg, rgba(210,192,168,0.6) 0, rgba(210,192,168,0.6) 4px, transparent 4px, transparent 8px)",
          }}
        />
      )}
    </div>
  );
}

type RowData = {
  label: string;
  percent: number | null;
  valueText: string;
  isToday: boolean;
};

export function ThreeDayStrip({
  yesterdayPercent,
  todayPercent,
  tomorrowTaskCount,
  tomorrowMinutes,
}: ThreeDayStripProps) {
  const y = Math.min(100, Math.max(0, Math.round(yesterdayPercent)));
  const t = Math.min(100, Math.max(0, Math.round(todayPercent)));

  const rows: RowData[] = [
    {
      label: "Yesterday",
      percent: y,
      valueText: `${y}% captured`,
      isToday: false,
    },
    {
      label: "Today",
      percent: t,
      valueText: `${t}% done`,
      isToday: true,
    },
    {
      label: "Tomorrow",
      percent: null,
      valueText: formatTomorrowValue(tomorrowTaskCount, tomorrowMinutes),
      isToday: false,
    },
  ];

  return (
    <section
      aria-label="Three day execution"
      className="kal-glass-panel overflow-hidden rounded-[12px]"
    >
      <div className="border-b border-kal-border/60 px-5 py-3">
        <p className="text-[10px] font-medium uppercase tracking-[0.18em] text-kal-accent">
          3-day execution
        </p>
      </div>

      <div className="divide-y divide-kal-border/40 px-5">
        {rows.map((row) => (
          <div
            key={row.label}
            className="flex items-center gap-4 py-3"
          >
            {/* Label */}
            <p
              className="w-[68px] shrink-0 text-[12px]"
              style={{
                color: row.isToday ? "#BA7517" : "var(--kal-muted)",
                fontWeight: row.isToday ? 500 : 400,
              }}
            >
              {row.label}
            </p>

            {/* Bar */}
            <div className="flex-1">
              <ProgressBar percent={row.percent} today={row.isToday} />
            </div>

            {/* Value */}
            <p
              className="w-[96px] shrink-0 text-right text-[12px] tabular-nums"
              style={{
                color: row.isToday ? "#BA7517" : "var(--kal-muted)",
                fontWeight: row.isToday ? 500 : 400,
              }}
            >
              {row.valueText}
            </p>
          </div>
        ))}
      </div>
    </section>
  );
}

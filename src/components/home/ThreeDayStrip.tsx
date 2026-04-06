"use client";

export type ThreeDayStripProps = {
  yesterdayPercent: number;
  todayPercent: number;
  tomorrowMarks: number;
  tomorrowMinutes: number;
};

function formatLoad(marks: number, minutes: number): string {
  const m = Math.max(0, Math.round(minutes));
  const h = Math.floor(m / 60);
  const min = m % 60;
  const time =
    m <= 0
      ? "0h"
      : h === 0
        ? `${min}m`
        : min === 0
          ? `${h}h`
          : `${h}h ${min}m`;
  const mk = `${marks.toFixed(0)} marks`;
  return `${mk} · ${time}`;
}

function MiniBar({ percent }: { percent: number }) {
  const p = Math.min(100, Math.max(0, percent));
  return (
    <div className="mt-3 h-1.5 w-full overflow-hidden rounded-full bg-white/[0.06]">
      <div
        className="h-full rounded-full bg-gradient-to-r from-emerald-600 to-emerald-400 transition-[width] duration-500 ease-out"
        style={{ width: `${p}%` }}
      />
    </div>
  );
}

export function ThreeDayStrip({
  yesterdayPercent,
  todayPercent,
  tomorrowMarks,
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
      main: formatLoad(tomorrowMarks, tomorrowMinutes),
      bar: null as number | null,
      small: true,
    },
  ];

  return (
    <section
      aria-label="Three day execution strip"
      className="overflow-hidden rounded-2xl border border-white/[0.07] bg-slate-900/35 shadow-xl shadow-black/30 backdrop-blur-md sm:rounded-3xl"
    >
      <p className="border-b border-white/[0.06] px-3 py-3 text-[0.6rem] font-semibold uppercase tracking-[0.22em] text-emerald-400/85 sm:px-5 sm:py-4 sm:text-[0.65rem] sm:tracking-[0.28em]">
        3-day execution
      </p>
      <div className="grid grid-cols-3 divide-x divide-white/[0.06]">
        {cells.map((c) => (
          <div key={c.label} className="px-2 py-4 text-center sm:px-4 sm:py-6">
            <p className="text-[8px] font-semibold uppercase tracking-wide text-slate-500 sm:text-[9px] sm:tracking-wider">
              {c.label}
            </p>
            <p className="mt-0.5 text-[9px] font-medium uppercase tracking-wide text-slate-600 sm:mt-1 sm:text-[10px]">
              {c.sub}
            </p>
            <p
              className={`mt-2 font-bold text-white sm:mt-3 ${
                c.small
                  ? "text-[10px] leading-tight sm:text-xs md:text-sm"
                  : "text-2xl tabular-nums sm:text-3xl md:text-4xl"
              }`}
            >
              {c.main}
            </p>
            {c.bar != null ? <MiniBar percent={c.bar} /> : (
              <div className="mt-2 h-1.5 w-full rounded-full bg-white/[0.04] sm:mt-3" />
            )}
          </div>
        ))}
      </div>
    </section>
  );
}

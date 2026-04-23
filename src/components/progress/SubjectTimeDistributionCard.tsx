"use client";

import clsx from "clsx";
import { useEffect, useState } from "react";

import {
  getSubjectTimeDistribution,
  type SubjectTimeStat,
  type SubjectTimeRange,
} from "@/actions/subjectTimeStats";

const RANGE_OPTIONS: { value: SubjectTimeRange; label: string }[] = [
  { value: "week", label: "This week" },
  { value: "month", label: "This month" },
  { value: "all", label: "All time" },
];

function formatHours(seconds: number): string {
  const h = seconds / 3600;
  if (h < 1) return `${Math.round(seconds / 60)}m`;
  return `${h.toFixed(1)}h`;
}

export function SubjectTimeDistributionCard() {
  const [range, setRange] = useState<SubjectTimeRange>("month");
  const [stats, setStats] = useState<SubjectTimeStat[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    getSubjectTimeDistribution(range).then((res) => {
      if (cancelled) return;
      if (res.ok) setStats(res.data);
      else setError(res.error);
      setLoading(false);
    });
    return () => { cancelled = true; };
  }, [range]);

  const maxSeconds = stats[0]?.totalSeconds ?? 1;
  const totalSeconds = stats.reduce((s, x) => s + x.totalSeconds, 0);

  return (
    <div className="kal-glass-card rounded-2xl p-5 space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h2 className="kal-section-heading">Subject Time Distribution</h2>
          {!loading && stats.length > 0 && (
            <p className="text-xs text-kal-text-secondary mt-0.5">
              Total: {formatHours(totalSeconds)}
            </p>
          )}
        </div>
        <div className="flex rounded-xl border border-kal-border overflow-hidden text-xs">
          {RANGE_OPTIONS.map(({ value, label }) => (
            <button
              key={value}
              onClick={() => setRange(value)}
              className={clsx(
                "px-3 py-1.5 font-medium transition-colors",
                range === value
                  ? "bg-kal-accent text-white"
                  : "bg-kal-surface/60 text-kal-text-secondary hover:text-kal-text",
              )}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* Content */}
      {loading ? (
        <div className="space-y-3">
          {[70, 55, 40, 30].map((w, i) => (
            <div key={i} className="flex items-center gap-3">
              <div className="w-24 h-3 rounded bg-kal-border/60 animate-pulse" />
              <div className="h-4 rounded-full bg-kal-border/60 animate-pulse" style={{ width: `${w}%` }} />
            </div>
          ))}
        </div>
      ) : error ? (
        <p className="text-sm text-red-500">{error}</p>
      ) : stats.length === 0 ? (
        <div className="py-8 text-center">
          <p className="text-sm text-kal-text-secondary">
            No timer data yet. Start the timer on a task linked to a syllabus topic and your time will appear here.
          </p>
        </div>
      ) : (
        <ul className="space-y-3">
          {stats.map(({ subject, totalSeconds: sec }) => {
            const pct = Math.round((sec / maxSeconds) * 100);
            return (
              <li key={subject} className="flex items-center gap-3">
                <span className="w-28 shrink-0 truncate text-sm font-medium text-kal-text" title={subject}>
                  {subject}
                </span>
                <div className="flex flex-1 items-center gap-2">
                  <div className="relative h-4 flex-1 overflow-hidden rounded-full bg-kal-border/40">
                    <div
                      className="h-full rounded-full bg-kal-accent/80 transition-all duration-500"
                      style={{ width: `${pct}%` }}
                      aria-hidden
                    />
                  </div>
                  <span className="w-10 shrink-0 text-right text-xs text-kal-text-secondary">
                    {formatHours(sec)}
                  </span>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

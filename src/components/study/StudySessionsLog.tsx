"use client";

import { format, parseISO } from "date-fns";

import type { StudySessionLog } from "@/lib/studySessionsIdb";

function formatInvested(sec: number): string {
  const s = Math.max(0, Math.round(sec));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  if (h > 0) return `${h}h ${m}m`;
  if (m > 0) return `${m}m`;
  return `${s}s`;
}

type Props = {
  sessions: StudySessionLog[];
  emptyMessage?: string;
};

export function StudySessionsLog({
  sessions,
  emptyMessage = "No study sessions yet.",
}: Props) {
  if (sessions.length === 0) {
    return (
      <li className="kal-glass-subtle rounded-2xl border border-dashed border-white/35 py-12 text-center text-sm text-kal-muted dark:border-white/15">
        {emptyMessage}
      </li>
    );
  }

  return (
    <>
      {sessions.map((s) => (
        <li
          key={s.id}
          className="kal-glass-subtle flex flex-wrap items-center justify-between gap-3 rounded-2xl px-4 py-3"
        >
          <div className="min-w-0 flex-1">
            <p className="font-semibold text-kal-text">{s.subject}</p>
            <div className="mt-1.5 flex flex-wrap items-baseline gap-x-2 gap-y-1.5 text-[11px] text-kal-muted">
              {s.is_camera_proven ? (
                <span className="inline-flex max-w-full flex-col gap-1 sm:inline-flex sm:max-w-none sm:flex-row sm:items-start sm:gap-2">
                  <span className="w-fit shrink-0 rounded-md border border-kal-accent/25 bg-kal-accent/10 px-1.5 py-0.5 font-medium text-kal-accent">
                    On-camera
                  </span>
                  <span className="min-w-0 text-[10px] leading-snug text-kal-text-secondary sm:text-[11px] sm:leading-relaxed">
                    Processed locally on your device. Only duration &amp; times are
                    saved—never video or images.
                  </span>
                </span>
              ) : (
                <span className="rounded-md border border-white/30 bg-white/50 px-1.5 py-0.5 font-medium text-kal-muted backdrop-blur-sm dark:border-white/12 dark:bg-zinc-900/55">
                  Claimed
                </span>
              )}
              <span className="w-full shrink-0 tabular-nums text-kal-muted sm:w-auto">
                {format(parseISO(s.ended_at), "EEE MMM d · HH:mm")}
              </span>
            </div>
          </div>
          <span className="shrink-0 text-sm font-bold tabular-nums text-kal-accent">
            {formatInvested(s.duration_seconds)}
          </span>
        </li>
      ))}
    </>
  );
}

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
      <li className="rounded-2xl border border-dashed border-white/[0.08] py-12 text-center text-sm text-zinc-500">
        {emptyMessage}
      </li>
    );
  }

  return (
    <>
      {sessions.map((s) => (
        <li
          key={s.id}
          className="flex flex-wrap items-center justify-between gap-2 rounded-2xl border border-violet-500/15 bg-violet-950/20 px-4 py-3"
        >
          <div className="min-w-0 flex-1">
            <p className="font-semibold text-white">{s.subject}</p>
            <div className="mt-1 flex flex-wrap items-baseline gap-x-2 gap-y-1 text-[11px] text-zinc-500">
              {s.is_camera_proven ? (
                <span className="inline-flex flex-col gap-0.5 sm:inline-flex sm:flex-row sm:items-baseline sm:gap-2">
                  <span className="w-fit rounded-md bg-emerald-500/20 px-1.5 py-0.5 font-medium text-emerald-200/90">
                    Camera proven
                  </span>
                  <span className="text-[10px] leading-tight text-emerald-400/80 sm:text-[11px]">
                    Processed locally on your device. Only duration &amp; times are
                    saved—never video or images.
                  </span>
                </span>
              ) : (
                <span className="rounded-md bg-slate-600/40 px-1.5 py-0.5 font-medium text-zinc-300">
                  Claimed
                </span>
              )}
              <span className="tabular-nums text-zinc-500">
                {format(parseISO(s.ended_at), "EEE MMM d · HH:mm")}
              </span>
            </div>
          </div>
          <span className="shrink-0 text-sm font-bold tabular-nums text-violet-300/90">
            {formatInvested(s.duration_seconds)}
          </span>
        </li>
      ))}
    </>
  );
}

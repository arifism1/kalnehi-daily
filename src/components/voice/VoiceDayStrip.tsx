"use client";

import { format, parseISO } from "date-fns";
import { Mic, Sparkles } from "lucide-react";
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";

import { listVoiceTimelineForDate, type VoiceTimelineRow } from "@/actions/voiceTimeline";
import { useAuthStore } from "@/store/useAuthStore";

type Props = {
  logDate: string;
};

export function VoiceDayStrip({ logDate }: Props) {
  const user = useAuthStore((s) => s.user);
  const [entries, setEntries] = useState<VoiceTimelineRow[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!user) {
      setEntries([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    const res = await listVoiceTimelineForDate(logDate);
    setLoading(false);
    if (res.ok) setEntries(res.entries.slice(0, 6));
  }, [user, logDate]);

  useEffect(() => {
    void load();
  }, [load]);

  if (!user) return null;

  return (
    <div className="rounded-2xl border border-violet-500/20 bg-gradient-to-r from-violet-950/35 to-slate-950/40 p-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2 min-w-0">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-violet-500/20 text-violet-300">
            <Mic className="h-5 w-5" aria-hidden />
          </div>
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-wider text-violet-400/90">
              Pro · Voice day
            </p>
            <p className="text-sm font-semibold text-white">Dictate My Day</p>
          </div>
        </div>
        <Link
          href="/dictate-day"
          className="shrink-0 rounded-xl bg-violet-600 px-4 py-2 text-xs font-bold text-white hover:bg-violet-500"
        >
          Open
        </Link>
      </div>
      {loading ? (
        <p className="mt-3 text-xs text-zinc-500">Loading voice notes…</p>
      ) : entries.length === 0 ? (
        <p className="mt-3 text-xs text-zinc-500">
          No voice logs for {logDate}. Tap Open to record your day in English.
        </p>
      ) : (
        <ul className="mt-3 space-y-2 border-t border-white/[0.06] pt-3">
          {entries.map((e) => (
            <li
              key={e.id}
              className="flex items-start justify-between gap-2 text-xs text-zinc-300"
            >
              <span className="min-w-0">
                <Sparkles className="mr-1 inline h-3 w-3 text-amber-400/80" aria-hidden />
                <span className="font-medium text-white">{e.title}</span>
                <span className="ml-2 tabular-nums text-zinc-500">
                  {format(parseISO(e.occurred_at), "HH:mm")}
                </span>
              </span>
              <span className="shrink-0 rounded-md bg-slate-800/80 px-1.5 py-0.5 text-[10px] uppercase text-zinc-400">
                {e.category.replace("_", " ")}
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

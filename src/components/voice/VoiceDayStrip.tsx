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
    try {
      const res = await listVoiceTimelineForDate(logDate);
      if (res.ok) setEntries(res.entries.slice(0, 6));
      else setEntries([]);
    } catch {
      setEntries([]);
    } finally {
      setLoading(false);
    }
  }, [user, logDate]);

  useEffect(() => {
    void load();
  }, [load]);

  if (!user) return null;

  return (
    <div className="rounded-2xl border border-kal-border bg-kal-card-muted p-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex min-w-0 items-center gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-kal-border bg-kal-card text-kal-accent">
            <Mic className="h-5 w-5" aria-hidden />
          </div>
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-wider text-kal-muted">
              Pro · Voice day
            </p>
            <p className="text-sm font-semibold text-kal-text">Dictate My Day</p>
          </div>
        </div>
        <Link
          href="/dictate-day"
          className="shrink-0 rounded-xl border border-kal-accent/30 px-4 py-2 text-xs font-bold uppercase tracking-wide text-kal-accent hover:bg-kal-accent/10"
        >
          Open
        </Link>
      </div>
      {loading ? (
        <p className="mt-3 text-xs text-kal-muted">Preparing your voice notes...</p>
      ) : entries.length === 0 ? (
        <p className="mt-3 text-xs text-kal-muted">
          No voice notes yet - dictate your first plan today!
        </p>
      ) : (
        <ul className="mt-3 space-y-2 border-t border-kal-border pt-3">
          {entries.map((e) => (
            <li
              key={e.id}
              className="flex items-start justify-between gap-2 text-xs text-kal-text-secondary"
            >
              <span className="min-w-0">
                <Sparkles className="mr-1 inline h-3 w-3 text-kal-accent/80" aria-hidden />
                <span className="font-medium text-kal-text">{e.title}</span>
                <span className="ml-2 tabular-nums text-kal-muted">
                  {format(parseISO(e.occurred_at), "HH:mm")}
                </span>
              </span>
              <span className="shrink-0 rounded-md border border-kal-border bg-kal-card px-1.5 py-0.5 text-[10px] uppercase text-kal-muted">
                {e.category.replace("_", " ")}
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

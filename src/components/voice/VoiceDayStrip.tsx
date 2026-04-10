"use client";

import { format, parseISO } from "date-fns";
import { Mic, Sparkles } from "lucide-react";
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";

import { listDailyPlanTasksForDate, type DailyTaskView } from "@/actions/dailyPlan";
import { useAuthStore } from "@/store/useAuthStore";

type Props = {
  logDate: string;
};

export function VoiceDayStrip({ logDate }: Props) {
  const user = useAuthStore((s) => s.user);
  const [entries, setEntries] = useState<DailyTaskView[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!user) {
      setEntries([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const res = await listDailyPlanTasksForDate(logDate, { source: "voice" });
      if (res.ok) setEntries(res.tasks.slice(-6).reverse());
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

  useEffect(() => {
    const fn = () => void load();
    window.addEventListener("kalnehi-daily-plan-synced", fn);
    return () => window.removeEventListener("kalnehi-daily-plan-synced", fn);
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
            <p className="text-sm font-semibold text-kal-text">From your voice plan</p>
          </div>
        </div>
        <Link
          href="/daily-plan"
          className="shrink-0 rounded-xl border border-kal-accent/30 px-4 py-2 text-xs font-bold uppercase tracking-wide text-kal-accent hover:bg-kal-accent/10"
        >
          Full plan
        </Link>
      </div>
      {loading ? (
        <p className="mt-3 text-xs text-kal-muted">Loading voice tasks…</p>
      ) : entries.length === 0 ? (
        <p className="mt-3 text-xs text-kal-muted">
          No voice-sourced tasks on this day yet — dictate from Plan or Daily planner.
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
                  {format(parseISO(e.created_at), "HH:mm")}
                </span>
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

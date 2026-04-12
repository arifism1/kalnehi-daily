"use client";

import { Check, Loader2, Mic, PenLine, Trash2, Type } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";

import {
  deleteDailyTask,
  listDailyPlanTasksForDate,
  updateDailyTask,
  type DailyTaskView,
} from "@/actions/dailyPlan";
import { findOverlappingTaskPairs } from "@/lib/dailyPlanOverlap";
import { timeDbToInput } from "@/lib/dailyPlanTime";
import { formatIstSlotRange12h } from "@/lib/voiceIst";

function SourceBadge({ source }: { source: string }) {
  const label =
    source === "voice" ? "Voice" : source === "handwritten" ? "Handwritten" : "Typed";
  const Icon =
    source === "voice" ? Mic : source === "handwritten" ? PenLine : Type;
  return (
    <span className="inline-flex items-center gap-1 rounded-full border border-white/30 bg-white/55 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-kal-muted backdrop-blur-sm dark:border-white/12 dark:bg-zinc-900/55">
      <Icon className="h-3 w-3 text-kal-accent" aria-hidden />
      {label}
    </span>
  );
}

type Props = {
  planDate: string;
  title?: string;
  className?: string;
};

export function UnifiedDailyPlanList({
  planDate,
  title = "Today's plan",
  className = "",
}: Props) {
  const [tasks, setTasks] = useState<DailyTaskView[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  const load = useCallback(
    async (opts?: { silent?: boolean }) => {
      const silent = opts?.silent === true;
      if (!silent) {
        setLoading(true);
      }
      setError(null);
      try {
        const res = await listDailyPlanTasksForDate(planDate);
        if (res.ok) setTasks(res.tasks);
        else setError(res.error);
      } catch {
        setError("Could not load plan.");
      } finally {
        if (!silent) setLoading(false);
      }
    },
    [planDate],
  );

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    const onSync = () => void load({ silent: true });
    window.addEventListener("kalnehi-daily-plan-synced", onSync);
    return () => window.removeEventListener("kalnehi-daily-plan-synced", onSync);
  }, [load]);

  const overlapIds = useMemo(
    () => findOverlappingTaskPairs(tasks),
    [tasks],
  );

  const isDoneStatus = (s: string) => s === "done";

  const toggleDone = async (t: DailyTaskView) => {
    const next = isDoneStatus(t.status) ? "pending" : "done";
    setError(null);
    setBusyId(t.id);
    setTasks((prev) =>
      prev.map((x) => (x.id === t.id ? { ...x, status: next } : x)),
    );
    try {
      const res = await updateDailyTask(t.id, { status: next });
      if (!res.ok) {
        setTasks((prev) =>
          prev.map((x) => (x.id === t.id ? { ...x, status: t.status } : x)),
        );
        setError(res.error);
        return;
      }
    } finally {
      setBusyId(null);
    }
  };

  const remove = async (id: string) => {
    setBusyId(id);
    try {
      const res = await deleteDailyTask(id);
      if (res.ok) await load({ silent: true });
    } finally {
      setBusyId(null);
    }
  };

  return (
    <section
      className={`kal-glass-panel rounded-[1.25rem] p-4 sm:p-6 ${className}`}
    >
      <div className="flex items-center justify-between gap-2">
        <h2 className="text-lg font-bold text-kal-text">{title}</h2>
        <span className="text-xs text-kal-muted">{planDate}</span>
      </div>

      {loading ? (
        <div className="mt-8 flex flex-col items-center gap-2 py-6">
          <Loader2 className="h-7 w-7 animate-spin text-kal-accent" />
          <p className="text-sm text-kal-muted">Loading plan…</p>
        </div>
      ) : error ? (
        <p className="mt-4 text-sm text-[var(--kal-danger-text)]" role="alert">
          {error}
        </p>
      ) : tasks.length === 0 ? (
        <p className="kal-glass-subtle mt-6 rounded-xl border border-dashed border-white/35 py-10 text-center text-sm text-kal-muted dark:border-white/15">
          Nothing on this plan yet — add from typing, voice, or handwritten above.
        </p>
      ) : (
        <ul className="mt-4 space-y-2">
          {tasks.map((t) => {
            const st = t.time_start ? timeDbToInput(t.time_start) : "";
            const et = t.time_end ? timeDbToInput(t.time_end) : "";
            const overlap = overlapIds.has(t.id);
            const done = isDoneStatus(t.status);
            return (
              <li
                key={t.id}
                className={`rounded-xl border p-3 transition-colors ${
                  done
                    ? "border-white/20 bg-white/45 opacity-90 backdrop-blur-sm dark:border-white/10 dark:bg-zinc-900/45"
                    : "kal-glass-subtle border-white/25 dark:border-white/12"
                }`}
              >
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <SourceBadge source={t.source} />
                      {done ? (
                        <span className="rounded-full bg-emerald-500/15 px-2 py-0.5 text-[10px] font-semibold text-emerald-800 dark:text-emerald-200">
                          Done
                        </span>
                      ) : null}
                      {overlap ? (
                        <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-semibold text-amber-900 dark:bg-amber-950/40 dark:text-amber-100">
                          Possible overlap
                        </span>
                      ) : null}
                    </div>
                    <p
                      className={`mt-2 text-sm font-semibold [overflow-wrap:anywhere] ${
                        done
                          ? "text-kal-muted line-through decoration-kal-muted"
                          : "text-kal-text"
                      }`}
                    >
                      {t.title}
                    </p>
                    {(st || et) && (
                      <p className="mt-1 text-xs font-medium text-kal-accent-dark dark:text-kal-accent">
                        {formatIstSlotRange12h(st, et)}
                        {t.time_slot && !st && !et ? ` · ${t.time_slot}` : null}
                      </p>
                    )}
                    {!st && !et && t.time_slot ? (
                      <p className="mt-1 text-xs text-kal-muted">{t.time_slot}</p>
                    ) : null}
                  </div>
                  <div className="flex shrink-0 gap-1">
                    <button
                      type="button"
                      role="checkbox"
                      disabled={busyId === t.id}
                      onClick={() => void toggleDone(t)}
                      className={`flex min-h-[44px] min-w-[44px] items-center justify-center rounded-lg border-2 transition-colors disabled:opacity-40 ${
                        done
                          ? "border-kal-accent bg-kal-accent text-white hover:bg-kal-accent-hover"
                          : "border-white/35 bg-white/60 text-kal-muted backdrop-blur-sm hover:border-kal-accent/50 hover:text-kal-accent dark:border-white/12 dark:bg-zinc-900/65"
                      }`}
                      aria-checked={done}
                      aria-label={
                        done ? "Mark as not done" : "Mark as done"
                      }
                      title={done ? "Mark as not done" : "Mark as done"}
                    >
                      {busyId === t.id ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : done ? (
                        <Check className="h-5 w-5" strokeWidth={2.5} />
                      ) : (
                        <span
                          className="block h-5 w-5 rounded border-2 border-current opacity-60"
                          aria-hidden
                        />
                      )}
                    </button>
                    <button
                      type="button"
                      disabled={busyId === t.id}
                      onClick={() => void remove(t.id)}
                      className="rounded-lg border border-kal-border p-2 text-kal-muted hover:bg-rose-500/10 hover:text-rose-600 disabled:opacity-40"
                      aria-label="Remove from plan"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}

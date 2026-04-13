"use client";

import { Check, Loader2, Mic, PenLine, Type } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";

import {
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
  /** Optional heading rendered above the list (used by source pages). */
  title?: string;
  className?: string;
};

export function UnifiedDailyPlanList({ planDate, title, className = "" }: Props) {
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

  const doneCount = tasks.filter((t) => isDoneStatus(t.status)).length;

  return (
    <section className={`kal-glass-panel rounded-[1.25rem] p-4 sm:p-6 ${className}`}>
      {title ? (
        <h2 className="mb-4 text-lg font-bold text-kal-text">{title}</h2>
      ) : null}
      {loading ? (
        <div className="flex flex-col items-center gap-2 py-12">
          <Loader2 className="h-7 w-7 animate-spin text-kal-accent" />
          <p className="text-sm text-kal-muted">Loading plan…</p>
        </div>
      ) : error ? (
        <p className="text-sm text-[var(--kal-danger-text)]" role="alert">
          {error}
        </p>
      ) : tasks.length === 0 ? (
        <div className="kal-glass-subtle rounded-xl border border-dashed border-white/35 py-14 text-center dark:border-white/15">
          <p className="text-sm font-semibold text-kal-text">Nothing here yet</p>
          <p className="mt-1 text-xs text-kal-muted">
            Add tasks via Dictate My Day, Self Type, or Handwritten below.
          </p>
        </div>
      ) : (
        <>
          {/* Progress summary */}
          <p className="mb-4 text-xs font-semibold text-kal-muted">
            {doneCount} / {tasks.length} done
          </p>
          <ul className="space-y-2">
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
                      ? "border-white/20 bg-white/45 opacity-75 backdrop-blur-sm dark:border-white/10 dark:bg-zinc-900/45"
                      : "kal-glass-subtle border-white/25 dark:border-white/12"
                  }`}
                >
                  <div className="flex items-start gap-3">
                    {/* Tick button */}
                    <button
                      type="button"
                      role="checkbox"
                      disabled={busyId === t.id}
                      onClick={() => void toggleDone(t)}
                      className={`mt-0.5 flex h-[26px] w-[26px] shrink-0 items-center justify-center rounded-md border-2 transition-colors disabled:opacity-40 ${
                        done
                          ? "border-kal-accent bg-kal-accent text-white"
                          : "border-white/40 bg-white/60 text-transparent hover:border-kal-accent/60 dark:border-white/15 dark:bg-zinc-900/65"
                      }`}
                      aria-checked={done}
                      aria-label={done ? "Mark as not done" : "Mark as done"}
                    >
                      {busyId === t.id ? (
                        <Loader2 className="h-3.5 w-3.5 animate-spin text-kal-accent" />
                      ) : (
                        <Check className="h-3.5 w-3.5" strokeWidth={3} />
                      )}
                    </button>

                    {/* Task content */}
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-1.5">
                        <SourceBadge source={t.source} />
                        {overlap ? (
                          <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-semibold text-amber-900 dark:bg-amber-950/40 dark:text-amber-100">
                            Overlap
                          </span>
                        ) : null}
                      </div>
                      <p
                        className={`mt-1.5 text-sm font-semibold leading-snug [overflow-wrap:anywhere] ${
                          done
                            ? "text-kal-muted line-through decoration-kal-muted/60"
                            : "text-kal-text"
                        }`}
                      >
                        {t.title}
                      </p>
                      {(st || et) && (
                        <p className="mt-1 text-xs font-medium text-kal-accent-dark dark:text-kal-accent">
                          {formatIstSlotRange12h(st, et)}
                        </p>
                      )}
                      {!st && !et && t.time_slot ? (
                        <p className="mt-1 text-xs text-kal-muted">{t.time_slot}</p>
                      ) : null}
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>
        </>
      )}
    </section>
  );
}

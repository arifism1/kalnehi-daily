"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import { applyOptimisticTaskDelete, applyOptimisticTaskUpdate } from "@/lib/taskMutations";
import { quickCreateEmptyTask } from "@/lib/quickTaskCreate";
import {
  dbTimeFromTwelveHour,
  twelveHourFromDate,
} from "@/lib/taskTime";
import { useTaskStore, type Task } from "@/store/useTaskStore";
import { surfaceErrorForUi } from "@/lib/userFacingErrors";

const HOURS = Array.from({ length: 12 }, (_, i) => i + 1);
const MINUTES = Array.from({ length: 60 }, (_, i) => i);

const PATCH_DEBOUNCE_MS = 350;

function taskIsDiscardableDraft(t: Task): boolean {
  const hasName = (t.name ?? "").trim().length > 0;
  const hasTime = !!(t.start_time || t.end_time);
  return !hasName && !hasTime;
}

type Props = {
  userId: string;
  assignedDate: string;
  onCancel: () => void;
  onSaved: () => void;
  onError: (message: string) => void;
};

export function PlannerQuickAddCard({
  userId,
  assignedDate,
  onCancel,
  onSaved,
  onError,
}: Props) {
  const onErrorRef = useRef(onError);
  onErrorRef.current = onError;

  const areaRef = useRef<HTMLTextAreaElement>(null);
  const [title, setTitle] = useState("");
  /** Empty string = no scheduled time (optional). */
  const [hour12, setHour12] = useState<string>("");
  const [minute, setMinute] = useState("0");
  const [period, setPeriod] = useState<"AM" | "PM">("AM");
  const [taskId, setTaskId] = useState<string | null>(null);
  /** True while lazily creating the task after user types / picks time. */
  const [creating, setCreating] = useState(false);

  const taskIdRef = useRef<string | null>(null);
  taskIdRef.current = taskId;

  const ensurePromiseRef = useRef<Promise<string | null> | null>(null);

  const titleRef = useRef(title);
  const hourRef = useRef(hour12);
  const minuteRef = useRef(minute);
  const periodRef = useRef(period);
  titleRef.current = title;
  hourRef.current = hour12;
  minuteRef.current = minute;
  periodRef.current = period;

  const patchTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const id = requestAnimationFrame(() => {
      areaRef.current?.focus();
    });
    return () => cancelAnimationFrame(id);
  }, []);

  useEffect(() => {
    ensurePromiseRef.current = null;
    setTaskId(null);
    taskIdRef.current = null;
    setTitle("");
    setHour12("");
    setMinute("0");
    setPeriod("AM");
    setCreating(false);
  }, [userId, assignedDate]);

  const ensureTaskId = useCallback(async (): Promise<string | null> => {
    if (taskIdRef.current) return taskIdRef.current;
    if (ensurePromiseRef.current) return ensurePromiseRef.current;
    const p = (async () => {
      try {
        const r = await quickCreateEmptyTask(userId, assignedDate);
        if (!r.ok) {
          onErrorRef.current(surfaceErrorForUi(r.error));
          return null;
        }
        setTaskId(r.id);
        taskIdRef.current = r.id;
        return r.id;
      } finally {
        ensurePromiseRef.current = null;
      }
    })();
    ensurePromiseRef.current = p;
    return p;
  }, [userId, assignedDate]);

  const pushPatch = useCallback(async () => {
    const id = taskIdRef.current;
    if (!id) return;
    const name =
      titleRef.current.trim().length > 0 ? titleRef.current.trim() : null;
    let start_time: string | null = null;
    if (hourRef.current !== "") {
      const h = Number(hourRef.current);
      const m = Number(minuteRef.current);
      if (!Number.isFinite(h) || !Number.isFinite(m)) {
        onErrorRef.current("Pick a valid time or clear the schedule.");
        return;
      }
      start_time = dbTimeFromTwelveHour({
        hour12: h,
        minute: m,
        period: periodRef.current,
      });
    }
    const res = await applyOptimisticTaskUpdate(
      id,
      { name, start_time, end_time: null },
      userId,
    );
    if (!res.ok) onErrorRef.current(surfaceErrorForUi(res.error));
  }, [userId]);

  const schedulePatch = useCallback(() => {
    if (patchTimerRef.current) clearTimeout(patchTimerRef.current);
    patchTimerRef.current = setTimeout(() => {
      patchTimerRef.current = null;
      void pushPatch();
    }, PATCH_DEBOUNCE_MS);
  }, [pushPatch]);

  const applyRightNow = useCallback(() => {
    const t = twelveHourFromDate(new Date());
    setHour12(String(t.hour12));
    setMinute(String(t.minute));
    setPeriod(t.period);
    void (async () => {
      if (!taskIdRef.current) {
        setCreating(true);
        const id = await ensureTaskId();
        setCreating(false);
        if (!id) return;
      }
      requestAnimationFrame(() => schedulePatch());
    })();
  }, [ensureTaskId, schedulePatch]);

  const clearTime = useCallback(() => {
    setHour12("");
    setMinute("0");
    setPeriod("AM");
    requestAnimationFrame(() => schedulePatch());
  }, [schedulePatch]);

  const finish = useCallback(() => {
    if (patchTimerRef.current) {
      clearTimeout(patchTimerRef.current);
      patchTimerRef.current = null;
    }
    void (async () => {
      await pushPatch();
      const id = taskIdRef.current;
      if (id) {
        const row = useTaskStore.getState().tasks[id];
        if (row && taskIsDiscardableDraft(row)) {
          await applyOptimisticTaskDelete(id, userId);
        }
      }
      onSaved();
    })();
  }, [pushPatch, userId, onSaved]);

  const cancel = useCallback(() => {
    if (patchTimerRef.current) {
      clearTimeout(patchTimerRef.current);
      patchTimerRef.current = null;
    }
    void (async () => {
      await pushPatch();
      const id = taskIdRef.current;
      if (id) {
        const row = useTaskStore.getState().tasks[id];
        if (row && taskIsDiscardableDraft(row)) {
          await applyOptimisticTaskDelete(id, userId);
        }
      }
      onCancel();
    })();
  }, [pushPatch, userId, onCancel]);

  const timeDisabled = hour12 === "";

  return (
    <div className="rounded-[1rem] border border-kal-border bg-kal-card kal-shadow-card p-3 sm:p-4 md:p-5">
      <p className="mb-2 text-[10px] text-kal-muted">
        Add a target — it saves as you type.
      </p>
      <label className="block">
        <span className="sr-only">Task name</span>
        <textarea
          ref={areaRef}
          value={title}
          onChange={(e) => {
            const v = e.target.value;
            setTitle(v);
            void (async () => {
              if (!taskIdRef.current && v.trim().length === 0) return;
              if (!taskIdRef.current) {
                setCreating(true);
                const id = await ensureTaskId();
                setCreating(false);
                if (!id) return;
              }
              schedulePatch();
            })();
          }}
          onKeyDown={(e) => {
            if (e.key === "Escape") {
              e.preventDefault();
              cancel();
            }
            if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
              e.preventDefault();
              finish();
            }
          }}
          rows={3}
          placeholder="Task name — start typing"
          autoComplete="off"
          disabled={creating}
          className="min-h-[4.5rem] w-full min-w-0 resize-y overflow-hidden rounded-lg border border-kal-border bg-kal-input-bg px-3 py-3 text-base font-medium leading-snug text-kal-text outline-none placeholder:text-kal-muted [overflow-wrap:anywhere] focus-visible:border-kal-accent/40 focus-visible:ring-2 focus-visible:ring-kal-accent/25 disabled:opacity-50 sm:min-h-[5.5rem] sm:rounded-xl sm:px-4 sm:py-3.5 sm:text-[17px]"
        />
      </label>

      <div className="mt-3 space-y-2 sm:mt-4">
        <p className="text-[0.6rem] font-semibold uppercase tracking-[0.16em] text-kal-muted sm:text-[0.65rem] sm:tracking-[0.2em]">
          Time (optional)
        </p>
        <div className="flex flex-wrap items-center gap-2 sm:gap-3">
          <select
            aria-label="Hour"
            value={hour12}
            disabled={creating}
            onChange={(e) => {
              const v = e.target.value;
              setHour12(v);
              void (async () => {
                if (v !== "" && !taskIdRef.current) {
                  setCreating(true);
                  const id = await ensureTaskId();
                  setCreating(false);
                  if (!id) return;
                }
                schedulePatch();
              })();
            }}
            className="min-h-[44px] min-w-[5.5rem] flex-1 rounded-xl border border-kal-border bg-kal-input-bg px-3 text-base sm:text-sm font-medium text-kal-text outline-none focus-visible:ring-2 focus-visible:ring-kal-accent/30 disabled:opacity-50 sm:flex-none"
          >
            <option value="">No time</option>
            {HOURS.map((h) => (
              <option key={h} value={String(h)}>
                {h}
              </option>
            ))}
          </select>
          <span className="text-kal-muted">:</span>
          <select
            aria-label="Minute"
            value={minute}
            disabled={timeDisabled || creating}
            onChange={(e) => {
              setMinute(e.target.value);
              schedulePatch();
            }}
            className="min-h-[44px] min-w-[5.5rem] flex-1 rounded-xl border border-kal-border bg-kal-input-bg px-3 text-base sm:text-sm font-medium text-kal-text outline-none focus-visible:ring-2 focus-visible:ring-kal-accent/30 disabled:cursor-not-allowed disabled:opacity-40 sm:flex-none"
          >
            {MINUTES.map((m) => (
              <option key={m} value={String(m)}>
                {String(m).padStart(2, "0")}
              </option>
            ))}
          </select>
          <select
            aria-label="AM or PM"
            value={period}
            disabled={timeDisabled || creating}
            onChange={(e) => {
              setPeriod(e.target.value as "AM" | "PM");
              schedulePatch();
            }}
            className="min-h-[44px] min-w-[5.5rem] flex-1 rounded-xl border border-kal-border bg-kal-input-bg px-3 text-base sm:text-sm font-medium text-kal-text outline-none focus-visible:ring-2 focus-visible:ring-kal-accent/30 disabled:cursor-not-allowed disabled:opacity-40 sm:flex-none"
          >
            <option value="AM">AM</option>
            <option value="PM">PM</option>
          </select>
          <button
            type="button"
            onClick={applyRightNow}
            disabled={creating}
            className="min-h-[44px] shrink-0 rounded-xl border border-orange-500/45 bg-orange-600/20 px-4 text-xs font-bold uppercase tracking-wide text-orange-200 shadow-sm shadow-orange-950/30 transition-colors hover:bg-orange-600/35 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500/50 disabled:opacity-50"
          >
            Right now
          </button>
        </div>
        {hour12 !== "" && (
          <button
            type="button"
            onClick={clearTime}
            className="text-[11px] font-medium text-kal-muted underline-offset-2 hover:text-kal-text-secondary hover:underline"
          >
            Clear time
          </button>
        )}
      </div>

      <p className="mt-2 text-[10px] text-kal-muted">
        <kbd className="rounded border border-kal-border bg-kal-card-muted px-1 py-0.5 font-mono text-[9px]">
          Ctrl
        </kbd>
        +
        <kbd className="rounded border border-kal-border bg-kal-card-muted px-1 py-0.5 font-mono text-[9px]">
          Enter
        </kbd>
        {" (⌘+Enter on Mac) · Esc cancels"}
      </p>

      <div className="mt-4 flex flex-wrap items-center justify-end gap-2 border-t border-kal-border pt-3 sm:mt-5 sm:pt-4">
        <button
          type="button"
          onClick={cancel}
          disabled={creating}
          className="min-h-[44px] rounded-xl px-4 text-sm font-medium text-kal-muted transition-colors hover:bg-kal-card-muted hover:text-kal-text disabled:opacity-50"
        >
          Cancel
        </button>
        <button
          type="button"
          disabled={creating}
          onClick={finish}
          className="min-h-[44px] rounded-xl bg-kal-accent px-6 text-sm font-bold text-white shadow-sm transition-all hover:bg-kal-accent-hover active:scale-[0.98] disabled:opacity-60"
        >
          Done
        </button>
      </div>
    </div>
  );
}

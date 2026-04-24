"use client";

import { useCallback, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Zap } from "lucide-react";

import { useCalendarDate } from "@/hooks/useCalendarDate";
import { filterTasksForDate } from "@/lib/progressEngine";
import { applyOptimisticTaskUpdate } from "@/lib/taskMutations";
import { useAuthStore } from "@/store/useAuthStore";
import { useActiveTimerStore } from "@/store/useActiveTimerStore";
import { useTaskStore } from "@/store/useTaskStore";
import { TapBounce } from "@/components/ui/TapBounce";
import { TASK_STATUS } from "@/components/task/TaskCard";

/**
 * One tap: jump into the first actionable task and start the focus timer.
 */
export function StartTodayButton() {
  const router = useRouter();
  const userId = useAuthStore((s) => s.user?.id);
  const today = useCalendarDate();
  const tasks = useTaskStore((s) => s.tasks);
  const [busy, setBusy] = useState(false);

  const firstTask = useMemo(() => {
    const list = Object.values(tasks);
    const todays = filterTasksForDate(list, today);
    const open = todays
      .filter(
        (t) =>
          t.status === "pending" || t.status === "in_progress",
      )
      .sort(
        (a, b) =>
          (a.start_time ?? "").localeCompare(b.start_time ?? "") ||
          (a.created_at ?? "").localeCompare(b.created_at ?? ""),
      );
    return open[0] ?? null;
  }, [tasks, today]);

  const onStart = useCallback(async () => {
    if (!userId) {
      router.push("/auth");
      return;
    }
    if (!firstTask) {
      router.push("/plan-my-day");
      return;
    }
    setBusy(true);
    try {
      const st = useActiveTimerStore.getState();
      if (st.taskId && st.taskId !== firstTask.id) {
        st.stop();
      }
      if (firstTask.status === "pending") {
        await applyOptimisticTaskUpdate(
          firstTask.id,
          {
            status: TASK_STATUS.in_progress,
            time_spent_seconds: firstTask.time_spent_seconds ?? 0,
          },
          userId,
        );
        useActiveTimerStore
          .getState()
          .start(firstTask.id, firstTask.time_spent_seconds ?? 0);
      } else {
        useActiveTimerStore
          .getState()
          .start(firstTask.id, firstTask.time_spent_seconds ?? 0);
        if (useActiveTimerStore.getState().resumeAt === null) {
          useActiveTimerStore.getState().resume();
        }
      }
      router.push("/daily-plan");
    } finally {
      setBusy(false);
    }
  }, [firstTask, router, userId]);

  const label = firstTask ? "Start today" : "Plan your day first";

  return (
    <TapBounce className="w-full sm:max-w-md">
      <button
        type="button"
        onClick={() => void onStart()}
        disabled={busy}
        className="flex w-full min-h-[52px] items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-amber-500 to-kal-accent px-6 text-base font-bold text-white shadow-lg shadow-amber-500/20 transition hover:opacity-95 disabled:opacity-60"
        aria-label={label}
      >
        {busy ? (
          <Loader2 className="h-5 w-5 shrink-0 animate-spin" />
        ) : (
          <Zap className="h-5 w-5 shrink-0" aria-hidden />
        )}
        {label}
      </button>
    </TapBounce>
  );
}

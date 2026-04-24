"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useCalendarDate } from "@/hooks/useCalendarDate";
import { computeExecutionStreak, computeDayExecutionSnapshot } from "@/lib/dailyExecutionStats";
import { useTaskStore } from "@/store/useTaskStore";
import { filterTasksForDate } from "@/lib/progressEngine";
import { useDailyPlanExecutionForRange } from "@/hooks/useDailyPlanExecutionForRange";
import { subDays, format, parseISO } from "date-fns";
import { EndOfDaySummary } from "@/components/reports/EndOfDaySummary";
import { WeeklyReportCard } from "@/components/reports/WeeklyReportCard";
import { getAnonymousLeaderboardLine } from "@/actions/leaderboard";
import { useUserXpProfile } from "@/hooks/useUserXpProfile";
import {
  classifyDailyProgressBand,
  DAILY_PROGRESS_HEADLINE,
} from "@/lib/progressEngine";

export default function DebriefRitualPage() {
  const today = useCalendarDate();
  const tasksRecord = useTaskStore((s) => s.tasks);
  const micro = useTaskStore((s) => s.microtopics);
  const { xp, loading: xpL } = useUserXpProfile();
  const [lb, setLb] = useState<string | null>(null);
  const [show, setShow] = useState(false);

  const overlay = useDailyPlanExecutionForRange(
    format(subDays(parseISO(today), 120), "yyyy-MM-dd"),
    today,
  );
  const list = useMemo(() => Object.values(tasksRecord), [tasksRecord]);
  const todays = useMemo(() => filterTasksForDate(list, today), [list, today]);
  const snap = useMemo(
    () => computeDayExecutionSnapshot(list, micro, today, overlay),
    [list, micro, today, overlay],
  );
  const streak = useMemo(
    () => computeExecutionStreak(list, micro, today, 60, 120, overlay),
    [list, micro, today, overlay],
  );
  const done = todays.filter((t) => t.status === "completed").length;
  const total = todays.length;
  const band = classifyDailyProgressBand(
    Number.isFinite(snap.weightedPercent) ? snap.weightedPercent : 0,
    snap.plannedTasks,
  );
  const consistency = Math.round(
    Math.min(100, Math.max(0, snap.plannedTasks > 0 ? snap.weightedPercent : 0)),
  );

  useEffect(() => {
    void (async () => {
      const r = await getAnonymousLeaderboardLine();
      if (r.ok && r.data.topPercent != null) {
        setLb(`Top ${r.data.topPercent}% of ${r.data.examGroupLabel} this week`);
      } else {
        setLb(null);
      }
    })();
  }, []);

  return (
    <div className="mx-auto min-h-dvh max-w-2xl bg-gradient-to-b from-violet-50 to-amber-50/30 px-4 pb-20 pt-4 text-kal-text dark:from-zinc-950 dark:to-zinc-900 dark:text-zinc-100 sm:pt-6">
      <Link href="/" className="text-sm font-semibold text-violet-700 dark:text-violet-300">
        ← War Room
      </Link>
      <h1 className="mt-6 font-serif text-2xl font-bold">Night Debrief</h1>
      <p className="mt-1 text-sm text-kal-muted">Soft light. Honest data. A better tomorrow.</p>

      <section className="mt-6 space-y-3">
        <p className="text-sm text-kal-text-secondary">
          What one thing are you proudest of today — and what will you not repeat tomorrow?
        </p>
        <p className="text-sm text-kal-text-secondary">
          If you had 20 more minutes, where would you have spent them for max leverage?
        </p>
        <p className="text-xs text-kal-muted">
          {DAILY_PROGRESS_HEADLINE[band]} ({snap.plannedTasks} items in today&rsquo;s plan mix)
        </p>
        <button
          type="button"
          onClick={() => setShow(true)}
          className="w-full rounded-2xl bg-violet-600 py-3 text-sm font-bold text-white dark:bg-violet-700"
        >
          Cinematic recap
        </button>
      </section>

      <div className="mt-8">
        {!xpL && (
          <WeeklyReportCard
            xp={xp}
            consistencyPercent={consistency}
            leaderboardLine={lb}
            topSubject="Your hardest chapter this week (see Syllabus)"
          />
        )}
      </div>

      <EndOfDaySummary
        open={show}
        onClose={() => setShow(false)}
        tasksDone={done}
        totalTasks={Math.max(1, total || 1)}
        minutesStudied={45}
        streak={streak}
      />
    </div>
  );
}

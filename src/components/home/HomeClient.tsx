"use client";

import { addDays, format, parseISO } from "date-fns";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";

import { useCalendarDate } from "@/hooks/useCalendarDate";
import { ensureAutomatedNotifications } from "@/actions/notifications";
import { useTargetExamDisplay } from "@/hooks/useTargetExamDisplay";
import { useRefreshTasksOnHomeFocus } from "@/hooks/useRefreshTasksOnHomeFocus";
import { useSyllabusTracker } from "@/hooks/useSyllabusTracker";
import {
  pickDailyPhraseIndex,
  type DailyMotivationalPhraseRow,
} from "@/lib/dailyMotivationalPhrase";
import { getSupabaseBrowserClient } from "@/lib/supabase";
import { buildSyllabusMultiYearCapture } from "@/lib/syllabusRollup";
import { shouldShowSyllabusComingSoon } from "@/lib/examProfile";
import {
  classifyDailyProgressBand,
  computeWeightedCompletionPercent,
  computeWeightedMarksTotals,
  filterTasksForDate,
  filterTasksThroughDate,
  sumEstimatedMinutes,
  sumPlannedMarksWeight,
} from "@/lib/progressEngine";
import { useAuthStore } from "@/store/useAuthStore";
import { useSettingsStore } from "@/store/useSettingsStore";
import { useTaskStore } from "@/store/useTaskStore";

import { MissedTasks } from "./MissedTasks";
import { MotivationWallpaper } from "./MotivationWallpaper";
import { MotivationStrip } from "./MotivationStrip";
import { RealitySnapshot } from "./RealitySnapshot";
import { ThreeDayStrip } from "./ThreeDayStrip";
import { QuickMeditationCards } from "./QuickMeditationCards";

export function HomeClient() {
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  useRefreshTasksOnHomeFocus();
  useEffect(() => {
    router.prefetch("/syllabus");
    router.prefetch("/plan-my-day");
    router.prefetch("/daily-plan");
    router.prefetch("/motivation");
    router.prefetch("/meditation");
    router.prefetch("/habits");
  }, [router]);
  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        await ensureAutomatedNotifications();
      } catch (error) {
        if (!cancelled) {
          console.warn("[HomeClient] ensureAutomatedNotifications failed", error);
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const {
    examLabel,
    examDisplayName,
    examLabelLoading,
  } = useTargetExamDisplay();
  const tasksRecord = useTaskStore((s) => s.tasks);
  const microtopicById = useTaskStore((s) => s.microtopics);
  const {
    rows: syllabusRows,
    rollup: syllabusRollup,
    neetYearProjections,
    primaryMarksYear,
    maxScore: syllabusScoreMax,
    cuetScoringRollup,
    cuetAwaitingDomainSelection,
    loading: syllabusLoading,
    error: syllabusError,
  } = useSyllabusTracker();

  const advancedMarksProjectionEnabled = useSettingsStore(
    (s) => s.advancedMarksProjectionEnabled,
  );

  const showSyllabusComingSoonBanner = shouldShowSyllabusComingSoon({
    examLabel,
    examLabelLoading,
    syllabusLoading,
    syllabusError,
    syllabusRowCount: syllabusRows.length,
    cuetAwaitingDomainSelection,
  });

  const today = useCalendarDate();
  const yesterday = useMemo(
    () => format(addDays(parseISO(today), -1), "yyyy-MM-dd"),
    [today],
  );
  const tomorrow = useMemo(
    () => format(addDays(parseISO(today), 1), "yyyy-MM-dd"),
    [today],
  );

  const taskList = useMemo(() => Object.values(tasksRecord), [tasksRecord]);

  const { realityTasks, todayTasks, yesterdayTasks, tomorrowTasks } =
    useMemo(() => {
      const reality = filterTasksThroughDate(taskList, today);
      const todayOnly = filterTasksForDate(taskList, today);
      const yTasks = filterTasksForDate(taskList, yesterday);
      const tTasks = filterTasksForDate(taskList, tomorrow);
      return {
        realityTasks: reality,
        todayTasks: todayOnly,
        yesterdayTasks: yTasks,
        tomorrowTasks: tTasks,
      };
    }, [taskList, today, yesterday, tomorrow]);

  const todayWeighted = useMemo(
    () => computeWeightedCompletionPercent(todayTasks, microtopicById),
    [todayTasks, microtopicById],
  );

  const dailyBand = useMemo(
    () => classifyDailyProgressBand(todayWeighted, todayTasks.length),
    [todayWeighted, todayTasks.length],
  );

  const yesterdayWeighted = useMemo(
    () => computeWeightedCompletionPercent(yesterdayTasks, microtopicById),
    [yesterdayTasks, microtopicById],
  );

  const { mastered, total } = useMemo(() => {
    if (cuetScoringRollup) {
      return {
        mastered: cuetScoringRollup.totalProjected,
        total: cuetScoringRollup.totalMax,
      };
    }
    if (syllabusRows.length > 0) {
      return {
        mastered: syllabusRollup.totalMarksMastered,
        total: syllabusRollup.totalMarksPool,
      };
    }
    return computeWeightedMarksTotals(realityTasks, microtopicById);
  }, [
    cuetScoringRollup,
    syllabusRows.length,
    syllabusRollup.totalMarksMastered,
    syllabusRollup.totalMarksPool,
    realityTasks,
    microtopicById,
  ]);

  const syllabusMasteryPercent = useMemo(() => {
    if (cuetScoringRollup) return cuetScoringRollup.overallPercent;
    if (syllabusRows.length > 0) return syllabusRollup.overallPercent;
    return null;
  }, [
    cuetScoringRollup,
    syllabusRows.length,
    syllabusRollup.overallPercent,
  ]);

  const syllabusMultiYear = useMemo(() => {
    if (!advancedMarksProjectionEnabled) return null;
    if (syllabusRows.length === 0 || neetYearProjections.length === 0) {
      return null;
    }
    return buildSyllabusMultiYearCapture(
      neetYearProjections,
      syllabusScoreMax,
      primaryMarksYear,
    );
  }, [
    advancedMarksProjectionEnabled,
    syllabusRows.length,
    neetYearProjections,
    syllabusScoreMax,
    primaryMarksYear,
  ]);

  const tomorrowMarks = useMemo(
    () => sumPlannedMarksWeight(tomorrowTasks, microtopicById),
    [tomorrowTasks, microtopicById],
  );

  const tomorrowMinutes = useMemo(
    () => sumEstimatedMinutes(tomorrowTasks),
    [tomorrowTasks],
  );

  const welcomeName = useMemo(() => {
    const meta = user?.user_metadata as Record<string, unknown> | undefined;
    const fromMeta =
      (typeof meta?.full_name === "string" && meta.full_name.trim()) ||
      (typeof meta?.name === "string" && meta.name.trim()) ||
      null;
    if (fromMeta) return fromMeta;
    if (typeof user?.email === "string" && user.email.includes("@")) {
      return user.email.split("@")[0] ?? "Aspirant";
    }
    return "Aspirant";
  }, [user]);

  const firstName = useMemo(() => {
    const part = welcomeName.split(/\s+/)[0]?.trim();
    return part || "Aspirant";
  }, [welcomeName]);

  const greetingLead = (() => {
    const h = new Date().getHours();
    if (h >= 5 && h < 12) return "Good morning";
    return "Hi";
  })();

  const [dailyPhrase, setDailyPhrase] = useState<DailyMotivationalPhraseRow | null>(
    null,
  );
  const [dailyPhraseLoading, setDailyPhraseLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      setDailyPhraseLoading(true);
      try {
        const supabase = getSupabaseBrowserClient();
        const { data, error } = await supabase
          .from("daily_motivational_phrases")
          .select("id, phrase, author, category")
          .eq("active", true)
          .order("phrase", { ascending: true });
        if (cancelled) return;
        if (error || !data?.length) {
          setDailyPhrase(null);
          return;
        }
        const idx = pickDailyPhraseIndex(today, data.length);
        setDailyPhrase(data[idx] ?? null);
      } catch {
        if (!cancelled) setDailyPhrase(null);
      } finally {
        if (!cancelled) setDailyPhraseLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [today]);

  return (
    <div className="relative flex min-h-full flex-col gap-6 pb-10 text-kal-text sm:gap-8 md:gap-10 md:pb-14">
      <MotivationWallpaper />
      <header className="relative z-[1] overflow-hidden rounded-[1rem] border border-kal-border bg-kal-card px-5 py-6 kal-shadow-card sm:rounded-[1.25rem] sm:px-8 sm:py-7 lg:px-10 lg:py-8">
        <div
          className="pointer-events-none absolute -right-16 -top-16 h-48 w-48 rounded-full bg-kal-accent/15 blur-3xl"
          aria-hidden
        />
        <div
          className="pointer-events-none absolute -bottom-20 -left-16 h-40 w-40 rounded-full bg-kal-accent/10 blur-3xl"
          aria-hidden
        />

        <div className="relative flex flex-col gap-4 sm:gap-5">
          <div className="space-y-1 sm:space-y-1.5">
            <h1 className="text-[1.4rem] font-semibold leading-tight tracking-tight text-kal-text sm:text-2xl md:text-[1.75rem]">
              Welcome to Kalnehi
            </h1>
            <p className="text-sm text-kal-muted sm:text-[0.95rem]">
              <span className="text-kal-text">{`${greetingLead}, ${firstName}`}</span>
            </p>
          </div>

          <div className="border-t border-kal-border/80 pt-4 sm:pt-5">
            <p className="text-[0.62rem] font-semibold uppercase tracking-[0.2em] text-kal-muted sm:text-[0.68rem]">
              Today&apos;s line
            </p>
            <blockquote
              className={`relative mt-2 max-w-3xl text-[1rem] font-medium leading-snug text-kal-text sm:mt-2.5 sm:text-[1.0625rem] sm:leading-snug md:text-lg md:leading-snug ${dailyPhraseLoading ? "opacity-40" : ""}`}
            >
              {dailyPhraseLoading ? (
                <span className="block min-h-[2.75rem] w-full max-w-2xl animate-pulse rounded-lg bg-kal-border/35 sm:min-h-[3.25rem]" />
              ) : dailyPhrase ? (
                <>
                  <span className="text-kal-accent">&ldquo;</span>
                  {dailyPhrase.phrase}
                  <span className="text-kal-accent">&rdquo;</span>
                  {dailyPhrase.author ? (
                    <footer className="mt-2 text-xs font-normal not-italic text-kal-muted sm:mt-2.5 sm:text-sm">
                      — {dailyPhrase.author}
                    </footer>
                  ) : null}
                </>
              ) : (
                <span className="text-kal-muted">
                  Small daily wins stack into the rank you are building—open your plan
                  and take the next honest step.
                </span>
              )}
            </blockquote>
          </div>
        </div>
      </header>

      <MotivationStrip />

      <RealitySnapshot
        marksMastered={mastered}
        marksTotal={total}
        syllabusMasteryPercent={syllabusMasteryPercent}
        syllabusMultiYear={syllabusMultiYear}
        todayPercent={todayWeighted}
        todayTaskCount={todayTasks.length}
        dailyBand={dailyBand}
        showSyllabusComingSoonBanner={showSyllabusComingSoonBanner}
        examDisplayName={examDisplayName}
        examLabel={examLabel}
        primaryMarksYear={cuetScoringRollup ? null : primaryMarksYear}
        cuetScoring={cuetScoringRollup}
        showAdvancedMarksProjection={advancedMarksProjectionEnabled}
      />

      <ThreeDayStrip
        yesterdayPercent={yesterdayWeighted}
        todayPercent={todayWeighted}
        tomorrowMarks={tomorrowMarks}
        tomorrowMinutes={tomorrowMinutes}
      />

      <QuickMeditationCards />

      <MissedTasks />
    </div>
  );
}

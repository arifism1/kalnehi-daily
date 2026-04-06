"use client";

import { useId, useMemo } from "react";

import { useCalendarDate } from "@/hooks/useCalendarDate";
import { useSyllabusTracker } from "@/hooks/useSyllabusTracker";
import { useTargetExamDisplay } from "@/hooks/useTargetExamDisplay";
import { shouldShowSyllabusComingSoon } from "@/lib/examProfile";
import {
  classifyDailyProgressBand,
  classifyProgressMessageWithScope,
  computeWeightedCompletionPercent,
  computeWeightedMarksTotals,
  DAILY_PROGRESS_HEADLINE,
  filterTasksForDate,
  filterTasksThroughDate,
  PROGRESS_MESSAGE_LABEL,
} from "@/lib/progressEngine";
import { buildSyllabusMultiYearCapture } from "@/lib/syllabusRollup";
import { topicCompletionStats } from "@/lib/progressOverview";
import { useSettingsStore } from "@/store/useSettingsStore";
import { useTaskStore } from "@/store/useTaskStore";

function Ring({ percent, gid }: { percent: number; gid: string }) {
  const r = 40;
  const stroke = 6;
  const c = 2 * Math.PI * r;
  const p = Math.min(100, Math.max(0, percent));
  const dash = (p / 100) * c;
  return (
    <svg
      width={96}
      height={96}
      viewBox="0 0 96 96"
      className="shrink-0 -rotate-90"
      aria-hidden
    >
      <defs>
        <linearGradient id={gid} x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#34d399" />
          <stop offset="100%" stopColor="#14b8a6" />
        </linearGradient>
      </defs>
      <circle
        cx={48}
        cy={48}
        r={r}
        fill="none"
        stroke="currentColor"
        strokeWidth={stroke}
        className="text-slate-700"
      />
      <circle
        cx={48}
        cy={48}
        r={r}
        fill="none"
        stroke={`url(#${gid})`}
        strokeWidth={stroke}
        strokeDasharray={`${dash} ${c}`}
        strokeLinecap="round"
        className="transition-[stroke-dasharray] duration-500"
      />
    </svg>
  );
}

export function ProgressOverview() {
  const gid = useId().replace(/:/g, "");
  const { examLabel, examDisplayName, examLabelLoading } =
    useTargetExamDisplay();
  const examTitle = examDisplayName || examLabel || "";
  const tasksRecord = useTaskStore((s) => s.tasks);
  const microRecord = useTaskStore((s) => s.microtopics);
  const today = useCalendarDate();

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

  const syllabusSoon = shouldShowSyllabusComingSoon({
    examLabel,
    examLabelLoading,
    syllabusLoading,
    syllabusError,
    syllabusRowCount: syllabusRows.length,
    cuetAwaitingDomainSelection,
  });

  const todayTasks = useMemo(
    () => filterTasksForDate(Object.values(tasksRecord), today),
    [tasksRecord, today],
  );

  const realityTasks = useMemo(
    () => filterTasksThroughDate(Object.values(tasksRecord), today),
    [tasksRecord, today],
  );

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

  const { secured, denom, marksPercent, topicPercent, doneTopics, totalTopics } =
    useMemo(() => {
      const tasks = Object.values(tasksRecord);
      const microtopics = Object.values(microRecord);
      const microtopicById = microRecord;

      let secured = 0;
      let denom = 720;
      let marksPercent = 0;

      if (!advancedMarksProjectionEnabled && cuetScoringRollup) {
        marksPercent = cuetScoringRollup.overallPercent;
        secured = 0;
        denom = 0;
      } else if (!advancedMarksProjectionEnabled && syllabusRows.length > 0) {
        marksPercent = syllabusRollup.overallPercent;
        secured = 0;
        denom = 0;
      } else if (cuetScoringRollup) {
        marksPercent = cuetScoringRollup.overallPercent;
        secured = cuetScoringRollup.totalProjected;
        denom = cuetScoringRollup.totalMax;
      } else if (syllabusMultiYear) {
        marksPercent = syllabusMultiYear.ringPercent;
        secured = syllabusMultiYear.ringProjected;
        denom = syllabusMultiYear.ringOutOf;
      } else if (syllabusRows.length > 0) {
        marksPercent = syllabusRollup.overallPercent;
        secured = Math.round(syllabusRollup.totalMarksMastered);
        denom = Math.round(syllabusRollup.totalMarksPool);
        if (denom <= 0) {
          secured = 0;
          denom = 720;
          marksPercent = 0;
        }
      } else {
        const { mastered, total } = computeWeightedMarksTotals(
          realityTasks,
          microtopicById,
        );
        secured = Math.round(mastered);
        denom = total > 0 ? Math.round(total) : 720;
        marksPercent = denom > 0 ? (secured / denom) * 100 : 0;
      }

      const { percent, doneTopics, totalTopics } = topicCompletionStats(
        tasks,
        microtopics,
      );
      return {
        secured,
        denom,
        marksPercent,
        topicPercent: percent,
        doneTopics,
        totalTopics,
      };
    }, [
      tasksRecord,
      microRecord,
      advancedMarksProjectionEnabled,
      cuetScoringRollup,
      syllabusMultiYear,
      syllabusRows.length,
      syllabusRollup.overallPercent,
      syllabusRollup.totalMarksMastered,
      syllabusRollup.totalMarksPool,
      realityTasks,
    ]);

  const { todayPct, dailyBand, scopeMessage } = useMemo(() => {
    const todayPct = computeWeightedCompletionPercent(todayTasks, microRecord);
    const dailyBand = classifyDailyProgressBand(todayPct, todayTasks.length);
    const scopeMessage = classifyProgressMessageWithScope(todayTasks, todayPct);
    return { todayPct, dailyBand, scopeMessage };
  }, [todayTasks, microRecord]);

  return (
    <section className="rounded-2xl border border-slate-700 bg-slate-800/40 p-4">
      <h2 className="text-sm font-semibold text-white">Progress command</h2>
      <p className="mt-1 text-xs text-zinc-500">
        {syllabusSoon
          ? `${examTitle || examLabel} syllabus isn’t in Kalnehi yet. Until then, marks follow your plan and linked topics.`
          : "Chapter-level capture (full credit only when every microtopic in a chapter is done) · topic coverage from tasks"}
      </p>
      {syllabusSoon ? (
        <div className="mt-3 rounded-xl border border-emerald-500/20 bg-emerald-950/20 px-3 py-2.5 text-xs leading-relaxed text-emerald-100/90">
          We&apos;re working on full chapter-weight support for{" "}
          {examTitle || examLabel}. Keep
          executing daily — your planner and tasks stay fully usable.
        </div>
      ) : null}
      <div className="mt-4 flex flex-wrap items-start gap-6">
        <Ring percent={marksPercent} gid={`m-${gid}`} />
        <div className="min-w-0 flex-1 space-y-3 text-sm">
          {!advancedMarksProjectionEnabled && cuetScoringRollup ? (
            <p className="text-zinc-300">
              <span className="font-semibold text-emerald-400 tabular-nums">
                {cuetScoringRollup.overallPercent % 1 === 0
                  ? cuetScoringRollup.overallPercent.toFixed(0)
                  : cuetScoringRollup.overallPercent.toFixed(1)}
                %
              </span>
              <span className="text-zinc-500">
                {" "}
                overall syllabus completion (CUET domains)
              </span>
            </p>
          ) : !advancedMarksProjectionEnabled && syllabusRows.length > 0 ? (
            <p className="text-zinc-300">
              <span className="font-semibold text-emerald-400 tabular-nums">
                {syllabusRollup.overallPercent % 1 === 0
                  ? syllabusRollup.overallPercent.toFixed(0)
                  : syllabusRollup.overallPercent.toFixed(1)}
                %
              </span>
              <span className="text-zinc-500"> chapter-level completion</span>
            </p>
          ) : cuetScoringRollup && advancedMarksProjectionEnabled ? (
            <>
              <p className="text-zinc-300">
                <span className="font-semibold text-emerald-400 tabular-nums">
                  {secured}
                </span>
                <span className="text-zinc-500">
                  {" "}
                  / {denom} projected (CUET)
                </span>
              </p>
              {syllabusMultiYear ? (
                <div className="space-y-2 border-t border-slate-700/80 pt-3 text-xs">
                  <p className="font-semibold text-zinc-400">
                    Multi-year (marks columns)
                  </p>
                  <ul className="space-y-2">
                    {syllabusMultiYear.lines.map((line) => (
                      <li
                        key={line.year}
                        className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5"
                      >
                        <span className="font-semibold text-zinc-400">
                          {examTitle || examLabel || "Exam"} {line.year}
                        </span>
                        <span className="tabular-nums text-emerald-400">
                          {line.projectedOutOf720}
                        </span>
                        <span className="text-zinc-500">
                          / {syllabusMultiYear.ringOutOf}
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>
              ) : null}
            </>
          ) : syllabusMultiYear ? (
            <>
              <p className="text-zinc-300">
                <span className="font-semibold text-emerald-400 tabular-nums">
                  {syllabusMultiYear.ringProjected}
                </span>
                <span className="text-zinc-500">
                  {" "}
                  / {syllabusMultiYear.ringOutOf} projected
                </span>
                <span className="text-zinc-600">
                  {" "}
                  ({examTitle || examLabel || "Exam"} {syllabusMultiYear.ringYear}{" "}
                  — primary
                  ring)
                </span>
              </p>
              <ul className="space-y-2 border-t border-slate-700/80 pt-3 text-xs">
                {syllabusMultiYear.lines.map((line) => (
                  <li
                    key={line.year}
                    className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5"
                  >
                    <span className="font-semibold text-zinc-400">
                      {examTitle || examLabel || "Exam"} {line.year}
                    </span>
                    <span className="tabular-nums text-emerald-400">
                      {line.projectedOutOf720}
                    </span>
                    <span className="text-zinc-500">
                      / {syllabusMultiYear.ringOutOf}
                    </span>
                  </li>
                ))}
              </ul>
            </>
          ) : syllabusRows.length > 0 ? (
            <p className="text-zinc-300">
              <span className="font-semibold text-emerald-400 tabular-nums">
                {Math.round(syllabusRollup.totalMarksMastered)}
              </span>
              <span className="text-zinc-500">
                {" "}
                / {Math.round(syllabusRollup.totalMarksPool)} chapter-weight
                pool
              </span>
              <span className="mt-1 block text-xs text-zinc-500">
                Add per-year syllabus weights to see multi-year projections (out
                of {syllabusScoreMax}).
              </span>
            </p>
          ) : (
            <p className="text-zinc-300">
              <span className="font-semibold text-emerald-400 tabular-nums">
                {secured}
              </span>
              <span className="text-zinc-500"> / {denom} plan marks</span>
              <span className="mt-1 block text-xs text-zinc-500">
                {syllabusSoon
                  ? `Chapter-weight capture for ${examTitle || examLabel} is coming soon.`
                  : "Open Syllabus after setting your target exam for chapter-level capture."}
              </span>
            </p>
          )}
          <p className="text-xs text-zinc-500">
            Topics done (tasks): {doneTopics}/{totalTopics} (
            {Math.round(topicPercent)}%)
          </p>
          {cuetScoringRollup && cuetScoringRollup.subjects.length > 0 ? (
            <div className="mt-4 border-t border-slate-700/80 pt-4">
              <p className="text-[10px] font-semibold uppercase tracking-widest text-zinc-500">
                CUET · by domain (200 each)
              </p>
              <ul className="mt-2 space-y-2 text-xs text-zinc-400">
                {cuetScoringRollup.subjects.map((s) => (
                  <li
                    key={s.subject}
                    className="flex flex-wrap items-baseline justify-between gap-2"
                  >
                    <span className="font-medium text-zinc-300">{s.subject}</span>
                    <span className="tabular-nums text-emerald-400/90">
                      {s.completionPercent % 1 === 0
                        ? s.completionPercent.toFixed(0)
                        : s.completionPercent.toFixed(1)}
                      % syllabus
                      {advancedMarksProjectionEnabled ? (
                        <>
                          {" "}
                          → {s.projectedMarks}/{s.maxPerSubject}
                        </>
                      ) : null}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
        </div>
      </div>

      <div className="mt-5 rounded-xl border border-slate-600/80 bg-slate-950/40 px-3 py-3">
        <p className="text-[10px] font-semibold uppercase tracking-widest text-zinc-500">
          Execution feedback (today)
        </p>
        <p className="mt-2 text-sm font-semibold text-white">
          {DAILY_PROGRESS_HEADLINE[dailyBand]}
        </p>
        <p className="mt-1 text-xs text-zinc-400">
          Today&apos;s weighted completion:{" "}
          <span className="tabular-nums text-zinc-200">
            {Math.round(todayPct * 10) / 10}%
          </span>{" "}
          · {PROGRESS_MESSAGE_LABEL[scopeMessage]}
        </p>
      </div>
    </section>
  );
}

"use client";

import { useMemo } from "react";

import { useCalendarDate } from "@/hooks/useCalendarDate";
import { usePrimaryExamLabel } from "@/hooks/usePrimaryExamLabel";
import { useRefreshTasksOnHomeFocus } from "@/hooks/useRefreshTasksOnHomeFocus";
import { useTodayDailyPlanProgress } from "@/hooks/useTodayDailyPlanProgress";
import { useSyllabusTracker } from "@/hooks/useSyllabusTracker";
import { buildFeedbackInsights } from "@/lib/engine/feedbackInsights";
import { shouldShowSyllabusComingSoon } from "@/lib/examProfile";
import {
  isUpscCseMainsExam,
  upscMainsSyllabusUiPercent,
} from "@/lib/upscMainsOptionalSubjects";
import { useTaskStore } from "@/store/useTaskStore";

import { EngineCard, EngineHero } from "./EngineHero";

const TONE: Record<
  "positive" | "neutral" | "urgent",
  string
> = {
  positive: "border-kal-accent/30 bg-kal-accent-soft/30",
  neutral: "border-kal-border bg-kal-card-muted/60",
  urgent: "border-kal-warn-border/60 bg-kal-warn-soft/60",
};

export function FeedbackEngineClient() {
  useRefreshTasksOnHomeFocus();
  const { examLabel, loading: examLoading } = usePrimaryExamLabel();

  const today = useCalendarDate();
  const tasksRecord = useTaskStore((s) => s.tasks);
  const microRecord = useTaskStore((s) => s.microtopics);
  const {
    rollup,
    rows,
    catalogExamKey,
    cuetAwaitingDomainSelection,
    loading: syllabusLoading,
    error: syllabusError,
  } = useSyllabusTracker();
  const dailyPlanToday = useTodayDailyPlanProgress();

  const syllabusSoon = shouldShowSyllabusComingSoon({
    examLabel,
    examLabelLoading: examLoading,
    syllabusLoading,
    syllabusError,
    syllabusRowCount: rows.length,
    cuetAwaitingDomainSelection,
  });

  const insights = useMemo(() => {
    const tasks = Object.values(tasksRecord);
    const syllabusPct =
      rows.length > 0
        ? isUpscCseMainsExam(catalogExamKey)
          ? upscMainsSyllabusUiPercent(rollup.totalMarksMastered)
          : rollup.overallPercent
        : null;
    return buildFeedbackInsights(
      today,
      tasks,
      microRecord,
      syllabusPct,
      dailyPlanToday,
    );
  }, [
    today,
    tasksRecord,
    microRecord,
    rows.length,
    rollup.overallPercent,
    rollup.totalMarksMastered,
    catalogExamKey,
    dailyPlanToday,
  ]);

  return (
    <div className="space-y-6">
      <EngineHero
        eyebrow="Insight"
        title="Performance Feedback"
        description="Sharp commentary on execution, missed load, and syllabus capture — tuned for JEE & NEET momentum, not generic praise."
      />

      <div className="space-y-3">
        {insights.map((ins, i) => (
          <div
            key={`${ins.title}-${i}`}
            className={`rounded-2xl border px-4 py-4 ${TONE[ins.tone]}`}
          >
            <p className="text-xs font-semibold uppercase tracking-wide text-kal-accent/90">
              {ins.title}
            </p>
            <p className="mt-2 text-sm leading-relaxed text-kal-text-secondary">
              {ins.body}
            </p>
          </div>
        ))}
      </div>

      <EngineCard title="How this works">
        <p className="text-sm text-kal-muted">
          We combine today&apos;s weighted completion, your syllabus progress
          snapshot, and missed backlog — then translate into rank-aware language.
          Execute daily for sharper, more personal signals.
          {syllabusSoon
            ? ` Exam-specific chapter capture for ${examLabel} is coming soon; insights lean on execution and plan load until then.`
            : null}
        </p>
      </EngineCard>
    </div>
  );
}

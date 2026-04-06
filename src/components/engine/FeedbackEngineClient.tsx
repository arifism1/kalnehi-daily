"use client";

import { useMemo } from "react";

import { useCalendarDate } from "@/hooks/useCalendarDate";
import { usePrimaryExamLabel } from "@/hooks/usePrimaryExamLabel";
import { useRefreshTasksOnHomeFocus } from "@/hooks/useRefreshTasksOnHomeFocus";
import { useSyllabusTracker } from "@/hooks/useSyllabusTracker";
import { buildFeedbackInsights } from "@/lib/engine/feedbackInsights";
import { shouldShowSyllabusComingSoon } from "@/lib/examProfile";
import { useTaskStore } from "@/store/useTaskStore";

import { EngineCard, EngineHero } from "./EngineHero";

const TONE: Record<
  "positive" | "neutral" | "urgent",
  string
> = {
  positive: "border-emerald-500/30 bg-emerald-950/25",
  neutral: "border-slate-700 bg-slate-950/40",
  urgent: "border-amber-500/35 bg-amber-950/20",
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
    cuetAwaitingDomainSelection,
    loading: syllabusLoading,
    error: syllabusError,
  } = useSyllabusTracker();

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
      rows.length > 0 ? rollup.overallPercent : null;
    return buildFeedbackInsights(today, tasks, microRecord, syllabusPct);
  }, [today, tasksRecord, microRecord, rows.length, rollup.overallPercent]);

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
            <p className="text-xs font-semibold uppercase tracking-wide text-emerald-400/90">
              {ins.title}
            </p>
            <p className="mt-2 text-sm leading-relaxed text-zinc-200">
              {ins.body}
            </p>
          </div>
        ))}
      </div>

      <EngineCard title="How this works">
        <p className="text-sm text-zinc-500">
          We combine today&apos;s weighted completion, your syllabus mastery
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

"use client";

import clsx from "clsx";
import {
  BookMarked,
  ChevronDown,
  Layers,
  Lock,
  Pencil,
  Plus,
  SlidersHorizontal,
  Sparkles,
  Trash2,
} from "lucide-react";
import { useCallback, useMemo, useState } from "react";

import { deleteCustomSyllabusItem } from "@/actions/syllabus";
import { ChapterMarksSheet } from "@/components/syllabus/ChapterMarksSheet";
import { SyllabusComingSoon } from "@/components/syllabus/SyllabusComingSoon";
import {
  SyllabusCustomizeSheet,
  type SyllabusCustomizeSheetMode,
} from "@/components/syllabus/SyllabusCustomizeSheet";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { TransientNotice } from "@/components/ui/TransientNotice";
import {
  MICROTOPIC_STATUSES,
  STATUS_LABEL,
  type MicrotopicProgressStatus,
} from "@/lib/syllabusConstants";
import { normalizeSyllabusMasterId } from "@/lib/syllabusIds";
import {
  chapterKey,
  groupBySubjectAndChapter,
  sortChapterNameList,
  sortSubjects,
} from "@/lib/syllabusGrouping";
import {
  syllabusHasCatalogMarksData,
  type ChapterRollup,
} from "@/lib/syllabusRollup";
import { useExamsCatalogRows } from "@/hooks/useExamsCatalogRows";
import { useFeatureAccess } from "@/hooks/useFeatureAccess";
import { usePrimaryExamLabel } from "@/hooks/usePrimaryExamLabel";
import { useSyllabusTracker } from "@/hooks/useSyllabusTracker";
import { displayNameForExamCatalog } from "@/lib/examsCatalog";
import {
  shouldShowSyllabusComingSoon,
} from "@/lib/examProfile";
import {
  isUpscCseMainsExam,
  isUpscMainsQualifyingPaperSubject,
  UPSC_CSE_MAINS_UI_TOTAL_MARKS,
  upscMainsSyllabusUiPercent,
} from "@/lib/upscMainsOptionalSubjects";
import type { MergedSyllabusRow } from "@/lib/userSyllabusMerge";
import { useUndoStore } from "@/store/useUndoStore";

function statusSelectClasses(status: MicrotopicProgressStatus): string {
  switch (status) {
    case "not_begun":
      return "border-kal-border bg-kal-card-muted text-kal-text";
    case "in_progress":
      return "border-blue-200 bg-blue-50 text-blue-900 dark:border-blue-500/60 dark:bg-blue-950/50 dark:text-blue-100";
    case "completed":
      return "border-orange-200 bg-orange-50 text-orange-900 dark:border-orange-500/70 dark:bg-orange-950/45 dark:text-orange-100";
    case "need_revision":
      return "border-amber-200 bg-amber-50 text-amber-900 dark:border-amber-500/60 dark:bg-amber-950/40 dark:text-amber-100";
    default:
      return "border-kal-border bg-kal-card-muted text-kal-text";
  }
}

function resolveStatus(
  id: string,
  map: Record<string, string>,
): MicrotopicProgressStatus {
  const s = map[normalizeSyllabusMasterId(id)];
  if (
    s === "not_begun" ||
    s === "in_progress" ||
    s === "completed" ||
    s === "need_revision"
  ) {
    return s;
  }
  return "not_begun";
}

function ChapterBar({
  percent,
  size = "chapter",
  progressAriaLabel,
}: {
  percent: number;
  size?: "chapter" | "subject";
  progressAriaLabel?: string;
}) {
  const w = Math.min(100, Math.max(0, percent));
  const a11yProps =
    progressAriaLabel != null
      ? {
          role: "progressbar" as const,
          "aria-valuenow": Math.round(w),
          "aria-valuemin": 0,
          "aria-valuemax": 100,
          "aria-label": progressAriaLabel,
        }
      : {};

  return (
    <div
      {...a11yProps}
      className={clsx(
        "w-full overflow-hidden rounded-full bg-kal-card-muted",
        size === "chapter" ? "mt-2 h-2" : "h-1.5",
      )}
    >
      <div
        className="h-full rounded-full bg-gradient-to-r from-kal-accent to-orange-600 transition-[width] duration-300"
        style={{ width: `${w}%` }}
        aria-hidden={progressAriaLabel != null ? true : undefined}
      />
    </div>
  );
}

function ChapterToggle({
  checked,
  disabled,
  onChange,
}: {
  checked: boolean;
  disabled?: boolean;
  onChange: (next: boolean) => void;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      disabled={disabled}
      onClick={(e) => {
        e.stopPropagation();
        onChange(!checked);
      }}
      className={clsx(
        "relative inline-flex h-8 w-14 shrink-0 items-center rounded-full border-2 transition-colors duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-kal-accent/50 focus-visible:ring-offset-2 focus-visible:ring-offset-kal-card",
        checked
          ? "border-kal-accent bg-kal-accent"
          : "border-kal-border bg-kal-card-muted",
        disabled && "cursor-not-allowed opacity-50",
      )}
    >
      <span
        className={clsx(
          "pointer-events-none inline-block h-[1.35rem] w-[1.35rem] rounded-full bg-kal-input-bg shadow-sm transition-transform duration-200",
          checked ? "translate-x-[1.55rem]" : "translate-x-0.5",
        )}
      />
    </button>
  );
}

export function SyllabusTracker() {
  const { limited: syllabusLimited } = useFeatureAccess("syllabus");
  const { examLabel, loading: examLoading } = usePrimaryExamLabel();
  const { rows: examCatalogRows } = useExamsCatalogRows();

  const {
    rows,
    catalogExamKey,
    statusBySyllabusMasterId,
    targetExamLabel,
    maxScore,
    cuetAwaitingDomainSelection,
    loading,
    error,
    updateError,
    clearUpdateError,
    saveFeedback,
    rollup,
    neetYearProjections,
    primaryMarksYear,
    cuetScoringRollup,
    refetch,
    setMicrotopicStatus,
    undoMicrotopicToStatus,
    setChapterCompleted,
  } = useSyllabusTracker();

  const [sheetOpen, setSheetOpen] = useState(false);
  const [sheetMode, setSheetMode] = useState<SyllabusCustomizeSheetMode | null>(
    null,
  );
  const [confirmState, setConfirmState] = useState<{
    title: string;
    description: string;
    run: () => Promise<void>;
  } | null>(null);
  const [confirmBusy, setConfirmBusy] = useState(false);
  const [marksSheetChapter, setMarksSheetChapter] = useState<{
    subject: string;
    chapter: string;
    rows: MergedSyllabusRow[];
  } | null>(null);
  const [showAllYears, setShowAllYears] = useState(false);

  const openSheet = useCallback((mode: SyllabusCustomizeSheetMode) => {
    setSheetMode(mode);
    setSheetOpen(true);
  }, []);

  const closeSheet = useCallback(() => {
    setSheetOpen(false);
    setSheetMode(null);
  }, []);

  const canCustomize = Boolean(catalogExamKey);

  const activeExamName = targetExamLabel ?? examLabel;
  const displayExam = useMemo(
    () =>
      displayNameForExamCatalog(activeExamName, examCatalogRows) || "Your exam",
    [activeExamName, examCatalogRows],
  );
  const grouped = useMemo(() => groupBySubjectAndChapter(rows), [rows]);
  const subjects = useMemo(
    () => [...grouped.keys()].sort(sortSubjects),
    [grouped],
  );

  const chapterRollupMap = useMemo(() => {
    const m = new Map<string, ChapterRollup>();
    for (const c of rollup.chapters) {
      m.set(chapterKey(c.subject, c.chapter), c);
    }
    return m;
  }, [rollup.chapters]);

  /** Sum chapter rollups per subject — same microtopic ratio as chapter rows. */
  const subjectMicrotopicMap = useMemo(() => {
    const accum = new Map<string, { completed: number; total: number }>();
    for (const ch of rollup.chapters) {
      const prev = accum.get(ch.subject) ?? { completed: 0, total: 0 };
      accum.set(ch.subject, {
        completed: prev.completed + ch.completedCount,
        total: prev.total + ch.totalCount,
      });
    }
    const out = new Map<
      string,
      { completed: number; total: number; percent: number }
    >();
    for (const [subject, { completed, total }] of accum) {
      const percent =
        total > 0 ? Math.round((completed / total) * 1000) / 10 : 0;
      out.set(subject, { completed, total, percent });
    }
    return out;
  }, [rollup.chapters]);

  /** CUET uses domain scoring; other exams need real marks_* (or overrides), not legacy 1× fallbacks. */
  const showMarksUi = Boolean(cuetScoringRollup) || syllabusHasCatalogMarksData(rows);

  /**
   * UPSC CSE Mains total = 2350 (1750 merit + 600 qualifying). Qualifying marks are included.
   * Headline % and “marks secured” denominator use the fixed 2350 scale; numerator stays
   * `rollup.totalMarksMastered` from the syllabus model (chapter all-or-nothing).
   */
  const isUpscMainsUi = isUpscCseMainsExam(catalogExamKey);
  const syllabusHeaderPercent = useMemo(() => {
    if (cuetScoringRollup) return cuetScoringRollup.overallPercent;
    if (isUpscMainsUi && showMarksUi) {
      return upscMainsSyllabusUiPercent(rollup.totalMarksMastered);
    }
    return rollup.overallPercent;
  }, [
    cuetScoringRollup,
    isUpscMainsUi,
    showMarksUi,
    rollup.totalMarksMastered,
    rollup.overallPercent,
  ]);

  const comingSoon = shouldShowSyllabusComingSoon({
    examLabel,
    examLabelLoading: examLoading,
    syllabusLoading: loading,
    syllabusError: error,
    syllabusRowCount: rows.length,
    cuetAwaitingDomainSelection,
  });

  if (comingSoon && examLabel) {
    return <SyllabusComingSoon examLabel={displayExam} />;
  }

  if (!loading && !error && cuetAwaitingDomainSelection) {
    return (
      <div className="mx-auto max-w-lg rounded-2xl border border-kal-warn-border bg-kal-warn-soft px-6 py-8 text-center dark:border-amber-500/25 dark:bg-amber-950/20">
        <BookMarked className="mx-auto h-10 w-10 text-kal-warn-text dark:text-amber-400/90" aria-hidden />
        <h2 className="mt-4 text-lg font-semibold text-kal-text">
          Choose your CUET domain subjects
        </h2>
        <p className="mt-2 text-sm leading-relaxed text-kal-muted">
          Please select your domain subjects in Profile to see the CUET syllabus
          for your papers.
        </p>
        <p className="mt-4 text-xs text-kal-muted">
          Profile → Target exam{" "}
          <strong className="text-kal-text">CUET UG</strong> → CUET domain subjects.
        </p>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center">
        <div className="h-10 w-10 animate-spin rounded-full border-2 border-kal-accent border-t-transparent" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-3">
        <div className="flex flex-col gap-2 rounded-xl border border-kal-border bg-kal-card-muted px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-xs leading-relaxed text-kal-muted">{error}</p>
          <button
            type="button"
            onClick={() => void refetch()}
            className="shrink-0 rounded-lg bg-kal-accent px-3 py-2 text-xs font-semibold text-kal-accent-foreground hover:bg-kal-accent-hover"
          >
            Try again
          </button>
        </div>
      </div>
    );
  }

  if (rows.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-kal-border bg-kal-card-muted/50 px-6 py-12 text-center">
        <Sparkles className="mx-auto mb-3 h-10 w-10 text-kal-accent" />
        <p className="text-sm leading-relaxed text-kal-muted">
          {examLabel
            ? "We couldn’t load syllabus rows for your exam yet. Check your connection, or confirm your target exam in Profile matches the catalog."
            : "Set your target exam in Profile, then open online once — we’ll map every chapter and microtopic for you."}
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-4">
      <header>
        <p className="text-[0.65rem] font-semibold uppercase tracking-widest text-kal-accent">
          {displayExam} syllabus
        </p>
        <h1 className="mt-1 text-2xl font-bold tracking-tight text-kal-text">
          Syllabus Mastery Tracker
        </h1>
        <p className="mt-1 text-sm leading-relaxed text-kal-muted">
          {cuetScoringRollup
            ? "CUET: mark off microtopics as you go — each domain scores up to 200 marks from your completion rate."
            : showMarksUi
              ? "Conquer chapters the right way: full chapter weight unlocks only when every microtopic in that chapter is complete."
              : "Track your syllabus by chapter and microtopic — completion % reflects chapters you fully finish."}
        </p>
        {showMarksUi && !cuetScoringRollup ? (
          <details
            className="kal-glass-subtle group mt-4 rounded-xl border-kal-border/60 shadow-sm open:bg-kal-card-muted/45"
            aria-label="Important marks and weightage disclaimer"
          >
            <summary className="flex cursor-pointer list-none items-center justify-between gap-3 rounded-xl px-4 py-3 text-left text-sm font-medium text-kal-text outline-none transition-colors hover:bg-kal-card-muted marker:hidden [&::-webkit-details-marker]:hidden focus-visible:ring-2 focus-visible:ring-kal-accent/40 focus-visible:ring-offset-2 focus-visible:ring-offset-kal-card">
              <span>Important marks/weightage disclaimer</span>
              <ChevronDown
                aria-hidden
                className="h-4 w-4 shrink-0 text-kal-accent transition-transform duration-200 group-open:rotate-180"
              />
            </summary>
            <div className="border-t border-kal-border/50 px-4 pb-4 pt-3 text-[13px] leading-relaxed text-kal-muted">
              Chapter marks are gathered from public sources and patterns seen in
              previous years — a study aid, not an official mark scheme. You can
              edit chapter marks anytime so they match how you prepare. When an
              exam does not publish a clear chapter-wise split, we use careful
              averages or estimates so you still get a fair picture. Totals may
              not line up exactly with the exam&apos;s full marks (rounding and
              gaps happen), but they are built to be largely accurate and helpful
              for planning your time.
            </div>
          </details>
        ) : null}
      </header>

      <section className="kal-glass-panel overflow-hidden rounded-2xl border-kal-accent/35 p-6 shadow-lg">
        <div className="flex flex-wrap items-end justify-between gap-6">
          <div>
            <p className="text-xs font-medium uppercase tracking-wide text-kal-accent">
              {cuetScoringRollup ? "Overall CUET progress" : "Syllabus mastery"}
            </p>
            {!cuetScoringRollup && !showMarksUi ? (
              <p className="mt-1 text-[13px] font-medium leading-snug text-kal-muted">
                Track your completion %
              </p>
            ) : null}
            <p
              className="mt-1 text-4xl font-bold tabular-nums text-kal-text"
              aria-live="polite"
            >
              {syllabusHeaderPercent}%
            </p>
            <p className="mt-1 text-[11px] text-kal-muted">
              {cuetScoringRollup
                ? "Microtopic completion across selected domains"
                : showMarksUi
                  ? isUpscMainsUi
                    ? `Full Mains written scale (${UPSC_CSE_MAINS_UI_TOTAL_MARKS} max, marks_${primaryMarksYear} weights)`
                    : `Overall marks_${primaryMarksYear} chapter pool`
                  : `Overall progress: ${rollup.overallPercent % 1 === 0 ? rollup.overallPercent.toFixed(0) : rollup.overallPercent.toFixed(1)}%`}
            </p>
          </div>
          <div className="flex flex-col gap-3 text-right sm:min-w-[12rem]">
            {cuetScoringRollup ? (
              <div>
                <p className="text-xs text-kal-muted">Projected total</p>
                <p className="text-lg font-semibold tabular-nums text-orange-600 dark:text-orange-300">
                  {cuetScoringRollup.totalProjected}
                  <span className="text-kal-muted">
                    {" "}
                    / {cuetScoringRollup.totalMax}
                  </span>
                </p>
                <ul className="mt-2 space-y-1 text-left text-[10px] text-kal-muted sm:text-right">
                  {cuetScoringRollup.subjects.map((s) => (
                    <li key={s.subject}>
                      <span className="text-kal-muted">{s.subject}</span>{" "}
                      <span className="tabular-nums text-kal-accent">
                        {s.projectedMarks}/{s.maxPerSubject}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            ) : showMarksUi && neetYearProjections.length > 0 ? (
              <>
                {(showAllYears ? neetYearProjections : neetYearProjections.slice(0, 1)).map((p) => (
                  <div key={p.year}>
                    <p className="text-[10px] font-semibold uppercase text-kal-muted">
                      {displayExam} {p.year}
                    </p>
                    <p className="mt-0.5 text-xl font-bold tabular-nums" style={{ color: "#BA7517" }}>
                      {isUpscMainsUi
                        ? rollup.totalMarksMastered.toFixed(0)
                        : p.projectedOutOf720}
                      <span className="text-base font-semibold text-kal-muted">
                        {" "}
                        /{" "}
                        {isUpscMainsUi
                          ? UPSC_CSE_MAINS_UI_TOTAL_MARKS
                          : maxScore}
                      </span>
                    </p>
                    <p className="mt-0.5 text-[10px] leading-snug text-kal-muted">
                      Based on {p.year} pattern
                    </p>
                  </div>
                ))}
                {neetYearProjections.length > 1 && !showAllYears && (
                  <button
                    type="button"
                    onClick={() => setShowAllYears(true)}
                    className="mt-1 text-[11px] font-medium"
                    style={{ color: "#BA7517" }}
                  >
                    See all years ↓
                  </button>
                )}
              </>
            ) : showMarksUi ? (
              <div>
                <p className="text-xs text-kal-muted">Marks secured</p>
                <p className="text-lg font-semibold tabular-nums text-orange-600 dark:text-orange-300">
                  {rollup.totalMarksMastered.toFixed(0)}
                  <span className="text-kal-muted">
                    {" "}
                    /{" "}
                    {isUpscMainsUi
                      ? UPSC_CSE_MAINS_UI_TOTAL_MARKS
                      : rollup.totalMarksPool.toFixed(0)}
                  </span>
                </p>
              </div>
            ) : (
              <div className="text-left sm:text-right">
                <p className="text-xs text-kal-muted">Snapshot</p>
                <p className="mt-0.5 text-sm text-kal-muted">
                  Weighted projections appear when chapter marks are set for this
                  exam.
                </p>
              </div>
            )}
          </div>
        </div>
        <div className="mt-4 h-2.5 w-full overflow-hidden rounded-full bg-kal-card-muted">
          <div
            className="h-full rounded-full bg-gradient-to-r from-kal-accent via-orange-600 to-orange-700 transition-[width] duration-500"
            style={{
              width: `${Math.min(100, syllabusHeaderPercent)}%`,
            }}
          />
        </div>
      </section>

      <TransientNotice
        message={updateError}
        onDismiss={clearUpdateError}
        variant="amber"
      />

      {saveFeedback && (
        <p
          role="status"
          aria-live="polite"
          className="rounded-xl border border-kal-accent/35 bg-orange-950/35 px-3 py-2 text-sm font-medium text-orange-200"
        >
          {saveFeedback}
        </p>
      )}

      {syllabusLimited && (
        <div className="rounded-xl border border-amber-200 bg-kal-warn-soft px-4 py-3 text-center backdrop-blur-sm dark:border-amber-800">
          <p className="text-sm text-amber-800 dark:text-amber-200">
            Limited view: subjects &amp; chapters only.{" "}
            <a href="/pricing" className="font-semibold underline">
              Upgrade to Pro
            </a>{" "}
            for microtopics &amp; predictions.
          </p>
        </div>
      )}

      <div className="space-y-4">
        {subjects.map((subject) => {
          const chapters = grouped.get(subject)!;
          const chapterNames = sortChapterNameList([...chapters.keys()]);
          const subRoll =
            subjectMicrotopicMap.get(subject) ?? {
              completed: 0,
              total: 0,
              percent: 0,
            };
          return (
            <details
              key={subject}
              className="kal-glass-panel group overflow-hidden rounded-2xl open:shadow-md dark:border-white/12"
            >
              <summary className="cursor-pointer list-none px-5 py-4 text-base font-semibold text-kal-text marker:hidden [&::-webkit-details-marker]:hidden">
                <div className="flex min-h-[48px] items-center justify-between gap-2">
                  <span className="flex min-w-0 items-center gap-2">
                    <BookMarked
                      className="h-5 w-5 shrink-0 text-kal-accent"
                      aria-hidden
                    />
                    <span className="truncate">{subject}</span>
                    {isUpscCseMainsExam(catalogExamKey) &&
                    isUpscMainsQualifyingPaperSubject(subject) ? (
                      <span
                        className="inline-flex max-w-[min(100%,11rem)] shrink-0 rounded-md border border-kal-border/80 bg-kal-card-muted px-1.5 py-0.5 text-[9px] font-medium leading-tight text-kal-muted sm:max-w-none sm:px-2 sm:text-[10px]"
                        title="Qualifying papers (300+300 marks) are part of the full Mains total (2350) and this progress bar."
                      >
                        Qualifying · in total
                      </span>
                    ) : null}
                  </span>
                  <span className="flex shrink-0 items-center gap-1.5">
                    {canCustomize && catalogExamKey ? (
                      <button
                        type="button"
                        title="Add chapter"
                        className="inline-flex h-9 min-w-[2.25rem] items-center justify-center rounded-lg border border-kal-accent/30 bg-orange-950/40 text-kal-accent hover:bg-orange-900/50 sm:px-2"
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          openSheet({
                            kind: "add_chapter_block",
                            examName: catalogExamKey,
                            defaultSubject: subject,
                          });
                        }}
                      >
                        <Plus className="h-4 w-4" aria-hidden />
                        <span className="sr-only sm:not-sr-only sm:ml-1 sm:text-[11px] sm:font-semibold">
                          Chapter
                        </span>
                      </button>
                    ) : null}
                    <ChevronDown className="h-5 w-5 shrink-0 text-kal-muted transition-transform duration-200 group-open:rotate-180" />
                  </span>
                </div>
                <p
                  className="mt-2 text-[11px] tabular-nums text-kal-muted"
                  aria-hidden
                >
                  {subRoll.completed}/{subRoll.total} microtopics done ·{" "}
                  {subRoll.percent}%
                </p>
                <ChapterBar
                  size="subject"
                  percent={subRoll.percent}
                  progressAriaLabel={`${subject}: ${subRoll.completed} of ${subRoll.total} microtopics complete, ${subRoll.percent} percent`}
                />
              </summary>
              <div className="border-t border-kal-border">
                {chapterNames.map((chapter, chapterIdx) => {
                  const chapterNumber = chapterIdx + 1;
                  const list = chapters.get(chapter)!;
                  const firstRow = list[0] as MergedSyllabusRow;
                  const originSubject =
                    firstRow.originSubject ?? firstRow.subject;
                  const originChapter =
                    firstRow.originChapter ?? firstRow.chapter;
                  const cr = chapterRollupMap.get(chapterKey(subject, chapter));
                  const pct = cr?.microtopicProgressPercent ?? 0;
                  const marksLine =
                    showMarksUi && cr != null
                      ? `${cr.chapterMarksAwarded.toFixed(0)} / ${cr.chapterMarksTotal.toFixed(0)} chapter marks`
                      : null;
                  return (
                    <details
                      key={chapter}
                      className="group/ch mb-5 border-b border-kal-border pb-5 last:mb-0 last:border-b-0 last:pb-0"
                      onToggle={syllabusLimited ? (e) => { (e.currentTarget as HTMLDetailsElement).open = false; } : undefined}
                    >
                      <summary className="kal-glass-card cursor-pointer list-none rounded-xl border border-kal-border/90 px-0 py-0 shadow-sm marker:hidden ring-1 ring-black/[0.03] dark:ring-white/[0.04] [&::-webkit-details-marker]:hidden">
                        <div className="flex flex-col gap-3.5 border-l-[4px] border-l-kal-accent py-4 pl-4 pr-3 sm:py-5 sm:pl-5 sm:pr-4">
                          <div className="flex items-start justify-between gap-3">
                            <span className="flex min-w-0 items-start gap-2.5">
                              <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-kal-card shadow-sm ring-1 ring-kal-border/50">
                                <Layers
                                  className="h-[1.15rem] w-[1.15rem] text-kal-accent"
                                  aria-hidden
                                />
                              </span>
                              <span className="min-w-0 pt-0.5">
                                <span className="block text-[0.65rem] font-semibold uppercase tracking-[0.14em] text-kal-accent">
                                  Chapter
                                </span>
                                <span className="mt-1 flex min-w-0 items-baseline gap-2.5 sm:gap-3">
                                  <span className="shrink-0 border-r border-kal-border/55 pr-2.5 text-xl font-bold tabular-nums leading-none tracking-tight text-kal-text sm:pr-3 sm:text-2xl">
                                    {chapterNumber}.
                                  </span>
                                  <span className="min-w-0 flex-1 truncate text-base font-bold leading-snug tracking-tight text-kal-text sm:text-lg">
                                    {chapter}
                                  </span>
                                </span>
                              </span>
                            </span>
                            {syllabusLimited ? (
                            <span
                              className="inline-flex shrink-0 items-center gap-1 rounded-full border border-amber-300 bg-amber-50 px-2 py-0.5 text-[10px] font-semibold text-amber-800 dark:border-amber-700 dark:bg-amber-950/40 dark:text-amber-300"
                              title="Upgrade to Pro to expand chapters and see microtopics"
                            >
                              <Lock className="h-2.5 w-2.5" aria-hidden />
                              Pro
                            </span>
                          ) : (
                            <ChevronDown className="mt-1 h-5 w-5 shrink-0 text-kal-muted transition-transform group-open/ch:rotate-180" />
                          )}
                          </div>

                          <p className="pl-[2.875rem] text-[11px] tabular-nums text-kal-muted sm:pl-[3.125rem]">
                            {cr?.completedCount ?? 0}/{cr?.totalCount ?? list.length}{" "}
                            microtopics done · {pct}%
                          </p>
                          <div className="pl-[2.875rem] sm:pl-[3.125rem]">
                            <ChapterBar percent={pct} />
                          </div>
                          <p
                            className={clsx(
                              "pl-[2.875rem] text-[11px] font-medium tabular-nums sm:pl-[3.125rem]",
                              cr?.isChapterMastered
                                ? "text-kal-accent"
                                : "text-amber-900 dark:text-amber-200/90",
                            )}
                          >
                            {showMarksUi && marksLine ? (
                              <>
                                {marksLine}
                                {cr?.isChapterMastered
                                  ? " · chapter mastered"
                                  : " · complete all for chapter weight"}
                              </>
                            ) : (
                              <>
                                {pct}% done
                                {cr?.isChapterMastered
                                  ? " · chapter complete"
                                  : " · finish all to complete"}
                              </>
                            )}
                          </p>

                          <div className="flex flex-nowrap items-center gap-2 overflow-hidden border-t border-kal-border/50 pt-3.5">
                            {canCustomize && catalogExamKey ? (
                              <>
                                <button
                                  type="button"
                                  title="Add microtopic here"
                                  className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-kal-accent/30 text-kal-accent hover:bg-kal-accent-soft dark:border-orange-500/25 dark:text-orange-400 dark:hover:bg-orange-950/50"
                                  onClick={(e) => {
                                    e.preventDefault();
                                    e.stopPropagation();
                                    openSheet({
                                      kind: "add_microtopic",
                                      examName: catalogExamKey,
                                      defaultSubject: subject,
                                      defaultChapter: chapter,
                                    });
                                  }}
                                >
                                  <Plus className="h-4 w-4" aria-hidden />
                                </button>
                                <button
                                  type="button"
                                  title="Rename chapter"
                                  className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-kal-border text-kal-muted hover:bg-kal-card-muted"
                                  onClick={(e) => {
                                    e.preventDefault();
                                    e.stopPropagation();
                                    openSheet({
                                      kind: "rename_chapter",
                                      examName: catalogExamKey,
                                      subject: originSubject,
                                      chapterOld: originChapter,
                                      chapterCurrentLabel: chapter,
                                    });
                                  }}
                                >
                                  <Pencil className="h-4 w-4" aria-hidden />
                                </button>
                                <button
                                  type="button"
                                  title="Hide chapter (for you)"
                                  className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-orange-500/25 text-orange-400/90 hover:bg-orange-950/30"
                                  onClick={(e) => {
                                    e.preventDefault();
                                    e.stopPropagation();
                                    setConfirmState({
                                      title: "Hide this chapter?",
                                      description:
                                        "This removes every microtopic in the chapter from your syllabus only. The shared catalog does not change.",
                                      run: async () => {
                                        const res =
                                          await deleteCustomSyllabusItem({
                                            examName: catalogExamKey,
                                            mode: "chapter",
                                            originSubject,
                                            originChapter,
                                          });
                                        if (!res.ok) throw new Error(res.error);
                                      },
                                    });
                                  }}
                                >
                                  <Trash2 className="h-4 w-4" aria-hidden />
                                </button>
                              </>
                            ) : null}
                            <div className="ml-auto flex w-40 shrink-0 items-center gap-2">
                              <ChapterToggle
                                checked={cr?.isChapterMastered ?? false}
                                onChange={(on) =>
                                  void setChapterCompleted(
                                    list.map((r) => r.id),
                                    on,
                                  )
                                }
                              />
                              <span className="min-w-0 truncate text-xs font-medium text-kal-muted" aria-label={cr?.isChapterMastered ? "Completed" : "Mark chapter as complete"}>
                                {cr?.isChapterMastered
                                  ? "Completed"
                                  : "Mark complete"}
                              </span>
                            </div>
                            {catalogExamKey ? (
                              <button
                                type="button"
                                title="Chapter marks (your weights)"
                                className="inline-flex h-9 min-w-[2.5rem] shrink-0 items-center justify-center gap-1 rounded-lg border border-amber-500/40 bg-amber-950/25 px-2 text-[11px] font-semibold text-amber-100/95 shadow-sm shadow-amber-950/20 hover:bg-amber-950/45 sm:px-3"
                                onClick={(e) => {
                                  e.preventDefault();
                                  e.stopPropagation();
                                  setMarksSheetChapter({
                                    subject,
                                    chapter,
                                    rows: list as MergedSyllabusRow[],
                                  });
                                }}
                              >
                                <SlidersHorizontal
                                  className="h-4 w-4 shrink-0"
                                  aria-hidden
                                />
                                <span className="hidden sm:inline">Marks</span>
                              </button>
                            ) : null}
                          </div>
                        </div>
                      </summary>
                        <ul className="kal-glass-subtle mt-3 space-y-0 rounded-xl border border-kal-border/60 py-1 pl-2 pr-1 shadow-inner sm:mt-4 sm:pl-3 sm:pr-2">
                        {list.map((row, rowIdx) => {
                          const mr = row as MergedSyllabusRow;
                          const st = resolveStatus(
                            row.id,
                            statusBySyllabusMasterId,
                          );
                          const sid = normalizeSyllabusMasterId(row.id);
                          const est =
                            row.estimated_minutes != null &&
                            row.estimated_minutes > 0
                              ? `${row.estimated_minutes} min`
                              : "—";
                          return (
                            <li
                              key={row.id}
                              className={clsx(
                                "border-l-2 border-kal-accent/20 py-2 pl-3 pr-2 sm:pl-4 sm:pr-3 dark:border-orange-500/15",
                                rowIdx > 0 &&
                                  "mt-0 border-t border-kal-border/40 pt-3",
                              )}
                            >
                              <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between sm:gap-4">
                                <div className="min-w-0 flex-1">
                                  <div className="flex items-start gap-2.5">
                                    <span
                                      className="mt-[0.45rem] h-1 w-1 shrink-0 rounded-full bg-kal-muted/45 ring-1 ring-kal-border/30"
                                      aria-hidden
                                    />
                                    <div className="min-w-0 flex-1 space-y-1.5">
                                      <div className="flex flex-wrap items-center gap-2">
                                        <p className="text-[13px] font-medium leading-snug text-kal-text-secondary sm:text-sm">
                                          {row.microtopic}
                                        </p>
                                        {mr.userSyllabus?.isUserAdded ? (
                                          <span className="rounded bg-violet-500/20 px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wide text-violet-200/95">
                                            Yours
                                          </span>
                                        ) : null}
                                        {mr.userSyllabus?.isDisplayEdited ? (
                                          <span className="rounded bg-amber-500/15 px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wide text-amber-900 dark:text-amber-200/95">
                                            Customized
                                          </span>
                                        ) : null}
                                      </div>
                                      <p className="text-[11px] leading-snug text-kal-muted">
                                        Est.{" "}
                                        <span className="font-medium tabular-nums text-kal-text-secondary/90">
                                          {est}
                                        </span>
                                      </p>
                                    </div>
                                  </div>
                                  {canCustomize && catalogExamKey ? (
                                    <div className="mt-2.5 flex items-center gap-1.5 pl-3.5 sm:pl-4">
                                      <button
                                        type="button"
                                        title="Edit microtopic"
                                        aria-label="Edit microtopic"
                                        className="flex h-7 w-7 items-center justify-center rounded-lg border border-transparent text-kal-muted/80 transition-colors hover:border-kal-border hover:text-[#BA7517] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-kal-accent/40"
                                        onClick={() => {
                                          if (mr.userSyllabus?.isUserAdded) {
                                            openSheet({
                                              kind: "edit_user_microtopic",
                                              examName: catalogExamKey,
                                              customizationId:
                                                mr.userSyllabus
                                                  .customizationId!,
                                              subject: row.subject,
                                              chapter: row.chapter,
                                              microtopic: row.microtopic,
                                            });
                                          } else {
                                            openSheet({
                                              kind: "edit_global_microtopic",
                                              examName: catalogExamKey,
                                              syllabusMasterId: row.id,
                                              subject: row.subject,
                                              chapter: row.chapter,
                                              microtopic: row.microtopic,
                                            });
                                          }
                                        }}
                                      >
                                        <Pencil className="h-3.5 w-3.5" aria-hidden />
                                      </button>
                                      <button
                                        type="button"
                                        title="Remove microtopic"
                                        aria-label="Remove microtopic"
                                        className="flex h-7 w-7 items-center justify-center rounded-lg border border-transparent text-kal-muted/80 transition-colors hover:border-red-200 hover:text-[#E24B4A] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-400/40"
                                        onClick={() => {
                                          setConfirmState({
                                            title: mr.userSyllabus?.isUserAdded
                                              ? "Remove this microtopic?"
                                              : "Hide this microtopic?",
                                            description: mr.userSyllabus
                                              ?.isUserAdded
                                              ? "Removes your added topic from your syllabus."
                                              : "Hides this catalog topic for you only.",
                                            run: async () => {
                                              if (
                                                mr.userSyllabus?.isUserAdded &&
                                                mr.userSyllabus.customizationId
                                              ) {
                                                const res =
                                                  await deleteCustomSyllabusItem(
                                                    {
                                                      examName: catalogExamKey,
                                                      mode: "user_add",
                                                      customizationId:
                                                        mr.userSyllabus
                                                          .customizationId,
                                                    },
                                                  );
                                                if (!res.ok)
                                                  throw new Error(res.error);
                                              } else {
                                                const res =
                                                  await deleteCustomSyllabusItem(
                                                    {
                                                      examName: catalogExamKey,
                                                      mode: "global_microtopic",
                                                      syllabusMasterId: row.id,
                                                    },
                                                  );
                                                if (!res.ok)
                                                  throw new Error(res.error);
                                              }
                                            },
                                          });
                                        }}
                                      >
                                        <Trash2 className="h-3.5 w-3.5" aria-hidden />
                                      </button>
                                    </div>
                                  ) : null}
                                </div>
                                <label className="sr-only" htmlFor={`st-${sid}`}>
                                  Status for {row.microtopic}
                                </label>
                                <select
                                  id={`st-${sid}`}
                                  value={st}
                                  onChange={(e) => {
                                    const next =
                                      e.target.value as MicrotopicProgressStatus;
                                    const prev = resolveStatus(
                                      row.id,
                                      statusBySyllabusMasterId,
                                    );
                                    if (next === prev) return;
                                    void (async () => {
                                      const ok = await setMicrotopicStatus(
                                        row.id,
                                        next,
                                      );
                                      if (!ok) return;
                                      useUndoStore.getState().offerUndo({
                                        message: "Syllabus status updated",
                                        runUndo: async () => {
                                          await undoMicrotopicToStatus(
                                            row.id,
                                            prev,
                                          );
                                        },
                                      });
                                    })();
                                  }}
                                  className={clsx(
                                    "min-h-[44px] w-full min-w-[11.5rem] shrink-0 rounded-lg border px-3 py-2 text-[13px] font-medium outline-none sm:w-auto sm:text-sm",
                                    "focus-visible:ring-2 focus-visible:ring-kal-accent/50",
                                    statusSelectClasses(st),
                                  )}
                                >
                                  {MICROTOPIC_STATUSES.map((s) => (
                                    <option key={s} value={s}>
                                      {STATUS_LABEL[s]}
                                    </option>
                                  ))}
                                </select>
                              </div>
                            </li>
                          );
                        })}
                      </ul>
                    </details>
                  );
                })}
              </div>
            </details>
          );
        })}
      </div>

      <ChapterMarksSheet
        open={marksSheetChapter != null && Boolean(catalogExamKey)}
        onClose={() => setMarksSheetChapter(null)}
        examName={catalogExamKey ?? ""}
        primaryYear={primaryMarksYear}
        chapterTitle={
          marksSheetChapter
            ? `${marksSheetChapter.subject} · ${marksSheetChapter.chapter}`
            : ""
        }
        rows={marksSheetChapter?.rows ?? []}
        onSaved={() => void refetch()}
      />

      <SyllabusCustomizeSheet
        open={sheetOpen}
        mode={sheetMode}
        onClose={closeSheet}
        onSaved={() => void refetch()}
      />

      <ConfirmDialog
        open={confirmState != null}
        title={confirmState?.title ?? ""}
        description={confirmState?.description ?? ""}
        confirmLabel="Confirm"
        cancelLabel="Cancel"
        danger
        busy={confirmBusy}
        onCancel={() => {
          if (confirmBusy) return;
          setConfirmState(null);
        }}
        onConfirm={() => {
          if (!confirmState) return;
          void (async () => {
            setConfirmBusy(true);
            try {
              await confirmState.run();
              setConfirmState(null);
              await refetch();
            } finally {
              setConfirmBusy(false);
            }
          })();
        }}
      />
    </div>
  );
}

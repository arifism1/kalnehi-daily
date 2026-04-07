"use client";

import clsx from "clsx";
import {
  BookMarked,
  ChevronDown,
  Pencil,
  Plus,
  SlidersHorizontal,
  Sparkles,
  Trash2,
  TrendingUp,
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
import { usePrimaryExamLabel } from "@/hooks/usePrimaryExamLabel";
import { useSyllabusTracker } from "@/hooks/useSyllabusTracker";
import { displayNameForExamCatalog } from "@/lib/examsCatalog";
import {
  shouldShowSyllabusComingSoon,
  syllabusCatalogExamName,
} from "@/lib/examProfile";
import type { MergedSyllabusRow } from "@/lib/userSyllabusMerge";
import { useUndoStore } from "@/store/useUndoStore";

function statusSelectClasses(status: MicrotopicProgressStatus): string {
  switch (status) {
    case "not_begun":
      return "border-kal-border bg-kal-card-muted text-kal-text dark:border-zinc-500 dark:bg-zinc-800/80 dark:text-zinc-200";
    case "in_progress":
      return "border-blue-200 bg-blue-50 text-blue-900 dark:border-blue-500/60 dark:bg-blue-950/50 dark:text-blue-100";
    case "completed":
      return "border-red-200 bg-red-50 text-red-900 dark:border-red-500/70 dark:bg-red-950/45 dark:text-red-100";
    case "need_revision":
      return "border-amber-200 bg-amber-50 text-amber-900 dark:border-amber-500/60 dark:bg-amber-950/40 dark:text-amber-100";
    default:
      return "border-kal-border bg-kal-card-muted text-kal-text dark:border-zinc-600 dark:bg-zinc-900 dark:text-zinc-200";
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

function ChapterBar({ percent }: { percent: number }) {
  const w = Math.min(100, Math.max(0, percent));
  return (
    <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-kal-border dark:bg-slate-800">
      <div
        className="h-full rounded-full bg-gradient-to-r from-kal-accent to-red-600 transition-[width] duration-300"
        style={{ width: `${w}%` }}
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
        "relative inline-flex h-6 w-11 shrink-0 items-center rounded-full border-2 transition-colors duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-kal-accent/50 focus-visible:ring-offset-2 focus-visible:ring-offset-kal-card",
        checked
          ? "border-kal-accent bg-kal-accent"
          : "border-kal-border bg-kal-card-muted",
        disabled && "cursor-not-allowed opacity-50",
      )}
    >
      <span
        className={clsx(
          "pointer-events-none inline-block h-4 w-4 rounded-full bg-white shadow-sm transition-transform duration-200",
          checked ? "translate-x-[1.25rem]" : "translate-x-0.5",
        )}
      />
    </button>
  );
}

export function SyllabusTracker() {
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
  const catalogName = syllabusCatalogExamName(activeExamName);

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

  /** CUET uses domain scoring; other exams need real marks_* (or overrides), not legacy 1× fallbacks. */
  const showMarksUi = Boolean(cuetScoringRollup) || syllabusHasCatalogMarksData(rows);

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
          Profile → Target exam <strong className="text-kal-text">CUET</strong>{" "}
          → CUET domain subjects.
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
          Syllabus tracker
        </h1>
        <p className="mt-1 text-sm leading-relaxed text-kal-muted">
          {cuetScoringRollup
            ? "CUET: mark off microtopics as you go — each domain scores up to 200 marks from your completion rate."
            : showMarksUi
              ? "Conquer chapters the right way: full chapter weight unlocks only when every microtopic in that chapter is complete."
              : "Track your syllabus by chapter and microtopic — completion % reflects chapters you fully finish."}
        </p>
        {catalogName ? (
          <p className="mt-2 text-[11px] leading-relaxed text-kal-text-secondary">
            Catalog{" "}
            <span className="font-semibold text-kal-muted">{catalogName}</span>
            {cuetScoringRollup ? (
              <>
                {" "}
                ·{" "}
                <span className="font-semibold text-kal-accent">
                  200 marks per domain
                </span>{" "}
                · projected total{" "}
                <span className="tabular-nums text-kal-text">{maxScore}</span>
              </>
            ) : showMarksUi ? (
              <>
                {" "}
                · primary weights{" "}
                <span className="font-semibold text-kal-accent">
                  marks_{primaryMarksYear}
                </span>{" "}
                · projected out of{" "}
                <span className="tabular-nums text-kal-text">{maxScore}</span>{" "}
                for this exam
              </>
            ) : (
              <span className="text-kal-muted">
                {" "}
                · completion-based mastery (no chapter-weight columns in this
                catalog yet)
              </span>
            )}
          </p>
        ) : null}
      </header>

      <section className="overflow-hidden rounded-2xl border border-kal-accent/25 bg-gradient-to-br from-kal-accent-soft via-kal-card to-kal-card p-6 kal-shadow-card dark:border-red-500/25 dark:from-red-950/40 dark:via-slate-900/60 dark:to-slate-900 dark:shadow-lg dark:shadow-red-900/10">
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
              {(cuetScoringRollup ?? rollup).overallPercent}%
            </p>
            <p className="mt-1 text-[11px] text-kal-muted">
              {cuetScoringRollup
                ? "Microtopic completion across selected domains"
                : showMarksUi
                  ? `Overall marks_${primaryMarksYear} chapter pool`
                  : `Overall progress: ${rollup.overallPercent % 1 === 0 ? rollup.overallPercent.toFixed(0) : rollup.overallPercent.toFixed(1)}%`}
            </p>
          </div>
          <div className="flex flex-col gap-3 text-right sm:min-w-[12rem]">
            {cuetScoringRollup ? (
              <div>
                <p className="text-xs text-kal-muted">Projected total</p>
                <p className="text-lg font-semibold tabular-nums text-red-600 dark:text-red-300">
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
              neetYearProjections.map((p) => (
                <div key={p.year}>
                  <p className="text-[11px] font-semibold text-kal-accent">
                    {displayExam} {p.year}
                  </p>
                  <p className="mt-0.5 text-xl font-bold tabular-nums text-red-600 dark:text-red-300">
                    {p.projectedOutOf720}
                    <span className="text-base font-semibold text-kal-muted">
                      {" "}
                      / {maxScore}
                    </span>
                  </p>
                  <p className="mt-0.5 text-[10px] leading-snug text-kal-muted">
                    Based on {p.year} pattern
                  </p>
                </div>
              ))
            ) : showMarksUi ? (
              <div>
                <p className="text-xs text-kal-muted">Marks secured</p>
                <p className="text-lg font-semibold tabular-nums text-red-600 dark:text-red-300">
                  {rollup.totalMarksMastered.toFixed(0)}
                  <span className="text-kal-muted">
                    {" "}
                    / {rollup.totalMarksPool.toFixed(0)}
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
        <div className="mt-4 h-2.5 w-full overflow-hidden rounded-full bg-kal-border dark:bg-slate-800">
          <div
            className="h-full rounded-full bg-gradient-to-r from-kal-accent via-red-600 to-red-700 transition-[width] duration-500"
            style={{
              width: `${Math.min(100, (cuetScoringRollup ?? rollup).overallPercent)}%`,
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
          className="rounded-xl border border-kal-accent/35 bg-red-950/35 px-3 py-2 text-sm font-medium text-red-200"
        >
          {saveFeedback}
        </p>
      )}

      <div className="space-y-3">
        {subjects.map((subject) => {
          const chapters = grouped.get(subject)!;
          const chapterNames = sortChapterNameList([...chapters.keys()]);
          return (
            <details
              key={subject}
              className="group overflow-hidden rounded-2xl border border-kal-border bg-kal-card open:shadow-md kal-shadow-card dark:border-slate-700/90 dark:bg-slate-900/40"
            >
              <summary className="flex min-h-[48px] cursor-pointer list-none items-center justify-between gap-2 px-5 py-4 text-base font-semibold text-kal-text marker:hidden [&::-webkit-details-marker]:hidden">
                <span className="flex min-w-0 items-center gap-2">
                  <BookMarked
                    className="h-5 w-5 shrink-0 text-kal-accent"
                    aria-hidden
                  />
                  <span className="truncate">{subject}</span>
                </span>
                <span className="flex shrink-0 items-center gap-1.5">
                  {canCustomize && catalogExamKey ? (
                    <button
                      type="button"
                      title="Add chapter"
                      className="inline-flex h-9 min-w-[2.25rem] items-center justify-center rounded-lg border border-kal-accent/30 bg-red-950/40 text-kal-accent hover:bg-red-900/50 sm:px-2"
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
              </summary>
              <div className="border-t border-kal-border dark:border-slate-800">
                {chapterNames.map((chapter) => {
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
                      className="group/ch border-b border-kal-border last:border-b-0 dark:border-slate-800"
                    >
                      <summary className="cursor-pointer list-none bg-kal-card-muted px-4 py-3 marker:hidden dark:bg-slate-950/50 [&::-webkit-details-marker]:hidden">
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center justify-between gap-2">
                              <span className="text-sm font-semibold text-kal-text">
                                {chapter}
                              </span>
                              <div className="flex items-center gap-1 sm:gap-2">
                                {canCustomize && catalogExamKey ? (
                                  <>
                                    <button
                                      type="button"
                                      title="Add microtopic here"
                                      className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-kal-accent/30 text-kal-accent hover:bg-kal-accent-soft dark:border-red-500/25 dark:text-red-400 dark:hover:bg-red-950/50"
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
                                      className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-kal-border text-kal-muted hover:bg-kal-card-muted dark:border-slate-600 dark:hover:bg-slate-800/80"
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
                                      <Pencil className="h-3.5 w-3.5" aria-hidden />
                                    </button>
                                    <button
                                      type="button"
                                      title="Hide chapter (for you)"
                                      className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-rose-500/25 text-rose-300/90 hover:bg-rose-950/30"
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
                                      <Trash2 className="h-3.5 w-3.5" aria-hidden />
                                    </button>
                                  </>
                                ) : null}
                                <span className="text-[10px] font-medium text-kal-muted">
                                  {cr?.isChapterMastered
                                    ? "Completed"
                                    : "Mark complete"}
                                </span>
                                <ChapterToggle
                                  checked={cr?.isChapterMastered ?? false}
                                  onChange={(on) =>
                                    void setChapterCompleted(
                                      list.map((r) => r.id),
                                      on,
                                    )
                                  }
                                />
                                {catalogExamKey ? (
                                  <button
                                    type="button"
                                    title="Chapter marks (your weights)"
                                    className="inline-flex h-8 min-w-[2rem] shrink-0 items-center justify-center gap-0.5 rounded-lg border border-amber-500/40 bg-amber-950/25 px-1.5 text-[10px] font-semibold text-amber-100/95 shadow-sm shadow-amber-950/20 hover:bg-amber-950/45 sm:px-2"
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
                                      className="h-3.5 w-3.5 shrink-0"
                                      aria-hidden
                                    />
                                    <span className="hidden sm:inline">Marks</span>
                                  </button>
                                ) : null}
                                <ChevronDown className="h-4 w-4 shrink-0 text-kal-muted transition-transform group-open/ch:rotate-180" />
                              </div>
                            </div>
                            <p className="mt-1 text-[11px] tabular-nums text-kal-muted">
                              {cr?.completedCount ?? 0}/{cr?.totalCount ?? list.length}{" "}
                              microtopics done · {pct}% toward chapter
                            </p>
                            <p
                              className={clsx(
                                "mt-1 text-[11px] font-medium tabular-nums",
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
                                    : " · complete all to count toward chapter weight"}
                                </>
                              ) : (
                                <>
                                  {pct}% microtopics done
                                  {cr?.isChapterMastered
                                    ? " · chapter complete"
                                    : " · finish all microtopics to complete this chapter"}
                                </>
                              )}
                            </p>
                            <ChapterBar percent={pct} />
                          </div>
                        </div>
                      </summary>
                      <ul className="divide-y divide-kal-border dark:divide-slate-800/80">
                        {list.map((row) => {
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
                            <li key={row.id} className="px-3 py-3 sm:px-4">
                              <div className="flex flex-col gap-3 rounded-xl border border-kal-border bg-kal-card-muted p-4 sm:flex-row sm:items-end sm:justify-between sm:gap-4 dark:border-slate-800 dark:bg-slate-950/30">
                                <div className="min-w-0 flex-1">
                                  <div className="flex flex-wrap items-center gap-2">
                                    <p className="text-[15px] font-semibold leading-snug text-kal-text">
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
                                  <p className="mt-2 text-xs text-kal-muted">
                                    Est.{" "}
                                    <span className="font-medium text-kal-muted">
                                      {est}
                                    </span>
                                  </p>
                                  {canCustomize && catalogExamKey ? (
                                    <div className="mt-2 flex items-center gap-2">
                                      <button
                                        type="button"
                                        className="inline-flex h-8 items-center gap-1 rounded-lg border border-kal-border px-2 text-[11px] font-medium text-kal-text-secondary hover:bg-kal-card-muted dark:border-slate-600 dark:hover:bg-slate-800/80"
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
                                        <Pencil
                                          className="h-3.5 w-3.5"
                                          aria-hidden
                                        />
                                        Edit
                                      </button>
                                      <button
                                        type="button"
                                        className="inline-flex h-8 items-center gap-1 rounded-lg border border-rose-500/25 px-2 text-[11px] font-medium text-rose-300/95 hover:bg-rose-950/25"
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
                                        <Trash2
                                          className="h-3.5 w-3.5"
                                          aria-hidden
                                        />
                                        Remove
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
                                    "min-h-[44px] w-full min-w-[11.5rem] shrink-0 rounded-xl border px-3 py-2.5 text-[15px] font-medium outline-none sm:w-auto",
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

      <section className="space-y-4" aria-labelledby="neet-projection-heading">
        <div className="flex items-start gap-3">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-kal-accent/15">
            <TrendingUp className="h-6 w-6 text-kal-accent" aria-hidden />
          </div>
          <div className="min-w-0 flex-1">
            <h2
              id="neet-projection-heading"
              className="text-base font-semibold text-kal-text"
            >
              {showMarksUi ? "Score projections" : "Syllabus mastery"}
            </h2>
            <p className="mt-1 text-xs leading-relaxed text-kal-muted">
              {showMarksUi ? (
                <>
                  Each year uses chapter weights from that exam’s column. Only
                  chapters where every microtopic is completed count toward the
                  numerator; scaled to {maxScore} for {displayExam}.
                </>
              ) : (
                <>
                  This catalog doesn’t include chapter-weight columns yet — your
                  percentage reflects chapters where every microtopic is complete.
                </>
              )}
            </p>
          </div>
        </div>

        {!showMarksUi ? (
          <div className="rounded-2xl border border-kal-border bg-kal-card-muted px-6 py-8 text-center dark:border-slate-700/80 dark:bg-slate-950/40">
            <p className="text-sm leading-relaxed text-kal-muted">
              Weighted score projections and multi-year marks appear when the
              syllabus includes chapter weights (or you set them per topic). Until
              then, use the mastery ring above for completion %.
            </p>
          </div>
        ) : neetYearProjections.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-kal-border bg-kal-card-muted px-6 py-8 text-center dark:border-slate-600 dark:bg-slate-950/40">
            <p className="text-sm leading-relaxed text-kal-muted">
              Multi-year score projections will show here once chapter marks for
              different exam years are available in your syllabus.
            </p>
          </div>
        ) : (
          <ul className="space-y-3">
            {neetYearProjections.map((p) => (
              <li
                key={p.year}
                className="overflow-hidden rounded-2xl border border-kal-accent/25 bg-gradient-to-br from-kal-accent-soft via-kal-card to-kal-card p-5 kal-shadow-card dark:border-red-500/20 dark:from-slate-900/90 dark:via-slate-900/70 dark:to-red-950/25 dark:shadow-md dark:shadow-red-900/10"
              >
                <p className="text-[11px] font-semibold uppercase tracking-wider text-kal-accent">
                  {displayExam} {p.year}
                </p>
                <p className="mt-2 flex flex-wrap items-baseline gap-x-2 gap-y-1">
                  <span className="text-3xl font-bold tabular-nums text-kal-accent">
                    {p.projectedOutOf720}
                  </span>
                  <span className="text-lg font-medium text-kal-muted">
                    / {maxScore}
                  </span>
                </p>
                <p className="mt-2 text-[13px] font-medium leading-snug text-red-100/95">
                  {p.patternLabel}
                </p>
                <p className="mt-1 text-[11px] leading-relaxed text-kal-muted">
                  {p.completionNote}
                </p>
                <p className="mt-3 text-[10px] tabular-nums text-kal-text-secondary">
                  Chapter marks captured: {p.totalMarksMastered.toFixed(0)} /{" "}
                  {p.totalMarksPool.toFixed(0)} (this year’s weights)
                </p>
              </li>
            ))}
          </ul>
        )}
      </section>

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

"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, BookMarked, ClipboardCopy, Crosshair, Loader2 } from "lucide-react";
import { useCallback, useMemo, useRef, useState } from "react";

import { SyllabusComingSoon } from "@/components/syllabus/SyllabusComingSoon";
import { TransientNotice } from "@/components/ui/TransientNotice";
import { useCalendarDate } from "@/hooks/useCalendarDate";
import { useSyllabusTracker } from "@/hooks/useSyllabusTracker";
import { useTargetExamDisplay } from "@/hooks/useTargetExamDisplay";
import { shouldShowSyllabusComingSoon } from "@/lib/examProfile";
import { chapterKey } from "@/lib/syllabusGrouping";
import {
  syllabusHasCatalogMarksData,
} from "@/lib/syllabusRollup";
import {
  estimateExamMarksLinear,
  pickChaptersUntilThreshold,
  sortChaptersForBlueprint,
  subjectSplitPercent,
  targetToRange,
  thresholdForMode,
  type BlueprintThresholdMode,
} from "@/lib/targetScoreBlueprint";
import { saveUserTargetBlueprint } from "@/actions/targetBlueprint";
import { bulkAddSyllabusMicrotopicsToDailyPlan } from "@/lib/quickTaskCreate";
import { useAuthStore } from "@/store/useAuthStore";

const DISCLAIMER =
  "Before diving deep into these high-mark chapters, make sure you have strong basics and fundamentals. If your foundation is weak, first spend some time on short video lectures or NCERT basics. These chapters will give maximum returns only if your basics are clear.";

export function TargetScoreBlueprintClient() {
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const today = useCalendarDate();
  const targetInputRef = useRef<HTMLDivElement | null>(null);
  const { examDisplayName, examLabelLoading } = useTargetExamDisplay();

  const {
    rows,
    rollup,
    maxScore,
    loading,
    error,
    targetExamLabel,
    catalogExamKey,
    cuetAwaitingDomainSelection,
  } = useSyllabusTracker();

  const syllabusComingSoon = shouldShowSyllabusComingSoon({
    examLabel: targetExamLabel,
    examLabelLoading,
    syllabusLoading: loading,
    syllabusError: error,
    syllabusRowCount: rows.length,
    cuetAwaitingDomainSelection,
  });

  const hasMarksData = useMemo(
    () => syllabusHasCatalogMarksData(rows),
    [rows],
  );

  const [targetStr, setTargetStr] = useState("");
  const [mode, setMode] = useState<BlueprintThresholdMode | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [addingPlan, setAddingPlan] = useState(false);
  const [savingMyTarget, setSavingMyTarget] = useState(false);

  const parsedTarget = useMemo(() => {
    const n = Number.parseFloat(targetStr.replace(/,/g, ""));
    if (!Number.isFinite(n)) return null;
    return n;
  }, [targetStr]);

  const range = useMemo(() => {
    if (parsedTarget == null) return null;
    return targetToRange(parsedTarget, maxScore);
  }, [parsedTarget, maxScore]);

  const estimate = useMemo(
    () => estimateExamMarksLinear(rollup, maxScore),
    [rollup, maxScore],
  );

  const blueprint = useMemo(() => {
    if (!hasMarksData || !range || mode == null) return null;
    const threshold = thresholdForMode(
      mode,
      range,
      estimate.estimatedExamMarks,
    );
    const sorted = sortChaptersForBlueprint(rollup.chapters);
    return pickChaptersUntilThreshold(sorted, threshold);
  }, [hasMarksData, range, mode, estimate.estimatedExamMarks, rollup.chapters]);

  const subjectSplit = useMemo(
    () => (blueprint?.selected.length ? subjectSplitPercent(blueprint.selected) : []),
    [blueprint],
  );

  const chapterKeysForActions = useMemo(() => {
    if (!blueprint?.selected.length) return new Set<string>();
    return new Set(
      blueprint.selected.map((c) => chapterKey(c.subject, c.chapter)),
    );
  }, [blueprint]);

  const gainToTarget = useMemo(() => {
    if (range == null) return 0;
    return Math.max(0, range.clampedTarget - estimate.estimatedExamMarks);
  }, [range, estimate.estimatedExamMarks]);

  const thresholdBudget = useMemo(() => {
    if (range == null || mode == null) return null;
    return thresholdForMode(mode, range, estimate.estimatedExamMarks);
  }, [range, mode, estimate.estimatedExamMarks]);

  const scrollToTarget = useCallback(() => {
    setMode(null);
    targetInputRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  }, []);

  const copyChaptersForPrepBrain = useCallback(() => {
    if (!blueprint?.selected.length) return;
    const lines = blueprint.selected.map(
      (c) => `${c.subject} — ${c.chapter}`,
    );
    void navigator.clipboard.writeText(lines.join("\n")).then(
      () => setNotice("Chapter list copied — paste into PrepBrain when you ask for practice."),
      () => setNotice("Could not copy — select the table and copy manually."),
    );
  }, [blueprint]);

  const onAddToDailyPlan = useCallback(async () => {
    if (!user?.id || !blueprint?.selected.length || rows.length === 0) return;
    setAddingPlan(true);
    setNotice(null);
    const r = await bulkAddSyllabusMicrotopicsToDailyPlan(
      user.id,
      today,
      rows,
      chapterKeysForActions,
    );
    setAddingPlan(false);
    if (r.ok) {
      setNotice(
        r.created > 0
          ? `Added ${r.created} task(s) to today’s plan.${r.skipped > 0 ? ` (${r.skipped} already on today’s list.)` : ""}`
          : "All of these microtopics already have tasks today.",
      );
      router.prefetch("/daily-plan");
    } else {
      setNotice(r.error);
    }
  }, [user?.id, blueprint?.selected.length, rows, today, chapterKeysForActions, router]);

  const onSaveToMyTarget = useCallback(async () => {
    if (
      !blueprint?.selected.length ||
      range == null ||
      mode == null ||
      !catalogExamKey?.trim()
    ) {
      setNotice("Set your target exam in Profile if missing, then try again.");
      return;
    }
    setSavingMyTarget(true);
    setNotice(null);
    const r = await saveUserTargetBlueprint({
      examName: catalogExamKey.trim(),
      maxScore,
      targetClamped: range.clampedTarget,
      rangeLow: range.low,
      rangeHigh: range.high,
      mode,
      estimatedMarksAtSave: estimate.estimatedExamMarks,
      totalMarksCovered: blueprint.totalMarksCovered,
      chapters: blueprint.selected.map((c) => ({
        subject: c.subject,
        chapter: c.chapter,
        chapterMarksTotal: c.chapterMarksTotal,
        microtopicProgressPercent: c.microtopicProgressPercent,
      })),
    });
    setSavingMyTarget(false);
    if (r.ok) {
      setNotice("Saved to My Target. You can review it anytime from the menu.");
      router.prefetch("/my-target");
    } else {
      setNotice(r.error);
    }
  }, [
    blueprint,
    range,
    mode,
    catalogExamKey,
    maxScore,
    estimate.estimatedExamMarks,
    router,
  ]);

  if (!user) {
    return (
      <p className="mx-auto max-w-lg rounded-xl border border-kal-warn-border bg-kal-warn-soft px-4 py-3 text-sm text-kal-warn-text">
        Sign in to use Target Score Blueprint.
      </p>
    );
  }

  if (loading) {
    return (
      <div className="flex items-center gap-2 text-kal-muted">
        <Loader2 className="h-5 w-5 animate-spin" aria-hidden />
        Loading your syllabus…
      </div>
    );
  }

  if (error) {
    return (
      <p className="rounded-xl border border-kal-accent/40 bg-kal-accent-soft/40 px-4 py-3 text-sm text-kal-text">
        {error}
      </p>
    );
  }

  if (!loading && !error && cuetAwaitingDomainSelection) {
    return (
      <div className="mx-auto max-w-lg rounded-2xl border border-kal-warn-border bg-kal-warn-soft px-6 py-8 text-center dark:border-amber-500/25 dark:bg-amber-950/20">
        <BookMarked
          className="mx-auto h-10 w-10 text-kal-warn-text dark:text-amber-400/90"
          aria-hidden
        />
        <h2 className="mt-4 text-lg font-semibold text-kal-text">
          Choose your CUET domain subjects
        </h2>
        <p className="mt-2 text-sm leading-relaxed text-kal-muted">
          Select domain subjects in Profile to load your CUET syllabus — then
          Target Score Blueprint can use chapter weights.
        </p>
      </div>
    );
  }

  if (syllabusComingSoon && targetExamLabel) {
    return (
      <SyllabusComingSoon
        examLabel={examDisplayName || targetExamLabel}
        className="pb-8 pt-2"
      />
    );
  }

  if (!hasMarksData) {
    return (
      <div className="mx-auto max-w-lg rounded-2xl border border-kal-border bg-kal-card-muted/60 px-6 py-10 text-center">
        <Crosshair className="mx-auto mb-4 h-10 w-10 text-kal-accent opacity-80" aria-hidden />
        <p className="text-sm leading-relaxed text-kal-text">
          Marks distribution data is not yet available for this exam. Feature will be enabled soon.
        </p>
        {targetExamLabel ? (
          <p className="mt-3 text-xs text-kal-muted">
            Target exam:{" "}
            <span className="font-semibold text-kal-text">
              {examDisplayName || targetExamLabel}
            </span>
          </p>
        ) : null}
      </div>
    );
  }

  const examTitle = examDisplayName || targetExamLabel || "Your exam";
  const showBlueprintTable = mode != null && blueprint != null;

  return (
    <div className="mx-auto max-w-3xl space-y-8 pb-16 pt-2 sm:pt-4">
      <Link
        href="/"
        className="inline-flex items-center gap-2 text-sm font-semibold text-kal-accent hover:text-kal-accent-hover"
      >
        <ArrowLeft className="h-4 w-4" aria-hidden />
        Home
      </Link>

      <header className="space-y-2">
        <p className="text-[0.65rem] font-semibold uppercase tracking-widest text-kal-accent">
          Marks-first roadmap
        </p>
        <h1 className="kal-feature-title text-2xl sm:text-3xl">
          Target Score Blueprint
        </h1>
        <p className="max-w-2xl text-sm leading-relaxed text-kal-muted">
          Prioritize high-weight chapters where your mastery is still catching up — aligned with{" "}
          <span className="font-medium text-kal-text">{examTitle}</span> (out of{" "}
          <span className="tabular-nums">{maxScore}</span> marks).
        </p>
        <p className="pt-1">
          <Link
            href="/my-target"
            className="text-sm font-semibold text-kal-accent underline-offset-4 hover:underline"
          >
            View saved targets (My Target)
          </Link>
        </p>
      </header>

      <TransientNotice
        message={notice}
        onDismiss={() => setNotice(null)}
        variant="neutral"
      />

      <section
        ref={targetInputRef}
        className="kal-glass-panel space-y-4 rounded-2xl border border-kal-border p-5 sm:p-6"
      >
        <div>
          <label
            htmlFor="target-marks"
            className="text-xs font-semibold uppercase tracking-wide text-kal-muted"
          >
            Approximate target score
          </label>
          <div className="mt-2 flex flex-wrap items-end gap-3">
            <input
              id="target-marks"
              type="number"
              min={0}
              max={maxScore}
              step={1}
              inputMode="numeric"
              placeholder="e.g. 500"
              value={targetStr}
              onChange={(e) => {
                setTargetStr(e.target.value);
                setMode(null);
              }}
              className="min-w-[8rem] rounded-xl border border-kal-border bg-kal-card px-3 py-2 text-kal-text tabular-nums outline-none ring-kal-accent/30 focus:ring-2"
            />
            <span className="pb-2 text-sm text-kal-muted">
              / {maxScore} max
            </span>
          </div>
        </div>

        {range ? (
          <div className="rounded-xl border border-kal-accent/25 bg-kal-accent-soft/40 px-4 py-3 text-sm dark:bg-kal-accent-soft/10">
            <p className="font-medium text-kal-text">
              Realistic band:{" "}
              <span className="tabular-nums text-kal-accent">
                {range.low}–{range.high}
              </span>{" "}
              marks
            </p>
          </div>
        ) : (
          <p className="text-sm text-kal-muted">
            Enter a number between 0 and {maxScore} to see your blueprint band and next step.
          </p>
        )}

        {range ? (
          <div className="space-y-3 rounded-xl border border-kal-border bg-kal-card-muted/50 px-4 py-4">
            <p className="text-sm leading-relaxed text-kal-text">
              You are currently on track for approximately{" "}
              <span className="font-semibold tabular-nums">{estimate.estimatedExamMarks}</span>{" "}
              marks. Do you want this blueprint for a{" "}
              <span className="font-semibold">total target of {range.clampedTarget} marks</span>, or do
              you want to focus on{" "}
              <span className="font-semibold">
                gaining about +{gainToTarget} marks
              </span>{" "}
              to reach {range.clampedTarget}?
            </p>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => setMode("absolute")}
                className={`rounded-xl px-4 py-2.5 text-sm font-semibold transition-colors ${
                  mode === "absolute"
                    ? "bg-kal-accent text-kal-accent-foreground"
                    : "border border-kal-border bg-kal-card text-kal-text hover:border-kal-accent/50"
                }`}
              >
                Total target ({range.clampedTarget} marks)
              </button>
              <button
                type="button"
                onClick={() => setMode("gain")}
                className={`rounded-xl px-4 py-2.5 text-sm font-semibold transition-colors ${
                  mode === "gain"
                    ? "bg-kal-accent text-kal-accent-foreground"
                    : "border border-kal-border bg-kal-card text-kal-text hover:border-kal-accent/50"
                }`}
              >
                Gain +{gainToTarget} to reach {range.clampedTarget}
              </button>
            </div>
          </div>
        ) : null}
      </section>

      {showBlueprintTable && blueprint ? (
        <>
          <section className="kal-glass-panel overflow-hidden rounded-2xl border border-kal-border">
            <div className="border-b border-kal-border bg-kal-card-muted/40 px-4 py-3 sm:px-5">
              <h2 className="text-base font-semibold text-kal-text">
                Recommended chapters
              </h2>
              <p className="mt-1 text-xs text-kal-muted">
                Sorted by chapter weight (high → low), then lower mastery first. Cumulative chapter
                weight ≥ {(thresholdBudget ?? 0).toFixed(0)} marks budget
                {mode === "absolute" ? " (absolute band)" : " (gain to reach band)"}.
              </p>
            </div>
            {blueprint.thresholdExceedsFullPool ? (
              <p className="border-b border-kal-border px-4 py-3 text-sm text-amber-800 dark:text-amber-200">
                Your target band needs more chapter weight than this syllabus lists in total — we
                show every chapter below.
              </p>
            ) : null}
            {blueprint.selected.length === 0 ? (
              <p className="px-4 py-8 text-center text-sm text-kal-muted">
                {(thresholdBudget ?? 0) <= 0
                  ? "On this linear estimate you already sit within the lower end of your target band. Try a higher target, or switch to “Total target” for a full high-weight chapter list."
                  : "No chapters to show."}
              </p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full min-w-[28rem] text-left text-sm">
                  <thead>
                    <tr className="border-b border-kal-border bg-kal-card-muted/30 text-[0.65rem] font-semibold uppercase tracking-wide text-kal-muted">
                      <th className="px-4 py-3 sm:px-5">Subject</th>
                      <th className="px-4 py-3 sm:px-5">Chapter</th>
                      <th className="px-4 py-3 sm:px-5">Approx. marks</th>
                      <th className="px-4 py-3 sm:px-5">Your current mastery</th>
                    </tr>
                  </thead>
                  <tbody>
                    {blueprint.selected.map((row) => (
                      <tr
                        key={chapterKey(row.subject, row.chapter)}
                        className="border-b border-kal-border/80 last:border-0"
                      >
                        <td className="px-4 py-3 align-top font-medium text-kal-text sm:px-5">
                          {row.subject}
                        </td>
                        <td className="px-4 py-3 align-top text-kal-text sm:px-5">{row.chapter}</td>
                        <td className="px-4 py-3 align-top tabular-nums text-kal-text sm:px-5">
                          {row.chapterMarksTotal.toFixed(0)}
                        </td>
                        <td className="px-4 py-3 align-top tabular-nums text-kal-muted sm:px-5">
                          {row.microtopicProgressPercent % 1 === 0
                            ? row.microtopicProgressPercent.toFixed(0)
                            : row.microtopicProgressPercent.toFixed(1)}
                          %
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
            {blueprint.selected.length > 0 ? (
              <div className="border-t border-kal-border bg-kal-card-muted/25 px-4 py-4 sm:px-5">
                <p className="text-sm text-kal-text">
                  <span className="font-semibold">Total marks covered</span> by these chapters:{" "}
                  <span className="tabular-nums font-semibold text-kal-accent">
                    {blueprint.totalMarksCovered.toFixed(0)}
                  </span>
                </p>
                {subjectSplit.length > 0 ? (
                  <div className="mt-3">
                    <p className="text-xs font-semibold uppercase tracking-wide text-kal-muted">
                      Balanced subject split (by chapter weight in this list)
                    </p>
                    <ul className="mt-2 flex flex-wrap gap-2">
                      {subjectSplit.map((s) => (
                        <li
                          key={s.subject}
                          className="rounded-lg border border-kal-border bg-kal-card px-3 py-1.5 text-xs font-medium text-kal-text"
                        >
                          {s.subject}{" "}
                          <span className="tabular-nums text-kal-accent">{s.percent}%</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                ) : null}
              </div>
            ) : null}
          </section>

          <aside
            className="rounded-2xl border border-amber-500/35 bg-amber-50/90 px-4 py-4 text-sm leading-relaxed text-amber-950 dark:border-amber-800/50 dark:bg-amber-950/35 dark:text-amber-100"
            role="note"
          >
            <p className="font-semibold text-amber-950 dark:text-amber-50">Important</p>
            <p className="mt-2">{DISCLAIMER}</p>
          </aside>

          <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap">
            <button
              type="button"
              disabled={addingPlan || blueprint.selected.length === 0}
              onClick={() => void onAddToDailyPlan()}
              className="kal-btn-accent min-h-[44px] disabled:cursor-not-allowed"
            >
              {addingPlan ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden />
                  Adding…
                </>
              ) : (
                "Add all these chapters to my Daily Plan"
              )}
            </button>
            <button
              type="button"
              disabled={
                savingMyTarget ||
                blueprint.selected.length === 0 ||
                !catalogExamKey?.trim()
              }
              onClick={() => void onSaveToMyTarget()}
              className="inline-flex min-h-[44px] items-center justify-center rounded-xl border border-kal-accent/50 bg-kal-card px-4 py-2.5 text-sm font-semibold text-kal-accent hover:bg-kal-accent/10 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {savingMyTarget ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden />
                  Saving…
                </>
              ) : (
                "Save to My Target"
              )}
            </button>
            <Link
              href="/revision"
              className="inline-flex min-h-[44px] items-center justify-center rounded-xl border border-kal-border bg-kal-card px-4 py-2.5 text-center text-sm font-semibold text-kal-text hover:border-kal-accent/50"
            >
              Create 30-day focused revision plan
            </Link>
            <button
              type="button"
              onClick={() => {
                copyChaptersForPrepBrain();
                router.push("/prepbrain");
              }}
              disabled={blueprint.selected.length === 0}
              className="inline-flex min-h-[44px] items-center justify-center gap-2 rounded-xl border border-kal-border bg-kal-card px-4 py-2.5 text-sm font-semibold text-kal-text hover:border-kal-accent/50 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <ClipboardCopy className="h-4 w-4 shrink-0" aria-hidden />
              Generate practice questions on these topics
            </button>
            <button
              type="button"
              onClick={scrollToTarget}
              className="inline-flex min-h-[44px] items-center justify-center rounded-xl border border-kal-border px-4 py-2.5 text-sm font-semibold text-kal-accent hover:bg-kal-accent/10"
            >
              Adjust my target
            </button>
          </div>
        </>
      ) : null}
    </div>
  );
}

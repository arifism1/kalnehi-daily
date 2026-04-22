"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  BookMarked,
  Crosshair,
  LayoutGrid,
  Loader2,
  Sparkles,
  Target,
  X,
} from "lucide-react";
import { useCallback, useMemo, useRef, useState } from "react";

import { SyllabusComingSoon } from "@/components/syllabus/SyllabusComingSoon";
import { TransientNotice } from "@/components/ui/TransientNotice";
import { useSyllabusTracker } from "@/hooks/useSyllabusTracker";
import { useTargetExamDisplay } from "@/hooks/useTargetExamDisplay";
import { shouldShowSyllabusComingSoon } from "@/lib/examProfile";
import { chapterKey } from "@/lib/syllabusGrouping";
import {
  syllabusHasCatalogMarksData,
} from "@/lib/syllabusRollup";
import type { TargetBoostRecommendation } from "@/lib/targetScoreEngine";
import {
  estimateExamMarksLinear,
  pickChaptersUntilThreshold,
  sortChaptersForBlueprint,
  subjectSplitPercent,
  targetToRange,
  thresholdForMode,
  type BlueprintThresholdMode,
} from "@/lib/targetScoreBlueprint";
import {
  getTargetBoostRecommendation,
  saveBoostListToMyTarget,
  saveUserTargetBlueprint,
} from "@/actions/targetBlueprint";
import { useAuthStore } from "@/store/useAuthStore";

const DISCLAIMER =
  "Before diving deep into these high-mark chapters, make sure you have strong basics and fundamentals. If your foundation is weak, first spend some time on short video lectures or NCERT basics. These chapters will give maximum returns only if your basics are clear.";

type TabId = "gain" | "reach";

export function TargetScoreBlueprintClient() {
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const targetInputRef = useRef<HTMLDivElement | null>(null);
  const [activeTab, setActiveTab] = useState<TabId>("gain");
  /** After user clicks Recommend on Reach tab, show score band, mode, and table. */
  const [reachSessionActive, setReachSessionActive] = useState(false);
  const [showReachMyTargetSuccess, setShowReachMyTargetSuccess] = useState(false);
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
  const [boostTargetStr, setBoostTargetStr] = useState("");
  const [mode, setMode] = useState<BlueprintThresholdMode | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [savingMyTarget, setSavingMyTarget] = useState(false);
  const [boostLoading, setBoostLoading] = useState(false);
  const [savingBoostToMyTarget, setSavingBoostToMyTarget] = useState(false);
  const [boostRecommendation, setBoostRecommendation] =
    useState<TargetBoostRecommendation | null>(null);
  /** True after user saves this boost run to recommendation history (until a new run). */
  const [boostSavedToMyTarget, setBoostSavedToMyTarget] = useState(false);
  /** Calm follow-up strip: View My Targets. */
  const [showBoostMyTargetSuccess, setShowBoostMyTargetSuccess] = useState(false);

  const parsedTarget = useMemo(() => {
    const n = Number.parseFloat(targetStr.replace(/,/g, ""));
    if (!Number.isFinite(n)) return null;
    return n;
  }, [targetStr]);

  const parsedBoostTarget = useMemo(() => {
    const n = Number.parseFloat(boostTargetStr.replace(/,/g, ""));
    if (!Number.isFinite(n)) return null;
    return n;
  }, [boostTargetStr]);

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

  const gainToTarget = useMemo(() => {
    if (range == null) return 0;
    return Math.max(0, range.clampedTarget - estimate.estimatedExamMarks);
  }, [range, estimate.estimatedExamMarks]);

  const thresholdBudget = useMemo(() => {
    if (range == null || mode == null) return null;
    return thresholdForMode(mode, range, estimate.estimatedExamMarks);
  }, [range, mode, estimate.estimatedExamMarks]);

  const onRecommendForReach = useCallback(() => {
    if (!catalogExamKey?.trim()) {
      setNotice("Set your target exam in Profile, then try again.");
      return;
    }
    if (parsedTarget == null || !Number.isFinite(parsedTarget) || parsedTarget < 0) {
      setNotice(`Enter a target between 0 and ${maxScore}.`);
      return;
    }
    const band = targetToRange(parsedTarget, maxScore);
    setNotice(null);
    setReachSessionActive(true);
    setShowReachMyTargetSuccess(false);
    const est = estimate.estimatedExamMarks;
    setMode(
      Math.max(0, band.clampedTarget - est) > 0 ? "gain" : "absolute",
    );
    targetInputRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  }, [catalogExamKey, estimate.estimatedExamMarks, maxScore, parsedTarget]);

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
      setShowReachMyTargetSuccess(true);
      setNotice("Saved to My Target ✓");
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

  const onRecommendForBoost = useCallback(async () => {
    if (!catalogExamKey?.trim()) {
      setNotice("Set your target exam in Profile if missing, then try again.");
      return;
    }
    if (parsedBoostTarget == null || parsedBoostTarget <= 0) {
      setNotice("Enter a valid extra-marks amount (for example: 50).");
      return;
    }

    setBoostLoading(true);
    setNotice(null);
    setBoostRecommendation(null);
    setBoostSavedToMyTarget(false);
    setShowBoostMyTargetSuccess(false);

    const res = await getTargetBoostRecommendation(
      catalogExamKey.trim(),
      parsedBoostTarget,
      rollup.chapters.map((c) => ({
        subject: c.subject,
        chapter: c.chapter,
        masteryPercent: c.microtopicProgressPercent,
      })),
    );

    setBoostLoading(false);
    if (!res.ok) {
      setNotice(res.error);
      return;
    }

    setBoostRecommendation(res.recommendation);
    setNotice("Here are your best chapters to focus on. Save to My Target when you’re ready.");
  }, [catalogExamKey, parsedBoostTarget, rollup.chapters]);

  const onSaveBoostToMyTarget = useCallback(async () => {
    if (!catalogExamKey?.trim() || !boostRecommendation?.selected.length) {
      return;
    }

    setSavingBoostToMyTarget(true);
    setNotice(null);
    setShowBoostMyTargetSuccess(false);

    const res = await saveBoostListToMyTarget({
      examName: catalogExamKey.trim(),
      maxScore,
      estimatedMarksAtSave: estimate.estimatedExamMarks,
      targetBoost: boostRecommendation.targetBoost,
      achievedMarks: boostRecommendation.achievedMarks,
      selected: boostRecommendation.selected,
    });

    setSavingBoostToMyTarget(false);

    if (!res.ok) {
      setNotice(res.error);
      return;
    }

    setBoostSavedToMyTarget(true);
    setShowBoostMyTargetSuccess(true);
    setNotice("Boost list saved to My Target ✓");
    router.prefetch("/my-target");
  }, [catalogExamKey, boostRecommendation, estimate.estimatedExamMarks, maxScore, router]);

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
        <h2 className="kal-section-heading mt-4">
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
  const showBlueprintTable =
    reachSessionActive && mode != null && blueprint != null;
  const saveSuccessVisible = showBoostMyTargetSuccess || showReachMyTargetSuccess;

  return (
    <div className="mx-auto max-w-2xl space-y-8 pb-20 pt-2 sm:pt-6 sm:pb-24">
      <Link
        href="/"
        className="inline-flex items-center gap-2 text-sm font-medium text-kal-muted transition-colors hover:text-kal-accent"
      >
        <ArrowLeft className="h-4 w-4" aria-hidden />
        Home
      </Link>

      <header className="space-y-3 text-center sm:text-left">
        <h1 className="kal-feature-title">
          Target score blueprint
        </h1>
        <p className="text-sm leading-relaxed text-kal-muted">
          A calm plan for{" "}
          <span className="font-medium text-kal-text">{examTitle}</span>
          {maxScore > 0 ? (
            <>
              {" "}
              (out of <span className="tabular-nums font-medium text-kal-text">{maxScore}</span>{" "}
              marks)
            </>
          ) : null}
          . Choose a path below, then see your next best chapters to study.
        </p>
        <p>
          <Link
            href="/my-target"
            className="text-sm font-semibold text-kal-accent underline-offset-4 hover:underline"
          >
            View my targets
          </Link>
        </p>
      </header>

      <div
        className="flex flex-col gap-1 rounded-2xl border border-kal-border/70 bg-kal-card/30 p-1.5 shadow-sm backdrop-blur-md sm:flex-row"
        role="tablist"
        aria-label="Blueprint type"
      >
        <button
          type="button"
          role="tab"
          aria-selected={activeTab === "gain"}
          onClick={() => {
            setActiveTab("gain");
            setNotice(null);
          }}
          className={`flex min-h-[48px] flex-1 items-center justify-center gap-2 rounded-xl px-4 py-3 text-sm font-semibold transition-all ${
            activeTab === "gain"
              ? "bg-kal-card text-kal-text shadow-sm ring-1 ring-kal-accent/25"
              : "text-kal-muted hover:bg-kal-card/50 hover:text-kal-text"
          }`}
        >
          <          LayoutGrid className="h-4 w-4 shrink-0" aria-hidden />
          Gain Extra Marks
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={activeTab === "reach"}
          onClick={() => {
            setActiveTab("reach");
            setNotice(null);
          }}
          className={`flex min-h-[48px] flex-1 items-center justify-center gap-2 rounded-xl px-4 py-3 text-sm font-semibold transition-all ${
            activeTab === "reach"
              ? "bg-kal-card text-kal-text shadow-sm ring-1 ring-kal-accent/25"
              : "text-kal-muted hover:bg-kal-card/50 hover:text-kal-text"
          }`}
        >
          <Target className="h-4 w-4 shrink-0" aria-hidden />
          Reach My Target Score
        </button>
      </div>

      <div className="space-y-3">
        <TransientNotice
          message={notice}
          onDismiss={() => setNotice(null)}
          variant="neutral"
        />
        {saveSuccessVisible ? (
          <div className="flex flex-col gap-3 rounded-2xl border border-kal-accent/20 bg-kal-accent/10 px-5 py-4 shadow-sm backdrop-blur-md sm:flex-row sm:items-center sm:justify-between sm:px-6">
            <p className="text-sm leading-relaxed text-kal-text">
              {showBoostMyTargetSuccess
                ? "Saved. Your chapter picks are in My Target whenever you need them."
                : "Saved. Your score roadmap is in My Target whenever you need it."}
            </p>
            <div className="flex shrink-0 flex-wrap items-center gap-2">
              <Link
                href="/my-target"
                className="inline-flex min-h-[44px] items-center justify-center gap-2 rounded-xl border border-kal-accent/35 bg-kal-accent/12 px-4 py-2.5 text-sm font-semibold text-kal-accent shadow-sm transition-colors hover:bg-kal-accent/20"
              >
                <BookMarked className="h-4 w-4 shrink-0" aria-hidden />
                View My Targets
              </Link>
              <button
                type="button"
                aria-label="Dismiss"
                onClick={() => {
                  setShowBoostMyTargetSuccess(false);
                  setShowReachMyTargetSuccess(false);
                }}
                className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-kal-border text-kal-muted transition-colors hover:bg-kal-card hover:text-kal-text"
              >
                <X className="h-4 w-4" strokeWidth={2.5} aria-hidden />
              </button>
            </div>
          </div>
        ) : null}
      </div>

      {activeTab === "gain" ? (
        <section
          className="kal-glass-panel space-y-6 rounded-3xl border border-kal-border/80 bg-kal-card/40 p-6 shadow-sm backdrop-blur-md sm:p-8"
          role="tabpanel"
        >
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0 space-y-2">
              <h2 className="kal-section-heading">
                Gain Extra Marks
              </h2>
              <p className="text-sm leading-relaxed text-kal-muted">
                Tell me how many extra marks you want. I&apos;ll rank chapters by return on effort
                after your current chapter progress — high-weight topics you still need to finish
                rise to the top.
              </p>
            </div>
            <div className="hidden h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-kal-accent/12 sm:flex">
              <Sparkles className="h-5 w-5 text-kal-accent" aria-hidden />
            </div>
          </div>

          <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:gap-4">
            <div className="w-full min-w-0 sm:max-w-[14rem]">
              <label htmlFor="boost-target" className="text-xs font-medium text-kal-muted">
                How many extra marks are you aiming for?
              </label>
              <input
                id="boost-target"
                type="number"
                min={1}
                step={1}
                inputMode="numeric"
                placeholder="e.g. 40"
                value={boostTargetStr}
                onChange={(e) => setBoostTargetStr(e.target.value)}
                className="mt-2 w-full rounded-2xl border border-kal-border/80 bg-kal-card/80 px-4 py-3 text-kal-text tabular-nums shadow-inner outline-none ring-kal-accent/20 transition-shadow focus:ring-2"
              />
            </div>
            <button
              type="button"
              onClick={() => void onRecommendForBoost()}
              disabled={boostLoading}
              className="kal-btn-accent min-h-[48px] shrink-0 disabled:cursor-not-allowed"
            >
              {boostLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden />
                  Finding chapters…
                </>
              ) : (
                "Recommend"
              )}
            </button>
          </div>

          {boostRecommendation ? (
            <div className="space-y-6">
              <div className="grid gap-3 sm:grid-cols-3">
                <div className="rounded-2xl border border-kal-border/60 bg-kal-card/50 p-4">
                  <p className="text-[0.7rem] font-medium uppercase tracking-wide text-kal-muted">
                    Mark goal
                  </p>
                  <p className="mt-1 text-lg font-semibold text-kal-text tabular-nums">
                    {boostRecommendation.achievedMarks} / {boostRecommendation.targetBoost}
                  </p>
                </div>
                <div className="rounded-2xl border border-kal-border/60 bg-kal-card/50 p-4">
                  <p className="text-[0.7rem] font-medium uppercase tracking-wide text-kal-muted">
                    Headroom
                  </p>
                  <p className="mt-1 text-lg font-semibold text-kal-text">
                    {boostRecommendation.targetReached
                      ? "On track for this run"
                      : `About +${boostRecommendation.remainingGap} marks left to cover`}
                  </p>
                </div>
                <div className="rounded-2xl border border-kal-border/60 bg-kal-card/50 p-4">
                  <p className="text-[0.7rem] font-medium uppercase tracking-wide text-kal-muted">
                    Chapters
                  </p>
                  <p className="mt-1 text-lg font-semibold text-kal-text tabular-nums">
                    {boostRecommendation.selected.length}
                  </p>
                </div>
              </div>

              <div className="overflow-hidden rounded-2xl border border-kal-border/70">
                <div className="border-b border-kal-border/50 bg-kal-card-muted/30 px-4 py-3.5 sm:px-5">
                  <p className="text-sm font-semibold text-kal-text">
                    Your chapter order (what you still need most, best return first)
                  </p>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[44rem] text-left text-sm">
                    <thead>
                      <tr className="border-b border-kal-border/60 bg-kal-card-muted/20 text-[0.7rem] font-medium uppercase tracking-wide text-kal-muted">
                        <th className="px-4 py-3 sm:px-5">Chapter</th>
                        <th className="px-4 py-3 sm:px-5">Avg. marks in exam</th>
                        <th className="px-4 py-3 sm:px-5">Your progress</th>
                        <th className="px-4 py-3 sm:px-5">Marks still available</th>
                        <th className="px-4 py-3 sm:px-5">How hard to study (vs others)</th>
                        <th className="px-4 py-3 sm:px-5">Return on effort</th>
                        <th className="px-4 py-3 sm:px-5">Running total</th>
                      </tr>
                    </thead>
                    <tbody>
                      {boostRecommendation.selected.map((item) => (
                        <tr
                          key={`${item.subject}::${item.chapter}`}
                          className="border-b border-kal-border/40 last:border-0"
                        >
                          <td className="px-4 py-3.5 align-top sm:px-5">
                            <p className="font-medium text-kal-text">{item.chapter}</p>
                            <p className="text-xs text-kal-muted">{item.subject}</p>
                          </td>
                          <td className="px-4 py-3.5 align-top tabular-nums text-kal-text sm:px-5">
                            {item.average_marks}
                          </td>
                          <td className="px-4 py-3.5 align-top tabular-nums text-kal-text sm:px-5">
                            {item.mastery_percent % 1 === 0
                              ? item.mastery_percent.toFixed(0)
                              : item.mastery_percent.toFixed(1)}
                            %
                          </td>
                          <td className="px-4 py-3.5 align-top tabular-nums text-kal-text sm:px-5">
                            {item.effective_marks}
                          </td>
                          <td className="px-4 py-3.5 align-top tabular-nums text-kal-text sm:px-5">
                            {item.relative_effort_score}
                          </td>
                          <td className="px-4 py-3.5 align-top tabular-nums font-semibold text-kal-accent sm:px-5">
                            {item.efficiency}
                          </td>
                          <td className="px-4 py-3.5 align-top tabular-nums text-kal-text sm:px-5">
                            {item.cumulative_marks_after_pick}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              <p className="text-xs text-kal-muted">
                This saves your chapter list to{" "}
                <span className="font-medium text-kal-text">My Target</span> so you can reopen it
                later.
              </p>

              <button
                type="button"
                onClick={() => void onSaveBoostToMyTarget()}
                disabled={
                  savingBoostToMyTarget ||
                  !boostRecommendation?.selected.length ||
                  boostSavedToMyTarget
                }
                className="kal-btn-accent min-h-[48px] w-full sm:w-auto disabled:cursor-not-allowed"
              >
                {savingBoostToMyTarget ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden />
                    Saving…
                  </>
                ) : boostSavedToMyTarget ? (
                  "Saved to My Target"
                ) : (
                  "Save to My Target"
                )}
              </button>
            </div>
          ) : null}
        </section>
      ) : (
        <div className="space-y-6" role="tabpanel" aria-label="Reach my target score">
          <section
            ref={targetInputRef}
            className="kal-glass-panel space-y-6 rounded-3xl border border-kal-border/80 bg-kal-card/40 p-6 shadow-sm backdrop-blur-md sm:p-8"
          >
            <div className="space-y-2">
              <h2 className="kal-section-heading">
                Reach My Target Score
              </h2>
              <p className="text-sm leading-relaxed text-kal-muted">
                Tell me your total target score
                {maxScore > 0
                  ? ` (e.g. 550 / ${maxScore})`
                  : " (e.g. 550 / 720)"}
                . I&apos;ll show you which big chapters you still need to finish, using how
                you&apos;re doing in your material today.
              </p>
            </div>

            <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:gap-4">
              <div className="w-full min-w-0 sm:max-w-[14rem]">
                <label htmlFor="target-marks" className="text-xs font-medium text-kal-muted">
                  Target score
                </label>
                <div className="mt-2 flex flex-wrap items-end gap-2 sm:gap-3">
                  <input
                    id="target-marks"
                    type="number"
                    min={0}
                    max={maxScore}
                    step={1}
                    inputMode="numeric"
                    placeholder="e.g. 550"
                    value={targetStr}
                    onChange={(e) => {
                      setTargetStr(e.target.value);
                      setMode(null);
                      setReachSessionActive(false);
                      setShowReachMyTargetSuccess(false);
                    }}
                    className="min-w-0 flex-1 rounded-2xl border border-kal-border/80 bg-kal-card/80 px-4 py-3 text-kal-text tabular-nums shadow-inner outline-none ring-kal-accent/20 focus:ring-2 sm:min-w-[8rem] sm:max-w-[10rem] sm:flex-none"
                  />
                  {maxScore > 0 ? (
                    <span className="pb-2.5 text-sm text-kal-muted">/ {maxScore} max</span>
                  ) : null}
                </div>
              </div>
              <button
                type="button"
                onClick={onRecommendForReach}
                className="kal-btn-accent min-h-[48px] shrink-0"
              >
                Recommend
              </button>
            </div>
          </section>

          {reachSessionActive && range ? (
            <>
              <div className="kal-glass-panel rounded-2xl border border-kal-accent/20 bg-kal-accent/5 p-4 text-sm backdrop-blur-sm sm:px-5 sm:py-4">
                <p className="text-kal-text">
                  A comfortable range around your number:{" "}
                  <span className="font-semibold tabular-nums text-kal-accent">
                    {range.low}–{range.high}
                  </span>{" "}
                  marks. From your practice so far, you look on track for about{" "}
                  <span className="font-semibold tabular-nums">
                    {estimate.estimatedExamMarks}
                  </span>{" "}
                  marks.
                </p>
              </div>

              <div className="kal-glass-panel space-y-3 rounded-2xl border border-kal-border/70 bg-kal-card/35 p-5">
                <p className="text-sm leading-relaxed text-kal-text">
                  How should I read that goal: as your{" "}
                  <span className="font-medium">end score</span>, or as the{" "}
                  <span className="font-medium">extra push</span> you need from where you are now?
                </p>
                <div className="flex flex-col gap-2 sm:flex-row">
                  <button
                    type="button"
                    onClick={() => setMode("absolute")}
                    className={`rounded-2xl px-4 py-3 text-left text-sm font-semibold transition-colors ${
                      mode === "absolute"
                        ? "bg-kal-accent text-kal-accent-foreground shadow-sm"
                        : "border border-kal-border/80 bg-kal-card/60 text-kal-text hover:border-kal-accent/40"
                    }`}
                  >
                    Total target: {range.clampedTarget} marks
                  </button>
                  <button
                    type="button"
                    onClick={() => setMode("gain")}
                    className={`rounded-2xl px-4 py-3 text-left text-sm font-semibold transition-colors ${
                      mode === "gain"
                        ? "bg-kal-accent text-kal-accent-foreground shadow-sm"
                        : "border border-kal-border/80 bg-kal-card/60 text-kal-text hover:border-kal-accent/40"
                    }`}
                  >
                    I need +{gainToTarget} more marks to reach {range.clampedTarget}
                  </button>
                </div>
              </div>
            </>
          ) : !reachSessionActive && targetStr ? (
            <p className="pl-0.5 text-sm text-kal-muted">
              Tap <span className="font-medium text-kal-text">Recommend</span> to see chapters for
              that target.
            </p>
          ) : !reachSessionActive ? (
            <p className="pl-0.5 text-sm text-kal-muted">
              Type your goal and tap <span className="font-medium text-kal-text">Recommend</span>.
            </p>
          ) : null}

          {showBlueprintTable && blueprint ? (
            <>
              <section className="kal-glass-panel overflow-hidden rounded-2xl border border-kal-border/80 shadow-sm">
                <div className="border-b border-kal-border/50 bg-kal-card-muted/30 px-4 py-4 sm:px-6">
                  <h3 className="text-base font-semibold text-kal-text">Chapters to focus on</h3>
                  <p className="mt-1.5 text-sm leading-relaxed text-kal-muted">
                    We start with the heaviest parts of the paper, then the sections you still have
                    open, based on your current progress. This list fits a study budget for your
                    {mode === "absolute" ? " full target score" : " remaining gap"}.{""}
                    {blueprint.thresholdExceedsFullPool
                      ? " The full syllabus is below."
                      : null}
                  </p>
                </div>
                {blueprint.selected.length === 0 ? (
                  <p className="px-4 py-10 text-center text-sm text-kal-muted sm:px-6">
                    {(thresholdBudget ?? 0) <= 0
                      ? "It looks like you are already in range for the lower part of that goal. Try a higher number, or pick “total target” to see the heaviest chapters in one list."
                      : "No chapters to show for this run."}
                  </p>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full min-w-[24rem] text-left text-sm">
                      <thead>
                        <tr className="border-b border-kal-border/50 bg-kal-card-muted/20 text-[0.7rem] font-medium uppercase tracking-wide text-kal-muted">
                          <th className="px-4 py-3 sm:px-6">Subject</th>
                          <th className="px-4 py-3 sm:px-6">Chapter</th>
                          <th className="px-4 py-3 sm:px-6">Chapter weight</th>
                          <th className="px-4 py-3 sm:px-6">Your progress</th>
                        </tr>
                      </thead>
                      <tbody>
                        {blueprint.selected.map((row) => (
                          <tr
                            key={chapterKey(row.subject, row.chapter)}
                            className="border-b border-kal-border/40 last:border-0"
                          >
                            <td className="px-4 py-3.5 align-top font-medium text-kal-text sm:px-6">
                              {row.subject}
                            </td>
                            <td className="px-4 py-3.5 align-top text-kal-text sm:px-6">
                              {row.chapter}
                            </td>
                            <td className="px-4 py-3.5 align-top tabular-nums text-kal-text sm:px-6">
                              {row.chapterMarksTotal.toFixed(0)} marks
                            </td>
                            <td className="px-4 py-3.5 align-top tabular-nums text-kal-muted sm:px-6">
                              {row.microtopicProgressPercent % 1 === 0
                                ? row.microtopicProgressPercent.toFixed(0)
                                : row.microtopicProgressPercent.toFixed(1)}
                              % done
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
                {blueprint.selected.length > 0 ? (
                  <div className="border-t border-kal-border/50 bg-kal-card-muted/20 px-4 py-4 sm:px-6">
                    <p className="text-sm text-kal-text">
                      About{" "}
                      <span className="font-semibold tabular-nums text-kal-accent">
                        {blueprint.totalMarksCovered.toFixed(0)} marks
                      </span>{" "}
                      of the paper, taken together in this list.
                    </p>
                    {subjectSplit.length > 0 ? (
                      <div className="mt-4">
                        <p className="text-xs font-medium uppercase tracking-wide text-kal-muted">
                          How this list balances across subjects
                        </p>
                        <ul className="mt-2 flex flex-wrap gap-2">
                          {subjectSplit.map((s) => (
                            <li
                              key={s.subject}
                              className="rounded-xl border border-kal-border/60 bg-kal-card/70 px-3 py-1.5 text-xs font-medium text-kal-text"
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

              {blueprint.selected.length > 0 ? (
                <aside
                  className="rounded-2xl border border-amber-500/30 bg-amber-50/85 px-4 py-4 text-sm leading-relaxed text-amber-950 shadow-sm dark:border-amber-800/40 dark:bg-amber-950/30 dark:text-amber-100"
                  role="note"
                >
                  <p className="font-semibold text-amber-950 dark:text-amber-50">
                    A quick reality check
                  </p>
                  <p className="mt-2 text-amber-900/90 dark:text-amber-100/90">{DISCLAIMER}</p>
                </aside>
              ) : null}

              {blueprint.selected.length > 0 ? (
                <div className="pt-1">
                  <p className="mb-3 text-center text-sm text-kal-muted sm:text-left">
                    Save this roadmap in{" "}
                    <span className="font-medium text-kal-text">My Target</span> to open it again
                    later.
                  </p>
                  <button
                    type="button"
                    disabled={
                      savingMyTarget || blueprint.selected.length === 0 || !catalogExamKey?.trim()
                    }
                    onClick={() => void onSaveToMyTarget()}
                    className="kal-btn-accent mx-auto block min-h-[48px] w-full max-w-md sm:mx-0"
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
                </div>
              ) : null}
            </>
          ) : null}
        </div>
      )}
    </div>
  );
}

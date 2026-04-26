"use client";

import clsx from "clsx";
import {
  ChevronDown,
  ChevronUp,
  Loader2,
  Plus,
  Star,
  Trash2,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";

import {
  getMockTests,
  deleteMockTest,
  type MockTestWithScores,
} from "@/actions/mockTests";
import { AddMockTestSheet } from "@/components/mock-tests/AddMockTestSheet";
import { useAllExamScopes } from "@/hooks/useAllExamScopes";

const SELF_RATING_META = {
  strong: { label: "Strong", class: "text-emerald-600 dark:text-emerald-400" },
  average: { label: "Average", class: "text-amber-600 dark:text-amber-400" },
  weak: { label: "Weak", class: "text-red-600 dark:text-red-400" },
} as const;

function formatDate(dateStr: string): string {
  return new Date(dateStr + "T00:00:00").toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function formatScore(
  score: number | null,
  max: number | null,
  scoreType: string,
): string {
  if (score === null) return "—";
  if (scoreType === "percentile") return `${score}%ile`;
  if (scoreType === "percentage") return `${score}%`;
  if (max !== null) return `${score}/${max}`;
  return String(score);
}

type TestCardProps = {
  test: MockTestWithScores;
  onDelete: (id: string) => Promise<void>;
  deleting: boolean;
  showExamBadge: boolean;
};

function TestCard({ test, onDelete, deleting, showExamBadge }: TestCardProps) {
  const [expanded, setExpanded] = useState(false);
  const rating = test.self_rating as keyof typeof SELF_RATING_META | null;

  return (
    <li className="kal-glass-card rounded-2xl overflow-hidden">
      <div className="p-4 space-y-2">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="font-semibold text-kal-text text-sm truncate">
              {test.test_name || "Untitled Test"}
            </p>
            <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 mt-0.5">
              <p className="text-xs text-kal-text-secondary">{formatDate(test.test_date)}</p>
              {showExamBadge && test.exam_name ? (
                <span className="inline-block rounded-full border border-kal-accent/35 bg-kal-accent/10 px-2 py-0.5 text-[0.62rem] font-semibold text-kal-accent leading-none">
                  {test.exam_name}
                </span>
              ) : null}
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            {rating && (
              <span className={clsx("text-xs font-medium", SELF_RATING_META[rating].class)}>
                {SELF_RATING_META[rating].label}
              </span>
            )}
            <button
              onClick={() => onDelete(test.id)}
              disabled={deleting}
              className="rounded-lg p-1.5 text-kal-text-secondary/50 hover:text-red-500 transition-colors disabled:opacity-40"
            >
              {deleting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Trash2 className="h-3.5 w-3.5" />}
            </button>
          </div>
        </div>

        {/* Overall score */}
        <div className="flex items-center gap-2">
          <span className="text-xl font-bold text-kal-text">
            {formatScore(test.total_score, test.max_score, test.score_type)}
          </span>
          {test.duration_minutes && (
            <span className="text-xs text-kal-text-secondary">{test.duration_minutes} min</span>
          )}
        </div>

        {/* Subject scores toggle */}
        {test.mock_test_subject_scores.length > 0 && (
          <button
            onClick={() => setExpanded((v) => !v)}
            className="flex items-center gap-1 text-xs text-kal-accent font-medium hover:underline"
          >
            {expanded ? (
              <><ChevronUp className="h-3 w-3" /> Hide subject breakdown</>
            ) : (
              <><ChevronDown className="h-3 w-3" /> Subject breakdown</>
            )}
          </button>
        )}

        {expanded && (
          <ul className="mt-2 space-y-1.5">
            {test.mock_test_subject_scores.map((ss) => {
              const pct = ss.score !== null && ss.max_score !== null && ss.max_score > 0
                ? Math.round((ss.score / ss.max_score) * 100)
                : null;
              return (
                <li key={ss.id} className="flex items-center gap-3">
                  <span className="w-28 shrink-0 text-xs text-kal-text font-medium truncate">{ss.subject}</span>
                  <div className="flex flex-1 items-center gap-2">
                    {pct !== null && (
                      <div className="relative h-2.5 flex-1 overflow-hidden rounded-full bg-kal-border/40">
                        <div
                          className="h-full rounded-full bg-kal-accent/70 transition-all duration-500"
                          style={{ width: `${Math.min(pct, 100)}%` }}
                        />
                      </div>
                    )}
                    <span className="shrink-0 text-xs text-kal-text-secondary">
                      {formatScore(ss.score, ss.max_score, test.score_type)}
                    </span>
                  </div>
                </li>
              );
            })}
          </ul>
        )}

        {test.notes && (
          <p className="text-xs text-kal-text-secondary mt-1 leading-relaxed">{test.notes}</p>
        )}
      </div>
    </li>
  );
}

export function MockTestsClient() {
  const [addOpen, setAddOpen] = useState(false);
  const [tests, setTests] = useState<MockTestWithScores[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [filterExam, setFilterExam] = useState<string>("all");

  const { examScopes, isMultiExam } = useAllExamScopes();

  const load = useCallback(async () => {
    setLoading(true);
    const result = await getMockTests();
    if (result.ok) setTests(result.data);
    setLoading(false);
  }, []);

  useEffect(() => { void load(); }, [load]);

  const handleDelete = useCallback(async (id: string) => {
    setDeleting(id);
    await deleteMockTest(id);
    setDeleting(null);
    void load();
  }, [load]);

  const filteredTests = useMemo(() => {
    if (filterExam === "all") return tests;
    return tests.filter((t) => t.exam_name === filterExam);
  }, [tests, filterExam]);

  // Build a simple trend insight (only show for single-exam filter)
  const trendInsight = useMemo(() => {
    if (filteredTests.length < 2 || filterExam === "all") return null;
    const recent = filteredTests.slice(0, Math.min(5, filteredTests.length));
    const scores = recent
      .map((t) => {
        if (t.total_score === null) return null;
        if (t.score_type === "percentile" || t.score_type === "percentage") return t.total_score;
        if (t.max_score && t.max_score > 0) return (t.total_score / t.max_score) * 100;
        return null;
      })
      .filter((s): s is number => s !== null);

    if (scores.length < 2) return null;
    const diff = scores[0] - scores[scores.length - 1];
    if (Math.abs(diff) < 1) return null;
    return diff > 0
      ? `Up ${Math.round(diff)} points/% over your last ${scores.length} tests.`
      : `Down ${Math.round(Math.abs(diff))} points/% over your last ${scores.length} tests. Review error patterns.`;
  }, [filteredTests, filterExam]);

  // Subtitle: all exam display names joined
  const examSubtitle = examScopes.map((s) => s.displayName || s.examLabel).join(" · ");

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="kal-hero-heading">Mock Test Tracker</h1>
          <p className="text-sm text-kal-text-secondary mt-0.5">
            {examSubtitle || "Your exam"} · score trends by subject
          </p>
        </div>
        <button
          onClick={() => setAddOpen(true)}
          className="flex items-center gap-2 rounded-xl bg-kal-accent px-4 py-2.5 text-sm font-semibold text-white hover:bg-kal-accent/90 transition-colors"
        >
          <Plus className="h-4 w-4" />
          Log test
        </button>
      </div>

      {/* Exam filter chips — only shown for multi-exam users */}
      {isMultiExam && (
        <div className="flex flex-wrap gap-2" role="group" aria-label="Filter by exam">
          <button
            onClick={() => setFilterExam("all")}
            className={clsx(
              "rounded-full border px-3.5 py-1.5 text-xs font-semibold transition-colors",
              filterExam === "all"
                ? "border-kal-accent bg-kal-accent text-white"
                : "border-kal-border bg-kal-card/40 text-kal-muted hover:border-kal-accent/50 hover:text-kal-text",
            )}
          >
            All
          </button>
          {examScopes.map((scope) => (
            <button
              key={scope.examLabel}
              onClick={() => setFilterExam(scope.examLabel)}
              className={clsx(
                "rounded-full border px-3.5 py-1.5 text-xs font-semibold transition-colors",
                filterExam === scope.examLabel
                  ? "border-kal-accent bg-kal-accent text-white"
                  : "border-kal-border bg-kal-card/40 text-kal-muted hover:border-kal-accent/50 hover:text-kal-text",
              )}
            >
              {scope.displayName || scope.examLabel}
            </button>
          ))}
        </div>
      )}

      {/* Trend insight */}
      {trendInsight && (
        <div className="flex items-center gap-2 rounded-xl border border-kal-accent/30 bg-kal-accent-soft/40 px-4 py-3">
          <Star className="h-4 w-4 text-kal-accent shrink-0" aria-hidden />
          <p className="text-sm font-medium text-kal-text">{trendInsight}</p>
        </div>
      )}

      {/* List */}
      {loading ? (
        <div className="flex min-h-[200px] items-center justify-center">
          <Loader2 className="h-6 w-6 animate-spin text-kal-accent/60" />
        </div>
      ) : filteredTests.length === 0 ? (
        <div className="py-12 text-center space-y-2">
          <p className="text-sm text-kal-text-secondary">
            {filterExam === "all"
              ? "No tests logged yet. Tap \u201cLog test\u201d to add your first mock."
              : "No tests logged for this exam yet."}
          </p>
        </div>
      ) : (
        <ul className="space-y-3">
          {filteredTests.map((test) => (
            <TestCard
              key={test.id}
              test={test}
              onDelete={handleDelete}
              deleting={deleting === test.id}
              showExamBadge={isMultiExam}
            />
          ))}
        </ul>
      )}

      <AddMockTestSheet
        open={addOpen}
        onClose={() => setAddOpen(false)}
        onSaved={() => void load()}
        examScopes={examScopes}
      />
    </div>
  );
}

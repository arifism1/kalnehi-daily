"use client";

import clsx from "clsx";
import { ChevronLeft, ChevronRight, Loader2, X } from "lucide-react";
import { useCallback, useEffect, useId, useMemo, useState, useTransition } from "react";

import { upsertMockTest, type SubjectScoreInput } from "@/actions/mockTests";
import {
  getMockTestUiPreset,
  getSuggestedSubjectMaxMarks,
  mockTestPersistExamName,
  type MockScoreType,
} from "@/lib/mockTestExamPresets";

type SelfRating = "strong" | "average" | "weak";

type Props = {
  open: boolean;
  onClose: () => void;
  onSaved: () => void;
  /** `target_exam` / `primary_exam` from profile — used to load exam-specific defaults. */
  examName: string;
  syllabusSubjects: string[];
};

function todayYmd(): string {
  return new Date().toISOString().slice(0, 10);
}

export function AddMockTestSheet({
  open,
  onClose,
  onSaved,
  examName,
  syllabusSubjects,
}: Props) {
  const baseId = useId();
  const [step, setStep] = useState<1 | 2>(1);

  // Step 1 fields
  const [testName, setTestName] = useState("");
  const [testDate, setTestDate] = useState(todayYmd);
  const [scoreType, setScoreType] = useState<MockScoreType>("raw");
  const [maxScore, setMaxScore] = useState("");
  const [totalScore, setTotalScore] = useState("");
  const [durationMinutes, setDurationMinutes] = useState("");
  const [selfRating, setSelfRating] = useState<SelfRating | "">("");
  const [notes, setNotes] = useState("");

  // Step 2 — per-subject scores
  const [subjectScores, setSubjectScores] = useState<Record<string, { max: string; score: string }>>(
    () => Object.fromEntries(syllabusSubjects.map((s) => [s, { max: "", score: "" }])),
  );

  const [saveError, setSaveError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const examPreset = useMemo(() => getMockTestUiPreset(examName || null), [examName]);

  /** Re-seed when the sheet opens or the user’s exam / subject list changes. */
  useEffect(() => {
    if (!open) return;
    const p = getMockTestUiPreset(examName || null);
    setStep(1);
    setTestName("");
    setTestDate(todayYmd());
    setScoreType(p.defaultScoreType);
    setMaxScore(
      p.defaultMaxTotal != null && p.defaultScoreType !== "percentile" ? String(p.defaultMaxTotal) : "",
    );
    setTotalScore("");
    setDurationMinutes(
      p.suggestedDurationMinutes != null ? String(p.suggestedDurationMinutes) : "",
    );
    setSelfRating("");
    setNotes("");
    setSaveError(null);
    setSubjectScores(
      Object.fromEntries(
        syllabusSubjects.map((s) => [
          s,
          {
            max:
              p.defaultScoreType === "percentile"
                ? ""
                : getSuggestedSubjectMaxMarks(examName || null, s),
            score: "",
          },
        ]),
      ),
    );
  }, [open, examName, syllabusSubjects]);

  const reset = useCallback(() => {
    setStep(1);
    setTestName("");
    setTestDate(todayYmd());
    const p = getMockTestUiPreset(examName || null);
    setScoreType(p.defaultScoreType);
    setMaxScore(
      p.defaultMaxTotal != null && p.defaultScoreType !== "percentile" ? String(p.defaultMaxTotal) : "",
    );
    setTotalScore("");
    setDurationMinutes(
      p.suggestedDurationMinutes != null ? String(p.suggestedDurationMinutes) : "",
    );
    setSelfRating("");
    setNotes("");
    setSubjectScores(
      Object.fromEntries(
        syllabusSubjects.map((s) => [
          s,
          {
            max:
              p.defaultScoreType === "percentile"
                ? ""
                : getSuggestedSubjectMaxMarks(examName || null, s),
            score: "",
          },
        ]),
      ),
    );
    setSaveError(null);
  }, [syllabusSubjects, examName]);

  const handleClose = useCallback(() => {
    reset();
    onClose();
  }, [reset, onClose]);

  const step1Valid = testDate.trim().length > 0;

  const handleSave = useCallback(() => {
    setSaveError(null);
    startTransition(async () => {
      const scores: SubjectScoreInput[] = syllabusSubjects
        .map((s) => ({
          subject: s,
          maxScore: subjectScores[s]?.max ? Number(subjectScores[s].max) : null,
          score: subjectScores[s]?.score ? Number(subjectScores[s].score) : null,
        }))
        .filter((s) => s.score !== null || s.maxScore !== null);

      const result = await upsertMockTest({
        testDate,
        testName: testName.trim(),
        examName: mockTestPersistExamName(examName || null),
        scoreType,
        maxScore: maxScore ? Number(maxScore) : null,
        totalScore: totalScore ? Number(totalScore) : null,
        durationMinutes: durationMinutes ? Number(durationMinutes) : null,
        selfRating: (selfRating as SelfRating) || null,
        notes: notes.trim() || null,
        subjectScores: scores,
      });

      if (!result.ok) {
        setSaveError(result.error);
        return;
      }
      reset();
      onSaved();
      onClose();
    });
  }, [
    testDate,
    testName,
    examName,
    scoreType,
    maxScore,
    totalScore,
    durationMinutes,
    selfRating,
    notes,
    syllabusSubjects,
    subjectScores,
    reset,
    onSaved,
    onClose,
  ]);

  if (!open) return null;

  const fieldLabel =
    "text-[0.65rem] font-semibold uppercase tracking-wide text-zinc-800 dark:text-zinc-200";
  const fieldInput =
    "w-full rounded-xl border border-zinc-300/95 dark:border-zinc-600 bg-[var(--kal-input-bg)] px-3 py-2.5 text-sm text-zinc-950 dark:text-zinc-100 placeholder:text-zinc-500 dark:placeholder:text-zinc-400 outline-none focus:ring-2 focus:ring-kal-accent/50 focus:border-kal-accent/50";

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
      <div
        className="absolute inset-0 bg-kal-overlay backdrop-blur-sm"
        onClick={handleClose}
        aria-hidden
      />
      <div
        className="relative z-10 w-full max-w-lg rounded-t-2xl sm:rounded-2xl border border-zinc-200/95 bg-kal-bg shadow-2xl ring-1 ring-zinc-950/10 dark:border-zinc-600 dark:ring-white/10 overflow-y-auto max-h-[92dvh]"
        role="dialog"
        aria-modal="true"
        aria-labelledby={`${baseId}-dialog-title`}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-zinc-200/90 p-4 dark:border-zinc-600/80">
          <div className="flex items-center gap-3">
            {step === 2 && (
              <button
                type="button"
                onClick={() => setStep(1)}
                className="rounded-lg p-1 text-zinc-600 transition-colors hover:bg-zinc-200/80 hover:text-zinc-900 dark:text-zinc-400 dark:hover:bg-zinc-800 dark:hover:text-zinc-100"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
            )}
            <div>
              <h2
                id={`${baseId}-dialog-title`}
                className="font-semibold text-zinc-950 dark:text-zinc-50"
              >
                Log Mock Test
              </h2>
              <p className="text-xs text-zinc-600 dark:text-zinc-400">
                {examPreset.displayLabel}
                <span className="text-zinc-500 dark:text-zinc-500"> · </span>
                Step {step} of 2
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={handleClose}
            className="rounded-lg p-1.5 text-zinc-600 transition-colors hover:bg-zinc-200/80 hover:text-zinc-900 dark:text-zinc-400 dark:hover:bg-zinc-800 dark:hover:text-zinc-100"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="p-4 space-y-4">
          {step === 1 ? (
            <>
              {/* Test Name */}
              <div className="space-y-1.5">
                <label htmlFor={`${baseId}-name`} className={fieldLabel}>
                  Test Name
                </label>
                <input
                  id={`${baseId}-name`}
                  type="text"
                  value={testName}
                  onChange={(e) => setTestName(e.target.value)}
                  placeholder={examPreset.testNamePlaceholder}
                  className={fieldInput}
                />
              </div>

              {/* Date */}
              <div className="space-y-1.5">
                <label htmlFor={`${baseId}-date`} className={fieldLabel}>
                  Test Date *
                </label>
                <input
                  id={`${baseId}-date`}
                  type="date"
                  value={testDate}
                  onChange={(e) => setTestDate(e.target.value)}
                  className={fieldInput}
                />
              </div>

              {/* Score Type */}
              <div className="space-y-1.5">
                <p className={fieldLabel}>Score Type</p>
                <div className="flex overflow-hidden rounded-xl border border-zinc-300/95 text-sm dark:border-zinc-600">
                  {(["raw", "percentage", "percentile"] as MockScoreType[]).map((t) => (
                    <button
                      key={t}
                      type="button"
                      onClick={() => {
                        setScoreType(t);
                        if (t === "percentile") {
                          setMaxScore("");
                        } else if (examPreset.defaultMaxTotal != null) {
                          setMaxScore(String(examPreset.defaultMaxTotal));
                        }
                      }}
                      className={clsx(
                        "flex-1 py-2 font-medium capitalize transition-colors",
                        scoreType === t
                          ? "bg-kal-accent text-white"
                          : "bg-zinc-100 text-zinc-900 hover:bg-zinc-200/90 dark:bg-zinc-800 dark:text-zinc-100 dark:hover:bg-zinc-700",
                        examPreset.preferPercentile && t === "percentile" && scoreType !== t && "font-semibold",
                      )}
                    >
                      {t}
                    </button>
                  ))}
                </div>
                <p className="text-[11px] leading-relaxed text-zinc-600 dark:text-zinc-400">
                  {examPreset.scoringHint}
                </p>
              </div>

              {/* Total Score */}
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label htmlFor={`${baseId}-total`} className={fieldLabel}>
                    {scoreType === "percentile" ? "Percentile" : scoreType === "percentage" ? "Percentage" : "Score"}
                  </label>
                  <input
                    id={`${baseId}-total`}
                    type="number"
                    value={totalScore}
                    onChange={(e) => setTotalScore(e.target.value)}
                    placeholder={examPreset.exampleTotal}
                    className={fieldInput}
                  />
                </div>

                {scoreType !== "percentile" && (
                  <div className="space-y-1.5">
                    <label htmlFor={`${baseId}-max`} className={fieldLabel}>
                      {scoreType === "percentage" ? "Out of" : "Max score"}
                    </label>
                    <input
                      id={`${baseId}-max`}
                      type="number"
                      value={maxScore}
                      onChange={(e) => setMaxScore(e.target.value)}
                      placeholder={examPreset.exampleMax || (scoreType === "percentage" ? "100" : "720")}
                      className={fieldInput}
                    />
                  </div>
                )}
              </div>

              {/* Duration */}
              <div className="space-y-1.5">
                <label htmlFor={`${baseId}-duration`} className={fieldLabel}>
                  Duration (minutes)
                </label>
                <input
                  id={`${baseId}-duration`}
                  type="number"
                  value={durationMinutes}
                  onChange={(e) => setDurationMinutes(e.target.value)}
                  placeholder={examPreset.durationPlaceholder}
                  className={fieldInput}
                />
              </div>

              {/* Self Rating */}
              <div className="space-y-1.5">
                <p className={fieldLabel}>Self Assessment</p>
                <div className="flex gap-2">
                  {(["strong", "average", "weak"] as SelfRating[]).map((r) => (
                    <button
                      key={r}
                      type="button"
                      onClick={() => setSelfRating(selfRating === r ? "" : r)}
                      className={clsx(
                        "flex-1 rounded-xl border py-2 text-sm font-medium capitalize transition-colors",
                        selfRating === r
                          ? r === "strong"
                            ? "border-emerald-500 bg-emerald-50 text-emerald-900 dark:border-emerald-600 dark:bg-emerald-950/50 dark:text-emerald-200"
                            : r === "average"
                            ? "border-amber-500 bg-amber-50 text-amber-900 dark:border-amber-600 dark:bg-amber-950/50 dark:text-amber-200"
                            : "border-red-500 bg-red-50 text-red-900 dark:border-red-600 dark:bg-red-950/50 dark:text-red-200"
                          : "border-zinc-300 bg-zinc-100/90 text-zinc-900 hover:bg-zinc-200/80 dark:border-zinc-600 dark:bg-zinc-800/90 dark:text-zinc-100 dark:hover:bg-zinc-700/90",
                      )}
                    >
                      {r}
                    </button>
                  ))}
                </div>
              </div>

              {/* Notes */}
              <div className="space-y-1.5">
                <label htmlFor={`${baseId}-notes`} className={fieldLabel}>
                  Notes
                </label>
                <textarea
                  id={`${baseId}-notes`}
                  rows={2}
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Optional observations…"
                  className={clsx(fieldInput, "min-h-0 resize-none")}
                />
              </div>

              <button
                type="button"
                onClick={() => step1Valid && setStep(2)}
                disabled={!step1Valid}
                className="flex w-full items-center justify-center gap-2 rounded-xl bg-kal-accent py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-kal-accent/90 disabled:opacity-50 transition-colors"
              >
                Subject scores
                <ChevronRight className="h-4 w-4" />
              </button>
            </>
          ) : (
            <>
              <p className="text-sm text-zinc-700 dark:text-zinc-300">
                <span className="font-medium text-zinc-950 dark:text-zinc-50">
                  {examPreset.displayLabel}
                </span>
                {" — "}
                per-subject scores. Leave blank to skip.
              </p>

              <div className="space-y-3">
                {syllabusSubjects.map((subject) => (
                  <div
                    key={subject}
                    className="space-y-2 rounded-xl border border-zinc-200/90 bg-zinc-50/90 p-3 dark:border-zinc-600/80 dark:bg-zinc-900/50"
                  >
                    <p className="text-sm font-semibold text-zinc-950 dark:text-zinc-50">{subject}</p>
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="text-[0.65rem] font-medium uppercase tracking-wide text-zinc-600 dark:text-zinc-400">
                          Score
                        </label>
                        <input
                          type="number"
                          value={subjectScores[subject]?.score ?? ""}
                          onChange={(e) =>
                            setSubjectScores((prev) => ({
                              ...prev,
                              [subject]: { ...prev[subject], score: e.target.value },
                            }))
                          }
                          placeholder="—"
                          className="mt-1 w-full rounded-lg border border-zinc-300/95 bg-[var(--kal-input-bg)] px-2.5 py-1.5 text-sm text-zinc-950 dark:border-zinc-600 dark:text-zinc-100 outline-none focus:ring-2 focus:ring-kal-accent/50"
                        />
                      </div>
                      {scoreType !== "percentile" && (
                        <div>
                          <label className="text-[0.65rem] font-medium uppercase tracking-wide text-zinc-600 dark:text-zinc-400">
                            Max
                          </label>
                          <input
                            type="number"
                            value={subjectScores[subject]?.max ?? ""}
                            onChange={(e) =>
                              setSubjectScores((prev) => ({
                                ...prev,
                                [subject]: { ...prev[subject], max: e.target.value },
                              }))
                            }
                            placeholder="—"
                            className="mt-1 w-full rounded-lg border border-zinc-300/95 bg-[var(--kal-input-bg)] px-2.5 py-1.5 text-sm text-zinc-950 dark:text-zinc-100 outline-none focus:ring-2 focus:ring-kal-accent/50"
                          />
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>

              {saveError && (
                <p className="text-sm font-medium text-red-700 dark:text-red-300">{saveError}</p>
              )}

              <button
                type="button"
                onClick={handleSave}
                disabled={isPending}
                className="flex w-full items-center justify-center gap-2 rounded-xl bg-kal-accent py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-kal-accent/90 disabled:opacity-60 transition-colors"
              >
                {isPending && <Loader2 className="h-4 w-4 animate-spin" />}
                Save Test
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

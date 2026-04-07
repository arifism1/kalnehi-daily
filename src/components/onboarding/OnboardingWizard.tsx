"use client";

import {
  ArrowRight,
  BookOpen,
  CalendarDays,
  CheckCircle2,
  ChevronLeft,
  Flag,
  Sparkles,
  Target,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";

import { upsertUserProfile } from "@/actions/profile";
import { CuetDomainSubjectPick } from "@/components/profile/CuetDomainSubjectPick";
import { createTask } from "@/actions/tasks";
import {
  EXAMS_CATALOG_FALLBACK,
  dedupeExamsCatalogForUi,
  fetchExamsCatalog,
  type ExamCatalogRow,
} from "@/lib/examsCatalog";
import { isCuetExam } from "@/lib/examProfile";
import { KALNEHI_PROFILE_UPDATED_EVENT } from "@/lib/profileEvents";
import { getSupabaseBrowserClient } from "@/lib/supabase";
import {
  chaptersForSubject,
  microtopicsForSubjectChapter,
  uniqueSubjects,
} from "@/lib/taskPlanner";
import { refreshTasksFromSupabase } from "@/lib/refreshTasksFromSupabase";
import { dispatchTasksSync } from "@/lib/taskRefreshDispatch";
import { formatSupabaseError } from "@/lib/supabase";
import { useAuthStore } from "@/store/useAuthStore";
import { useOnboardingStore } from "@/store/useOnboardingStore";
import { useTaskStore } from "@/store/useTaskStore";

import { TASK_STATUS } from "@/components/task/TaskCard";

const STEPS = 5;

export function OnboardingWizard() {
  const router = useRouter();
  const userId = useAuthStore((s) => s.user?.id);
  const setCompleted = useOnboardingStore((s) => s.setOnboardingCompleted);
  const syllabusById = useTaskStore((s) => s.microtopics);

  const microtopics = useMemo(
    () => Object.values(syllabusById),
    [syllabusById],
  );
  const subjects = useMemo(
    () => uniqueSubjects(microtopics),
    [microtopics],
  );

  const [step, setStep] = useState(1);
  const [examDate, setExamDate] = useState("");
  const [examOptions, setExamOptions] = useState<ExamCatalogRow[]>(() =>
    dedupeExamsCatalogForUi(EXAMS_CATALOG_FALLBACK),
  );
  const [primaryExam, setPrimaryExam] = useState("NEET UG");
  const [cuetDomainSubjects, setCuetDomainSubjects] = useState<string[]>([]);
  const [subject, setSubject] = useState("");
  const [chapter, setChapter] = useState("");
  const [microtopicId, setMicrotopicId] = useState("");
  const [planDate, setPlanDate] = useState(() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  });
  const [estMinutes, setEstMinutes] = useState("45");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    void (async () => {
      const supabase = getSupabaseBrowserClient();
      const rows = await fetchExamsCatalog(supabase);
      setExamOptions(rows);
      const neet = rows.find((r) => r.exam_name === "NEET UG");
      if (neet) setPrimaryExam(neet.exam_name);
    })();
  }, []);

  const chapters = useMemo(
    () => chaptersForSubject(microtopics, subject),
    [microtopics, subject],
  );
  const microOptions = useMemo(
    () => microtopicsForSubjectChapter(microtopics, subject, chapter),
    [microtopics, subject, chapter],
  );

  const finish = useCallback(() => {
    setCompleted(true);
    router.replace("/");
    router.refresh();
  }, [router, setCompleted]);

  /** Lets users reach the dashboard immediately; they can finish exam/tasks in Profile later. */
  const skipToDashboard = useCallback(() => {
    setCompleted(true);
    router.replace("/");
    router.refresh();
  }, [router, setCompleted]);

  const saveExamAndNext = useCallback(async () => {
    if (!examDate.trim()) {
      setError("Set your D-day — the exam doesn’t wait.");
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const exam = primaryExam.trim() || null;
      const res = await upsertUserProfile({
        full_name: null,
        target_exam_date: examDate.trim(),
        primary_exam: exam,
        target_exam: exam,
        cuet_domain_subjects:
          exam && isCuetExam(exam) ? cuetDomainSubjects : [],
      });
      if (!res.ok) throw new Error(res.error);
      window.dispatchEvent(new Event(KALNEHI_PROFILE_UPDATED_EVENT));
      setStep(2);
    } catch (e) {
      setError(formatSupabaseError(e));
    } finally {
      setBusy(false);
    }
  }, [examDate, primaryExam, cuetDomainSubjects]);

  const createFirstTask = useCallback(async () => {
    if (!userId) return;
    const linkId = microtopicId.trim() || null;
    const row = linkId ? syllabusById[linkId] : undefined;
    const name =
      row?.microtopic?.trim() || "First focus block";
    if (!linkId) {
      setError("Select a microtopic for your first plan.");
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const est = estMinutes.trim() ? Number(estMinutes) : NaN;
      const res = await createTask({
        assigned_date: planDate,
        name,
        microtopic_id: linkId,
        status: TASK_STATUS.pending,
        estimated_minutes: Number.isFinite(est) ? Math.round(est) : null,
        marks_value: null,
      });
      if (!res.ok) throw new Error(res.error);
      await refreshTasksFromSupabase(userId);
      dispatchTasksSync();
      setStep(5);
    } catch (e) {
      setError(formatSupabaseError(e));
    } finally {
      setBusy(false);
    }
  }, [userId, microtopicId, syllabusById, planDate, estMinutes]);

  return (
    <div className="mx-auto flex min-h-[min(100dvh,720px)] max-w-lg flex-col px-4 py-8">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-x-3 gap-y-2">
        <p className="text-[10px] font-bold uppercase tracking-[0.35em] text-kal-accent">
          Setup · {step}/{STEPS}
        </p>
        <div className="ml-auto flex flex-wrap items-center justify-end gap-2">
          {step < 5 && (
            <button
              type="button"
              onClick={() => skipToDashboard()}
              disabled={busy}
              className="rounded-lg px-2 py-1.5 text-xs font-semibold text-kal-text-secondary underline-offset-4 transition-colors hover:text-kal-accent disabled:opacity-40"
            >
              Skip to dashboard
            </button>
          )}
          {step < 5 && (
            <button
              type="button"
              onClick={() => setStep((s) => Math.max(1, s - 1))}
              disabled={step <= 1 || busy}
              className="inline-flex items-center gap-1 rounded-lg px-2 py-1.5 text-xs font-medium text-kal-text-secondary hover:text-kal-accent disabled:pointer-events-none disabled:opacity-30"
            >
              <ChevronLeft className="h-4 w-4" />
              Back
            </button>
          )}
        </div>
      </div>

      {step < 5 && (
        <p className="mb-6 text-center text-[11px] leading-relaxed text-kal-text-secondary">
          Prefer to explore first? Use Skip — you can add your exam, targets, and
          history in Profile anytime after you land on the home screen.
        </p>
      )}

      {step === 1 && (
        <section className="flex flex-1 flex-col gap-6">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-kal-text">
              Define your ultimate target
            </h1>
            <p className="mt-2 text-sm leading-relaxed text-kal-text-secondary">
              This is the exam you&apos;re going to conquer — lock the date you
              will execute toward. You can refine it anytime in Profile.
            </p>
          </div>
          <div>
            <label className="text-xs font-semibold text-kal-text-secondary">
              Target exam
            </label>
            <select
              value={primaryExam}
              onChange={(e) => setPrimaryExam(e.target.value)}
              className="mt-2 min-h-[48px] w-full rounded-xl border border-kal-border bg-kal-card-muted px-4 py-3 text-[15px] text-kal-text transition-colors duration-200 focus:border-kal-accent/40 focus:outline-none focus:ring-2 focus:ring-kal-accent/20"
            >
              {examOptions.map((opt) => (
                <option key={opt.exam_name} value={opt.exam_name}>
                  {opt.display_name}
                </option>
              ))}
            </select>
          </div>
          {primaryExam && isCuetExam(primaryExam) ? (
            <div className="rounded-xl border border-kal-border bg-kal-card-muted p-4">
              <p className="text-xs font-semibold text-kal-accent">
                CUET domain subjects
              </p>
              <p className="mt-1 text-[11px] leading-relaxed text-kal-text-secondary">
                Select the subjects you are taking. You can change this later in
                Profile.
              </p>
              <div className="mt-3">
                <CuetDomainSubjectPick
                  selected={cuetDomainSubjects}
                  onChange={setCuetDomainSubjects}
                  disabled={busy}
                />
              </div>
            </div>
          ) : null}
          <div>
            <label className="text-xs font-semibold text-kal-text-secondary">
              D-day (exam date)
            </label>
            <input
              type="date"
              value={examDate}
              onChange={(e) => setExamDate(e.target.value)}
              className="mt-2 min-h-[48px] w-full rounded-xl border border-kal-border bg-kal-card-muted px-4 py-3 text-kal-text transition-colors duration-200 [color-scheme:light] focus:border-kal-accent/40 focus:outline-none focus:ring-2 focus:ring-kal-accent/20 dark:[color-scheme:dark]"
            />
          </div>
          {error && (
            <p className="text-sm font-medium text-red-700 dark:text-rose-200">
              {error}
            </p>
          )}
          <button
            type="button"
            disabled={busy}
            onClick={() => void saveExamAndNext()}
            className="mt-auto flex min-h-[52px] items-center justify-center gap-2 rounded-2xl bg-kal-accent py-3.5 text-sm font-semibold text-kal-accent-foreground shadow-sm transition-opacity duration-200 disabled:opacity-50"
          >
            {busy ? "Saving…" : "Continue"}
            <ArrowRight className="h-4 w-4" />
          </button>
        </section>
      )}

      {step === 2 && (
        <section className="flex flex-1 flex-col gap-6">
          <div className="flex items-center gap-2">
            <BookOpen className="h-6 w-6 text-kal-accent" />
            <div>
              <h1 className="text-xl font-bold tracking-tight text-kal-text">
                Subjects
              </h1>
              <p className="text-sm leading-relaxed text-kal-text-secondary">
                Pick a subject to anchor your first study block.
              </p>
            </div>
          </div>
          {subjects.length === 0 ? (
            <p className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm leading-relaxed text-amber-950 dark:border-amber-500/30 dark:bg-amber-950/25 dark:text-amber-50">
              No syllabus loaded yet. Open the app online once, then come back —
              or visit{" "}
              <Link href="/syllabus" className="font-semibold underline">
                Syllabus
              </Link>{" "}
              when you&apos;re connected.
            </p>
          ) : (
            <select
              value={subject}
              onChange={(e) => {
                setSubject(e.target.value);
                setChapter("");
                setMicrotopicId("");
              }}
              className="min-h-[48px] w-full rounded-xl border border-kal-border bg-kal-card-muted px-4 py-3 text-kal-text transition-colors duration-200 focus:border-kal-accent/40 focus:outline-none focus:ring-2 focus:ring-kal-accent/20"
            >
              <option value="">— Select —</option>
              {subjects.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          )}
          <button
            type="button"
            disabled={!subject || subjects.length === 0}
            onClick={() => setStep(3)}
            className="mt-auto flex min-h-[52px] items-center justify-center gap-2 rounded-2xl bg-kal-accent py-3.5 text-sm font-semibold text-kal-accent-foreground shadow-sm transition-opacity duration-200 disabled:opacity-40"
          >
            Continue
            <ArrowRight className="h-4 w-4" />
          </button>
        </section>
      )}

      {step === 3 && (
        <section className="flex flex-1 flex-col gap-6">
          <div className="flex items-center gap-2">
            <Target className="h-6 w-6 text-kal-accent" />
            <div>
              <h1 className="text-xl font-bold tracking-tight text-kal-text">
                Microtopics
              </h1>
              <p className="text-sm leading-relaxed text-kal-text-secondary">
                Chapter, then one microtopic for your first plan.
              </p>
            </div>
          </div>
          <select
            value={chapter}
            onChange={(e) => {
              setChapter(e.target.value);
              setMicrotopicId("");
            }}
            className="min-h-[48px] w-full rounded-xl border border-kal-border bg-kal-card-muted px-4 py-3 text-kal-text transition-colors duration-200 focus:border-kal-accent/40 focus:outline-none focus:ring-2 focus:ring-kal-accent/20 disabled:opacity-50"
            disabled={!subject}
          >
            <option value="">— Chapter —</option>
            {chapters.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
          <select
            value={microtopicId}
            onChange={(e) => setMicrotopicId(e.target.value)}
            className="min-h-[48px] w-full rounded-xl border border-kal-border bg-kal-card-muted px-4 py-3 text-kal-text transition-colors duration-200 focus:border-kal-accent/40 focus:outline-none focus:ring-2 focus:ring-kal-accent/20 disabled:opacity-50"
            disabled={!chapter}
          >
            <option value="">— Microtopic —</option>
            {microOptions.map((m) => (
              <option key={m.id} value={m.id}>
                {m.microtopic}
              </option>
            ))}
          </select>
          <button
            type="button"
            disabled={!microtopicId}
            onClick={() => setStep(4)}
            className="mt-auto flex min-h-[52px] items-center justify-center gap-2 rounded-2xl bg-kal-accent py-3.5 text-sm font-semibold text-kal-accent-foreground shadow-sm transition-opacity duration-200 disabled:opacity-40"
          >
            Continue
            <ArrowRight className="h-4 w-4" />
          </button>
        </section>
      )}

      {step === 4 && (
        <section className="flex flex-1 flex-col gap-6">
          <div className="flex items-center gap-2">
            <CalendarDays className="h-6 w-6 text-kal-accent" />
            <div>
              <h1 className="text-xl font-bold tracking-tight text-kal-text">
                What are you conquering today?
              </h1>
              <p className="text-sm leading-relaxed text-kal-text-secondary">
                Set 3 non-negotiable targets in your head — start by locking your
                first block on the calendar. Execution beats intention.
              </p>
            </div>
          </div>
          <div>
            <label className="text-xs font-semibold text-kal-text-secondary">
              Date
            </label>
            <input
              type="date"
              value={planDate}
              onChange={(e) => setPlanDate(e.target.value)}
              className="mt-2 min-h-[48px] w-full rounded-xl border border-kal-border bg-kal-card-muted px-4 py-3 text-kal-text transition-colors duration-200 [color-scheme:light] focus:border-kal-accent/40 focus:outline-none focus:ring-2 focus:ring-kal-accent/20 dark:[color-scheme:dark]"
            />
          </div>
          <div>
            <label className="text-xs font-semibold text-kal-text-secondary">
              Est. minutes
            </label>
            <input
              type="number"
              min={0}
              value={estMinutes}
              onChange={(e) => setEstMinutes(e.target.value)}
              className="mt-2 min-h-[48px] w-full rounded-xl border border-kal-border bg-kal-card-muted px-4 py-3 text-kal-text transition-colors duration-200 focus:border-kal-accent/40 focus:outline-none focus:ring-2 focus:ring-kal-accent/20"
            />
          </div>
          {error && (
            <p className="text-sm font-medium text-red-700 dark:text-rose-200">
              {error}
            </p>
          )}
          <button
            type="button"
            disabled={busy}
            onClick={() => void createFirstTask()}
            className="mt-auto flex min-h-[52px] items-center justify-center gap-2 rounded-2xl bg-kal-accent py-3.5 text-sm font-semibold text-kal-accent-foreground shadow-sm transition-opacity duration-200 disabled:opacity-50"
          >
            {busy ? "Locking in…" : "Lock first target"}
            <Sparkles className="h-4 w-4" />
          </button>
        </section>
      )}

      {step === 5 && (
        <section className="flex flex-1 flex-col items-center justify-center gap-8 text-center">
          <CheckCircle2 className="h-16 w-16 text-kal-accent" aria-hidden />
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-kal-text">
              Commitment sealed
            </h1>
            <p className="mt-2 text-sm leading-relaxed text-kal-text-secondary">
              Home is your arena — start timers, conquer blocks, and let every
              checkbox prove you executed. No more drift.
            </p>
          </div>
          <div className="flex w-full flex-col gap-3">
            <button
              type="button"
              onClick={finish}
              className="flex min-h-[52px] items-center justify-center gap-2 rounded-2xl border border-kal-border bg-kal-card py-3.5 text-sm font-bold text-kal-text kal-shadow-card transition-opacity duration-200 hover:bg-kal-card-muted"
            >
              <Flag className="h-4 w-4" />
              Enter the Arena
            </button>
            <Link
              href="/plan"
              className="text-center text-sm text-kal-accent/90 underline-offset-4 hover:underline"
            >
              Or open the full planner
            </Link>
          </div>
        </section>
      )}
    </div>
  );
}

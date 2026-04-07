"use client";

import {
  ArrowRight,
  CalendarDays,
  ChevronLeft,
  Target,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";

import { upsertUserProfile } from "@/actions/profile";
import {
  EXAMS_CATALOG_FALLBACK,
  dedupeExamsCatalogForUi,
  fetchExamsCatalog,
  type ExamCatalogRow,
} from "@/lib/examsCatalog";
import { KALNEHI_PROFILE_UPDATED_EVENT } from "@/lib/profileEvents";
import { getSupabaseBrowserClient } from "@/lib/supabase";
import { formatSupabaseError } from "@/lib/supabase";
import { useOnboardingStore } from "@/store/useOnboardingStore";
const STEPS = 2;

export function OnboardingWizard() {
  const router = useRouter();
  const setCompleted = useOnboardingStore((s) => s.setOnboardingCompleted);

  const [step, setStep] = useState(1);
  const [examDate, setExamDate] = useState("");
  const [examOptions, setExamOptions] = useState<ExamCatalogRow[]>(() =>
    dedupeExamsCatalogForUi(EXAMS_CATALOG_FALLBACK),
  );
  const [primaryExam, setPrimaryExam] = useState("NEET UG");
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
      const exam = primaryExam.trim();
      if (!exam) {
        setError("Choose your target exam.");
        return;
      }
      const res = await upsertUserProfile({
        full_name: null,
        target_exam_date: examDate.trim(),
        primary_exam: exam,
        target_exam: exam,
        cuet_domain_subjects: [],
      });
      if (!res.ok) throw new Error(res.error);
      window.dispatchEvent(new Event(KALNEHI_PROFILE_UPDATED_EVENT));
      setCompleted(true);
      router.replace("/");
      router.refresh();
    } catch (e) {
      setError(formatSupabaseError(e));
    } finally {
      setBusy(false);
    }
  }, [examDate, primaryExam, router, setCompleted]);

  return (
    <div className="mx-auto flex min-h-[min(100dvh,720px)] max-w-lg flex-col px-4 py-8">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-x-3 gap-y-2">
        <p className="text-[10px] font-bold uppercase tracking-[0.35em] text-kal-accent">
          Setup · {step}/{STEPS}
        </p>
        <div className="ml-auto flex flex-wrap items-center justify-end gap-2">
          {step <= STEPS && (
            <button
              type="button"
              onClick={() => skipToDashboard()}
              disabled={busy}
              className="rounded-lg px-2 py-1.5 text-xs font-semibold text-kal-text-secondary underline-offset-4 transition-colors hover:text-kal-accent disabled:opacity-40"
            >
              Skip to dashboard
            </button>
          )}
          {step <= STEPS && (
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

      {step <= STEPS && (
        <p className="mb-6 text-center text-[11px] leading-relaxed text-kal-text-secondary">
          Quick setup takes two steps. You can update exam preferences and subjects
          anytime later in Profile.
        </p>
      )}

      {step === 1 && (
        <section className="flex flex-1 flex-col gap-6">
          <div className="flex items-center gap-2">
            <Target className="h-6 w-6 text-kal-accent" />
            <div>
              <h1 className="text-xl font-bold tracking-tight text-kal-text">
                Select target exam
              </h1>
              <p className="text-sm leading-relaxed text-kal-text-secondary">
                Choose the exam you&apos;re preparing for.
              </p>
            </div>
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
          <button
            type="button"
            disabled={busy || !primaryExam.trim()}
            onClick={() => {
              setError(null);
              setStep(2);
            }}
            className="mt-auto flex min-h-[52px] items-center justify-center gap-2 rounded-2xl bg-kal-accent py-3.5 text-sm font-semibold text-kal-accent-foreground shadow-sm transition-opacity duration-200 disabled:opacity-50"
          >
            Continue
            <ArrowRight className="h-4 w-4" />
          </button>
        </section>
      )}

      {step === 2 && (
        <section className="flex flex-1 flex-col gap-6">
          <div className="flex items-center gap-2">
            <CalendarDays className="h-6 w-6 text-kal-accent" />
            <div>
              <h1 className="text-xl font-bold tracking-tight text-kal-text">
                Select expected exam date
              </h1>
              <p className="text-sm leading-relaxed text-kal-text-secondary">
                Set your target date to personalize your dashboard.
              </p>
            </div>
          </div>
          <div>
            <label className="text-xs font-semibold text-kal-text-secondary">
              Expected exam date
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
            {busy ? "Saving…" : "Finish setup"}
            <ArrowRight className="h-4 w-4" />
          </button>
          <p className="text-xs text-kal-text-secondary">
            After this, you&apos;ll land directly on the dashboard.
          </p>
        </section>
      )}
    </div>
  );
}

"use client";

import {
  ArrowRight,
  CalendarDays,
  ChevronLeft,
  GraduationCap,
  Phone,
  Target,
  User,
} from "lucide-react";

import { OnboardingStepIllustration } from "@/components/illustrations/OnboardingStepIllustration";
import { useCallback, useEffect, useState } from "react";

import { completeOnboarding } from "@/actions/profile";
import { GroupedExamSelect } from "@/components/profile/GroupedExamSelect";
import { UpscOptionalSubjectPick } from "@/components/profile/UpscOptionalSubjectPick";
import {
  EXAMS_CATALOG_FALLBACK,
  dedupeExamsCatalogForUi,
  fetchExamsCatalog,
  type ExamCatalogRow,
} from "@/lib/examsCatalog";
import { toUserFacingMessage } from "@/lib/userFacingErrors";
import { getSupabaseBrowserClient } from "@/lib/supabase";
import {
  isUpscCseMainsExam,
} from "@/lib/upscMainsOptionalSubjects";
import { useOnboardingStore } from "@/store/useOnboardingStore";

const STEPS = 3;

const CLASS_OPTIONS = [
  "Class 10",
  "Class 11",
  "Class 12",
  "Dropper (1st year)",
  "Dropper (2nd year+)",
  "Graduate / Working",
];

export function OnboardingWizard() {
  const setLocalCompleted = useOnboardingStore((s) => s.setOnboardingCompleted);

  const [step, setStep] = useState(1);
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [classStudying, setClassStudying] = useState("");
  const [examDate, setExamDate] = useState("");
  const [examOptions, setExamOptions] = useState<ExamCatalogRow[]>(() =>
    dedupeExamsCatalogForUi(EXAMS_CATALOG_FALLBACK),
  );
  const [primaryExam, setPrimaryExam] = useState("NEET UG");
  const [upscOptionalSubjectOptions, setUpscOptionalSubjectOptions] = useState<string[]>([]);
  const [upscOptionalSubject, setUpscOptionalSubject] = useState("");
  const [loadingUpscOptionals, setLoadingUpscOptionals] = useState(false);
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

  useEffect(() => {
    if (!isUpscCseMainsExam(primaryExam)) {
      setUpscOptionalSubject("");
      return;
    }
    let cancelled = false;
    setLoadingUpscOptionals(true);
    void (async () => {
      try {
        const supabase = getSupabaseBrowserClient();
        const { data, error: queryError } = await supabase
          .rpc("upsc_cse_mains_optional_subjects");
        if (queryError) throw queryError;
        if (cancelled) return;
        setUpscOptionalSubjectOptions(
          (data ?? []).map((r) => r.base_name).filter(Boolean),
        );
      } catch {
        if (!cancelled) setUpscOptionalSubjectOptions([]);
      } finally {
        if (!cancelled) setLoadingUpscOptionals(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [primaryExam]);

  const goNext = useCallback(() => {
    setError(null);
    setStep((s) => Math.min(STEPS, s + 1));
  }, []);

  const validateStep1 = useCallback(() => {
    if (!fullName.trim()) {
      setError("Please enter your name.");
      return;
    }
    if (!phone.trim() || !/^\d{10}$/.test(phone.trim())) {
      setError("Enter a valid 10-digit phone number.");
      return;
    }
    if (!classStudying) {
      setError("Please select your class.");
      return;
    }
    goNext();
  }, [fullName, phone, classStudying, goNext]);

  const validateStep2 = useCallback(() => {
    if (!primaryExam.trim()) {
      setError("Choose your target exam.");
      return;
    }
    goNext();
  }, [primaryExam, goNext]);

  const submitProfile = useCallback(async () => {
    if (!examDate.trim()) {
      setError("Set your D-day — the exam doesn't wait.");
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const res = await completeOnboarding({
        full_name: fullName.trim(),
        phone_number: phone.trim(),
        class_studying: classStudying,
        primary_exam: primaryExam.trim(),
        target_exam_date: examDate.trim(),
        upsc_optional_subject: isUpscCseMainsExam(primaryExam)
          ? (upscOptionalSubject || null)
          : null,
      });
      if (!res.ok) throw new Error(res.error);
      setLocalCompleted(true);
      window.location.assign("/pricing");
    } catch (e) {
      setError(toUserFacingMessage(e));
    } finally {
      setBusy(false);
    }
  }, [
    fullName,
    phone,
    classStudying,
    primaryExam,
    examDate,
    upscOptionalSubject,
    setLocalCompleted,
  ]);

  const displayStep = step;
  const totalStepsDisplay = STEPS;

  return (
    <div className="kal-page-bg mx-auto flex min-h-0 w-full max-w-lg flex-1 flex-col px-4 py-4 sm:py-6">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-x-3 gap-y-2">
        <p className="text-[10px] font-bold uppercase tracking-[0.35em] text-kal-accent">
          Setup · {displayStep}/{totalStepsDisplay}
        </p>
        <div className="mt-2 h-1 w-full overflow-hidden rounded-full bg-kal-border/60">
          <div
            className="h-full rounded-full bg-gradient-to-r from-kal-accent to-[var(--kal-accent-dark)] transition-[width] duration-500 ease-out"
            style={{ width: `${(displayStep / totalStepsDisplay) * 100}%` }}
          />
        </div>
        {step > 1 && (
          <button
            type="button"
            onClick={() => {
              setError(null);
              setStep((s) => Math.max(1, s - 1));
            }}
            disabled={busy}
            className="ml-auto inline-flex items-center gap-1 rounded-lg px-2 py-1.5 text-xs font-medium text-kal-text-secondary hover:text-kal-accent disabled:pointer-events-none disabled:opacity-30"
          >
            <ChevronLeft className="h-4 w-4" />
            Back
          </button>
        )}
      </div>

      <p className="mb-6 text-center text-[11px] leading-relaxed text-kal-text-secondary">
        Quick setup takes {totalStepsDisplay} steps. This helps us personalise your daily plan.
      </p>

      {step === 1 && (
        <section className="kal-glass-panel flex flex-1 flex-col gap-5 rounded-2xl p-5 sm:p-6">
          <OnboardingStepIllustration step={1} className="mx-auto w-full max-w-[200px] opacity-90" />
          <div className="flex items-center gap-2">
            <User className="h-6 w-6 text-kal-accent" />
            <div>
              <h1 className="kal-feature-title">
                About you
              </h1>
              <p className="text-sm leading-relaxed text-kal-text-secondary">
                Tell us a bit about yourself.
              </p>
            </div>
          </div>

          <div>
            <label className="text-xs font-semibold text-kal-text-secondary">
              Full name
            </label>
            <input
              type="text"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              placeholder="Your name"
              className="mt-2 min-h-[48px] w-full rounded-xl border border-kal-border bg-kal-card-muted px-4 py-3 text-base text-kal-text transition-colors duration-200 focus:border-kal-accent/40 focus:outline-none focus:ring-2 focus:ring-kal-accent/20"
            />
          </div>

          <div>
            <label className="flex items-center gap-1.5 text-xs font-semibold text-kal-text-secondary">
              <Phone className="h-3.5 w-3.5" />
              Phone number
            </label>
            <input
              type="tel"
              inputMode="numeric"
              maxLength={10}
              value={phone}
              onChange={(e) => setPhone(e.target.value.replace(/\D/g, ""))}
              placeholder="10-digit mobile number"
              className="mt-2 min-h-[48px] w-full rounded-xl border border-kal-border bg-kal-card-muted px-4 py-3 text-base text-kal-text transition-colors duration-200 focus:border-kal-accent/40 focus:outline-none focus:ring-2 focus:ring-kal-accent/20"
            />
          </div>

          <div>
            <label className="flex items-center gap-1.5 text-xs font-semibold text-kal-text-secondary">
              <GraduationCap className="h-3.5 w-3.5" />
              Class / Year
            </label>
            <select
              value={classStudying}
              onChange={(e) => setClassStudying(e.target.value)}
              className="mt-2 min-h-[48px] w-full rounded-xl border border-kal-border bg-kal-card-muted px-4 py-3 text-base text-kal-text transition-colors duration-200 focus:border-kal-accent/40 focus:outline-none focus:ring-2 focus:ring-kal-accent/20"
            >
              <option value="">Select your class</option>
              {CLASS_OPTIONS.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </div>

          {error && (
            <p className="text-sm font-medium text-kal-accent-dark dark:text-kal-accent">
              {error}
            </p>
          )}

          <button
            type="button"
            onClick={validateStep1}
            disabled={busy}
            className="kal-btn-accent mt-auto flex min-h-[52px] items-center justify-center gap-2 rounded-2xl py-3.5 text-sm font-semibold disabled:opacity-50"
          >
            Continue
            <ArrowRight className="h-4 w-4" />
          </button>
        </section>
      )}

      {step === 2 && (
        <section className="kal-glass-panel flex flex-1 flex-col gap-6 rounded-2xl p-5 sm:p-6">
          <OnboardingStepIllustration step={2} className="mx-auto w-full max-w-[200px] opacity-90" />
          <div className="flex items-center gap-2">
            <Target className="h-6 w-6 text-kal-accent" />
            <div>
              <h1 className="kal-feature-title">
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
            <div className="mt-2">
              <GroupedExamSelect
                id="onboarding-target-exam"
                value={primaryExam}
                onChange={setPrimaryExam}
                options={examOptions}
                className="min-h-[48px] w-full rounded-xl border border-kal-border bg-kal-card-muted px-4 py-3 text-base text-kal-text transition-colors duration-200 focus:border-kal-accent/40 focus:outline-none focus:ring-2 focus:ring-kal-accent/20"
              />
            </div>
          </div>
          {isUpscCseMainsExam(primaryExam) ? (
            <div>
              <p className="text-xs font-semibold text-kal-text-secondary">
                Optional Subject (if any)
              </p>
              <p className="mt-1 text-xs text-kal-text-secondary">
                Optional. Leave as <strong>None</strong> if you are not selecting one now.
              </p>
              <div className="mt-2">
                {loadingUpscOptionals ? (
                  <p className="text-xs text-kal-text-secondary">
                    Loading optional subjects...
                  </p>
                ) : (
                  <UpscOptionalSubjectPick
                    options={upscOptionalSubjectOptions}
                    selected={upscOptionalSubject}
                    onChange={setUpscOptionalSubject}
                    disabled={busy}
                  />
                )}
              </div>
            </div>
          ) : null}

          {error && (
            <p className="text-sm font-medium text-kal-accent-dark dark:text-kal-accent">
              {error}
            </p>
          )}

          <button
            type="button"
            disabled={busy || !primaryExam.trim()}
            onClick={validateStep2}
            className="kal-btn-accent mt-auto flex min-h-[52px] items-center justify-center gap-2 rounded-2xl py-3.5 text-sm font-semibold disabled:opacity-50"
          >
            Continue
            <ArrowRight className="h-4 w-4" />
          </button>
        </section>
      )}

      {step === 3 && (
        <section className="kal-glass-panel flex flex-1 flex-col gap-6 rounded-2xl p-5 sm:p-6">
          <OnboardingStepIllustration step={3} className="mx-auto w-full max-w-[200px] opacity-90" />
          <div className="flex items-center gap-2">
            <CalendarDays className="h-6 w-6 text-kal-accent" />
            <div>
              <h1 className="kal-feature-title">
                Expected exam date
              </h1>
              <p className="text-sm leading-relaxed text-kal-text-secondary">
                Set your target date to personalise your dashboard.
              </p>
            </div>
          </div>
          <div className="min-w-0 max-w-full overflow-hidden">
            <label className="text-xs font-semibold text-kal-text-secondary">
              Expected exam date
            </label>
            <input
              type="date"
              value={examDate}
              onChange={(e) => setExamDate(e.target.value)}
              className="mt-2 box-border min-h-[48px] w-full min-w-0 max-w-full rounded-xl border border-kal-border bg-kal-card-muted px-4 py-3 text-kal-text transition-colors duration-200 [color-scheme:light] focus:border-kal-accent/40 focus:outline-none focus:ring-2 focus:ring-kal-accent/20 dark:[color-scheme:dark]"
            />
          </div>
          {error && (
            <p className="text-sm font-medium text-kal-accent-dark dark:text-kal-accent">
              {error}
            </p>
          )}
          <button
            type="button"
            disabled={busy}
            onClick={() => void submitProfile()}
            className="kal-btn-accent mt-auto flex min-h-[52px] items-center justify-center gap-2 rounded-2xl py-3.5 text-sm font-semibold disabled:opacity-50"
          >
            {busy ? "Saving…" : "Continue"}
            <ArrowRight className="h-4 w-4" />
          </button>
        </section>
      )}
    </div>
  );
}

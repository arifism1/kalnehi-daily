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
import { useCallback, useEffect, useState } from "react";

import { completeOnboarding } from "@/actions/profile";
import {
  EXAMS_CATALOG_FALLBACK,
  dedupeExamsCatalogForUi,
  fetchExamsCatalog,
  type ExamCatalogRow,
} from "@/lib/examsCatalog";
import { getSupabaseBrowserClient } from "@/lib/supabase";
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
      });
      if (!res.ok) throw new Error(res.error);
      setLocalCompleted(true);
      window.location.assign("/");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong.");
    } finally {
      setBusy(false);
    }
  }, [fullName, phone, classStudying, primaryExam, examDate, setLocalCompleted]);

  return (
    <div className="mx-auto flex min-h-[min(100dvh,720px)] max-w-lg flex-col px-4 py-8">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-x-3 gap-y-2">
        <p className="text-[10px] font-bold uppercase tracking-[0.35em] text-kal-accent">
          Setup · {step}/{STEPS}
        </p>
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
        Quick setup takes {STEPS} steps. This helps us personalise your daily plan.
      </p>

      {step === 1 && (
        <section className="flex flex-1 flex-col gap-5">
          <div className="flex items-center gap-2">
            <User className="h-6 w-6 text-kal-accent" />
            <div>
              <h1 className="text-xl font-bold tracking-tight text-kal-text">
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
              className="mt-2 min-h-[48px] w-full rounded-xl border border-kal-border bg-kal-card-muted px-4 py-3 text-[15px] text-kal-text transition-colors duration-200 focus:border-kal-accent/40 focus:outline-none focus:ring-2 focus:ring-kal-accent/20"
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
              className="mt-2 min-h-[48px] w-full rounded-xl border border-kal-border bg-kal-card-muted px-4 py-3 text-[15px] text-kal-text transition-colors duration-200 focus:border-kal-accent/40 focus:outline-none focus:ring-2 focus:ring-kal-accent/20"
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
              className="mt-2 min-h-[48px] w-full rounded-xl border border-kal-border bg-kal-card-muted px-4 py-3 text-[15px] text-kal-text transition-colors duration-200 focus:border-kal-accent/40 focus:outline-none focus:ring-2 focus:ring-kal-accent/20"
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
            <p className="text-sm font-medium text-red-700 dark:text-rose-200">
              {error}
            </p>
          )}

          <button
            type="button"
            onClick={validateStep1}
            disabled={busy}
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

          {error && (
            <p className="text-sm font-medium text-red-700 dark:text-rose-200">
              {error}
            </p>
          )}

          <button
            type="button"
            disabled={busy || !primaryExam.trim()}
            onClick={validateStep2}
            className="mt-auto flex min-h-[52px] items-center justify-center gap-2 rounded-2xl bg-kal-accent py-3.5 text-sm font-semibold text-kal-accent-foreground shadow-sm transition-opacity duration-200 disabled:opacity-50"
          >
            Continue
            <ArrowRight className="h-4 w-4" />
          </button>
        </section>
      )}

      {step === 3 && (
        <section className="flex flex-1 flex-col gap-6">
          <div className="flex items-center gap-2">
            <CalendarDays className="h-6 w-6 text-kal-accent" />
            <div>
              <h1 className="text-xl font-bold tracking-tight text-kal-text">
                Expected exam date
              </h1>
              <p className="text-sm leading-relaxed text-kal-text-secondary">
                Set your target date to personalise your dashboard.
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
            onClick={() => void submitProfile()}
            className="mt-auto flex min-h-[52px] items-center justify-center gap-2 rounded-2xl bg-kal-accent py-3.5 text-sm font-semibold text-kal-accent-foreground shadow-sm transition-opacity duration-200 disabled:opacity-50"
          >
            {busy ? "Saving…" : "Finish setup"}
            <ArrowRight className="h-4 w-4" />
          </button>
        </section>
      )}
    </div>
  );
}

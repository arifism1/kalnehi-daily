"use client";

import {
  ArrowRight,
  CalendarDays,
  ChevronLeft,
  GraduationCap,
  Layers,
  Phone,
  User,
} from "lucide-react";

import { OnboardingStepIllustration } from "@/components/illustrations/OnboardingStepIllustration";
import { TrackConfirmation, TrackPicker } from "@/components/onboarding/TrackPicker";
import { useCallback, useEffect, useId, useState } from "react";

import { completeOnboarding } from "@/actions/profile";
import { ensureFreeTrialStarted } from "@/actions/subscription";
import { trackActivity } from "@/lib/activity";
import { JourneyAction } from "@/lib/analytics/journeyEvents";
import { trackMetaFreeTrialStarted } from "@/lib/analytics";
import type { ExamTrack } from "@/lib/examTracks";
import {
  EXAMS_CATALOG_FALLBACK,
  dedupeExamsCatalogForUi,
  displayNameForExamCatalog,
  fetchExamsCatalog,
  type ExamCatalogRow,
} from "@/lib/examsCatalog";
import { toUserFacingMessage } from "@/lib/userFacingErrors";
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

/** Step 2 has two sub-phases: picking a track, then confirming it. */
type Step2Phase = "pick" | "confirm";

export function OnboardingWizard() {
  const uid = useId();
  const setLocalCompleted = useOnboardingStore((s) => s.setOnboardingCompleted);

  const [step, setStep] = useState(1);
  const [step2Phase, setStep2Phase] = useState<Step2Phase>("pick");
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [classStudying, setClassStudying] = useState("");
  /** Per `exam_name` key — only exams with a non-empty value are sent. */
  const [examDatesByKey, setExamDatesByKey] = useState<Record<string, string>>({});
  const [catalog, setCatalog] = useState<ExamCatalogRow[]>(() =>
    dedupeExamsCatalogForUi(EXAMS_CATALOG_FALLBACK),
  );
  const [selectedTrack, setSelectedTrack] = useState<ExamTrack | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    void (async () => {
      const supabase = getSupabaseBrowserClient();
      const rows = await fetchExamsCatalog(supabase);
      setCatalog(rows);
    })();
  }, []);

  useEffect(() => {
    trackActivity(JourneyAction.ONBOARDING_STARTED, { feature: "onboarding", page: "/onboarding" });
  }, []);

  useEffect(() => {
    trackActivity(JourneyAction.ONBOARDING_STEP, {
      feature: "onboarding",
      page: "/onboarding",
      metadata: { step },
    });
  }, [step]);

  useEffect(() => {
    if (!selectedTrack) {
      setExamDatesByKey({});
      return;
    }
    setExamDatesByKey((prev) => {
      const next: Record<string, string> = {};
      for (const k of selectedTrack.examNames) {
        if (prev[k] !== undefined) next[k] = prev[k]!;
      }
      return next;
    });
  }, [selectedTrack?.id]);

  const goNext = useCallback(() => {
    setError(null);
    setStep((s) => Math.min(STEPS, s + 1));
  }, []);

  const validateStep1 = useCallback(() => {
    if (!fullName.trim()) {
      setError("Please enter your name.");
      return;
    }
    const trimmedPhone = phone.trim();
    if (trimmedPhone && !/^\d{10}$/.test(trimmedPhone)) {
      setError("Enter a valid 10-digit phone number, or leave blank.");
      return;
    }
    if (!classStudying) {
      setError("Please select your class.");
      return;
    }
    goNext();
  }, [fullName, phone, classStudying, goNext]);

  const confirmTrack = useCallback(() => {
    if (!selectedTrack) {
      setError("Please choose a track.");
      return;
    }
    setError(null);
    setStep2Phase("confirm");
    trackActivity(JourneyAction.EXAM_SELECTED, {
      feature: "onboarding",
      page: "/onboarding",
      metadata: { track_id: selectedTrack.id },
    });
  }, [selectedTrack]);

  const validateStep2 = useCallback(() => {
    if (!selectedTrack) {
      setError("Please choose a track.");
      return;
    }
    goNext();
  }, [selectedTrack, goNext]);

  const submitProfile = useCallback(async () => {
    if (!selectedTrack) {
      setError("Please choose a track.");
      return;
    }
    for (const key of selectedTrack.examNames) {
      const raw = (examDatesByKey[key] ?? "").trim();
      if (raw && !/^\d{4}-\d{2}-\d{2}$/.test(raw)) {
        setError("Use a valid date for each field you fill in, or leave it blank.");
        return;
      }
    }
    const exam_dates: Record<string, string> = {};
    for (const key of selectedTrack.examNames) {
      const v = (examDatesByKey[key] ?? "").trim();
      if (v) exam_dates[key] = v;
    }
    setBusy(true);
    setError(null);
    try {
      const res = await completeOnboarding({
        full_name: fullName.trim(),
        phone_number: phone.trim(),
        class_studying: classStudying,
        selected_track: selectedTrack.id,
        enabled_exams_in_track: selectedTrack.examNames,
        exam_dates: Object.keys(exam_dates).length > 0 ? exam_dates : null,
      });
      if (!res.ok) throw new Error(res.error);
      trackActivity(JourneyAction.ONBOARDING_COMPLETED, {
        feature: "onboarding",
        page: "/onboarding",
        metadata: { track_id: selectedTrack.id },
      });
      setLocalCompleted(true);

      // Start the free trial immediately — if the daily cap is hit, redirect
      // straight to the position page with no intermediate screen.
      const trial = await ensureFreeTrialStarted();
      if (!trial.ok && trial.error === "daily_cap_reached") {
        const capResult = trial as {
          ok: false;
          error: "daily_cap_reached";
          position: number;
          opensAt: string;
          queuedFor: string;
        };
        sessionStorage.setItem(
          "wl_position",
          JSON.stringify({
            position: capResult.position,
            opensAt: capResult.opensAt,
            aheadCount: Math.max(0, capResult.position - 1),
          }),
        );
        window.location.assign("/waitlist/position");
        return;
      }
      if (trial.ok && trial.started) trackMetaFreeTrialStarted();
      window.location.assign("/home");
    } catch (e) {
      setError(toUserFacingMessage(e));
    } finally {
      setBusy(false);
    }
  }, [fullName, phone, classStudying, selectedTrack, examDatesByKey, setLocalCompleted]);

  const displayStep = step;
  const totalStepsDisplay = STEPS;

  return (
    <div className="kal-page-bg mx-auto flex min-h-0 w-full max-w-lg flex-1 flex-col p-4 sm:py-6">
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
        {(step > 1 || (step === 2 && step2Phase === "confirm")) && (
          <button
            type="button"
            onClick={() => {
              setError(null);
              if (step === 2 && step2Phase === "confirm") {
                setStep2Phase("pick");
              } else {
                setStep((s) => Math.max(1, s - 1));
                setStep2Phase("pick");
              }
            }}
            disabled={busy}
            className="ml-auto inline-flex items-center gap-1 rounded-lg px-2 py-1.5 text-xs font-medium text-kal-text-secondary hover:text-kal-accent disabled:pointer-events-none disabled:opacity-30"
          >
            <ChevronLeft className="size-4" />
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
            <User className="size-6 text-kal-accent" />
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
            <label htmlFor={`${uid}-name`} className="text-xs font-semibold text-kal-text-secondary">
              Full name
            </label>
            <input
              id={`${uid}-name`}
              type="text"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              placeholder="Your name"
              className="mt-2 min-h-[48px] w-full rounded-xl border border-kal-border bg-kal-card-muted px-4 py-3 text-base text-kal-text transition-colors duration-200 focus:border-kal-accent/40 focus:outline-none focus:ring-2 focus:ring-kal-accent/20"
            />
          </div>

          <div>
            <label htmlFor={`${uid}-phone`} className="flex items-center gap-1.5 text-xs font-semibold text-kal-text-secondary">
              <Phone className="size-3.5" />
              Phone number (optional)
            </label>
            <input
              id={`${uid}-phone`}
              type="tel"
              inputMode="numeric"
              maxLength={10}
              value={phone}
              onChange={(e) => setPhone(e.target.value.replace(/\D/g, ""))}
              placeholder="10-digit mobile (optional)"
              className="mt-2 min-h-[48px] w-full rounded-xl border border-kal-border bg-kal-card-muted px-4 py-3 text-base text-kal-text transition-colors duration-200 focus:border-kal-accent/40 focus:outline-none focus:ring-2 focus:ring-kal-accent/20"
            />
          </div>

          <div>
            <label htmlFor={`${uid}-class`} className="flex items-center gap-1.5 text-xs font-semibold text-kal-text-secondary">
              <GraduationCap className="size-3.5" />
              Class / Year
            </label>
            <select
              id={`${uid}-class`}
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
            <ArrowRight className="size-4" />
          </button>
        </section>
      )}

      {step === 2 && (
        <section className="kal-glass-panel flex flex-1 flex-col gap-5 rounded-2xl p-5 sm:p-6">
          <OnboardingStepIllustration step={2} className="mx-auto w-full max-w-[200px] opacity-90" />
          <div className="flex items-center gap-2">
            <Layers className="size-6 text-kal-accent" />
            <div>
              <h1 className="kal-feature-title">
                {step2Phase === "confirm" ? "Confirm your track" : "Choose your track"}
              </h1>
              <p className="text-sm leading-relaxed text-kal-text-secondary">
                {step2Phase === "confirm"
                  ? "Review the exams in your track before continuing."
                  : "Select the exam track that matches your goal."}
              </p>
            </div>
          </div>

          {step2Phase === "pick" ? (
            <>
              <div className="flex-1 overflow-y-auto">
                <TrackPicker
                  selected={selectedTrack}
                  onSelect={(track) => {
                    setSelectedTrack(track);
                    setError(null);
                  }}
                  catalog={catalog}
                  disabled={busy}
                />
              </div>

              {error && (
                <p className="text-sm font-medium text-kal-accent-dark dark:text-kal-accent">
                  {error}
                </p>
              )}

              <button
                type="button"
                disabled={busy || !selectedTrack}
                onClick={confirmTrack}
                className="kal-btn-accent mt-auto flex min-h-[52px] items-center justify-center gap-2 rounded-2xl py-3.5 text-sm font-semibold disabled:opacity-50"
              >
                Continue
                <ArrowRight className="size-4" />
              </button>
            </>
          ) : (
            <>
              {selectedTrack && (
                <TrackConfirmation
                  track={selectedTrack}
                  catalog={catalog}
                  onConfirm={validateStep2}
                  onChange={() => {
                    setStep2Phase("pick");
                    setError(null);
                  }}
                  disabled={busy}
                />
              )}
              {error && (
                <p className="text-sm font-medium text-kal-accent-dark dark:text-kal-accent">
                  {error}
                </p>
              )}
            </>
          )}
        </section>
      )}

      {step === 3 && selectedTrack && (
        <section className="kal-glass-panel flex flex-1 flex-col gap-6 rounded-2xl p-5 sm:p-6">
          <OnboardingStepIllustration step={3} className="mx-auto w-full max-w-[200px] opacity-90" />
          <div className="flex items-center gap-2">
            <CalendarDays className="size-6 text-kal-accent" />
            <div>
              <h1 className="kal-feature-title">
                Target dates for your exams
              </h1>
              <p className="text-sm leading-relaxed text-kal-text-secondary">
                All optional — add a date only for the papers you already know, and skip
                the rest. You can change or add these anytime in Profile.
              </p>
            </div>
          </div>
          <div className="min-h-0 max-h-[min(52vh,22rem)] min-w-0 max-w-full space-y-3 overflow-y-auto pr-0.5">
            {selectedTrack.examNames.map((examKey) => {
              const label = displayNameForExamCatalog(examKey, catalog) || examKey;
              return (
                <div key={examKey} className="min-w-0 max-w-full overflow-hidden">
                  <label className="text-xs font-semibold text-kal-text-secondary">
                    {label}
                    <span className="ml-1.5 font-normal text-kal-text-secondary/80">
                      (optional)
                    </span>
                  </label>
                  <input
                    type="date"
                    value={examDatesByKey[examKey] ?? ""}
                    onChange={(e) => {
                      const v = e.target.value;
                      setExamDatesByKey((prev) => ({ ...prev, [examKey]: v }));
                    }}
                    className="mt-2 box-border min-h-[48px] w-full min-w-0 max-w-full rounded-xl border border-kal-border bg-kal-card-muted px-4 py-3 text-kal-text transition-colors duration-200 [color-scheme:light] focus:border-kal-accent/40 focus:outline-none focus:ring-2 focus:ring-kal-accent/20 dark:[color-scheme:dark]"
                  />
                </div>
              );
            })}
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
            <ArrowRight className="size-4" />
          </button>
        </section>
      )}
    </div>
  );
}

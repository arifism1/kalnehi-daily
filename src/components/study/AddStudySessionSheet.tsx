"use client";

import { X } from "lucide-react";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { StudyCameraPrivacyModal } from "@/components/study/StudyCameraPrivacyModal";
import { StudyCameraTracker } from "@/components/study/StudyCameraTracker";
import { applyOptimisticStudySessionCreate } from "@/lib/studySessionMutations";
import { useAuthStore } from "@/store/useAuthStore";
import { useSettingsStore } from "@/store/useSettingsStore";
import { useTaskStore } from "@/store/useTaskStore";

type Step = "subject" | "mode" | "claimed" | "camera";

type ClaimedUi = "quick" | "timer";

function formatClock(sec: number): string {
  const s = Math.max(0, Math.floor(sec));
  const m = Math.floor(s / 60);
  const r = s % 60;
  return `${m}:${String(r).padStart(2, "0")}`;
}

type Props = {
  open: boolean;
  onClose: () => void;
};

export function AddStudySessionSheet({ open, onClose }: Props) {
  const userId = useAuthStore((s) => s.user?.id);
  const studyCameraEnabled = useSettingsStore((s) => s.studyCameraEnabled);
  const studyCameraPrivacyAcknowledged = useSettingsStore(
    (s) => s.studyCameraPrivacyAcknowledged,
  );
  const setStudyCameraPrivacyAcknowledged = useSettingsStore(
    (s) => s.setStudyCameraPrivacyAcknowledged,
  );
  const tasksRecord = useTaskStore((s) => s.tasks);
  const microRecord = useTaskStore((s) => s.microtopics);

  const [step, setStep] = useState<Step>("subject");
  const [subject, setSubject] = useState("");
  const [claimedUi, setClaimedUi] = useState<ClaimedUi>("quick");
  const [minutesStr, setMinutesStr] = useState("");
  const [timerSec, setTimerSec] = useState(0);
  const timerSecRef = useRef(0);
  const [timerRunning, setTimerRunning] = useState(false);
  const [saving, setSaving] = useState(false);
  const [privacyGateOpen, setPrivacyGateOpen] = useState(false);

  const suggestions = useMemo(() => {
    const names = new Set<string>();
    for (const t of Object.values(tasksRecord)) {
      const n = t.name?.trim();
      if (n) names.add(n);
    }
    for (const m of Object.values(microRecord)) {
      if (m.subject?.trim()) names.add(m.subject.trim());
    }
    return Array.from(names).sort((a, b) => a.localeCompare(b)).slice(0, 80);
  }, [tasksRecord, microRecord]);

  useEffect(() => {
    if (!open) {
      setStep("subject");
      setSubject("");
      setClaimedUi("quick");
      setMinutesStr("");
      setTimerSec(0);
      timerSecRef.current = 0;
      timerStartIsoRef.current = null;
      setTimerRunning(false);
      setSaving(false);
      setPrivacyGateOpen(false);
    }
  }, [open]);

  const tryEnterCameraProven = useCallback(() => {
    if (!studyCameraEnabled) return;
    if (!studyCameraPrivacyAcknowledged) {
      setPrivacyGateOpen(true);
      return;
    }
    setStep("camera");
  }, [studyCameraEnabled, studyCameraPrivacyAcknowledged]);

  const onPrivacyGateContinue = useCallback(() => {
    setStudyCameraPrivacyAcknowledged(true);
    setPrivacyGateOpen(false);
    setStep("camera");
  }, [setStudyCameraPrivacyAcknowledged]);

  useEffect(() => {
    timerSecRef.current = timerSec;
  }, [timerSec]);

  useEffect(() => {
    if (!timerRunning) return;
    const id = window.setInterval(() => {
      setTimerSec((n) => {
        const next = n + 1;
        timerSecRef.current = next;
        return next;
      });
    }, 1000);
    return () => clearInterval(id);
  }, [timerRunning]);

  const subjectOk = subject.trim().length > 0;

  const logClaimed = useCallback(
    async (durationSeconds: number, startedAt: string, endedAt: string) => {
      if (!userId || durationSeconds < 1) return;
      setSaving(true);
      try {
        await applyOptimisticStudySessionCreate({
          id: crypto.randomUUID(),
          user_id: userId,
          subject: subject.trim(),
          duration_seconds: durationSeconds,
          is_camera_proven: false,
          started_at: startedAt,
          ended_at: endedAt,
        });
        onClose();
      } finally {
        setSaving(false);
      }
    },
    [userId, subject, onClose],
  );

  const onQuickLog = useCallback(async () => {
    const m = Number(minutesStr);
    if (!Number.isFinite(m) || m < 1 || m > 24 * 60) return;
    const dur = Math.round(m * 60);
    const ended = new Date();
    const started = new Date(ended.getTime() - dur * 1000);
    await logClaimed(dur, started.toISOString(), ended.toISOString());
  }, [minutesStr, logClaimed]);

  const timerStartIsoRef = useRef<string | null>(null);

  const startClaimedTimer = useCallback(() => {
    setTimerSec(0);
    timerSecRef.current = 0;
    setTimerRunning(true);
    timerStartIsoRef.current = new Date().toISOString();
  }, []);

  const endClaimedTimer = useCallback(async () => {
    setTimerRunning(false);
    const dur = timerSecRef.current;
    const started =
      timerStartIsoRef.current ??
      new Date(Date.now() - dur * 1000).toISOString();
    const ended = new Date().toISOString();
    timerStartIsoRef.current = null;
    if (dur < 1) return;
    await logClaimed(dur, started, ended);
  }, [logClaimed]);

  if (!open) return null;

  if (!userId) {
    return (
      <div className="fixed inset-0 z-[80] flex items-end justify-center sm:items-center">
        <button
          type="button"
          aria-label="Close"
          className="absolute inset-0 bg-black/65"
          onClick={onClose}
        />
        <div className="relative z-10 w-full max-w-lg rounded-t-2xl border border-kal-border bg-kal-card p-6 kal-shadow-card sm:rounded-2xl">
          <p className="text-sm text-kal-muted">Sign in to log study sessions.</p>
        </div>
      </div>
    );
  }

  return (
    <>
      <StudyCameraPrivacyModal
        open={privacyGateOpen}
        variant="session"
        onContinue={onPrivacyGateContinue}
        onDismiss={() => setPrivacyGateOpen(false)}
      />
      <div className="fixed inset-0 z-[80] flex items-end justify-center sm:items-center">
      {step !== "camera" ? (
        <button
          type="button"
          aria-label="Close"
          className="absolute inset-0 bg-black/65"
          onClick={onClose}
        />
      ) : (
        <div className="absolute inset-0 bg-black/65" aria-hidden />
      )}
      <div
        className="relative z-10 max-h-[min(92dvh,100%)] w-full max-w-lg overflow-y-auto rounded-t-2xl border border-kal-border bg-kal-card p-5 kal-shadow-card sm:max-h-[min(90vh,44rem)] sm:rounded-2xl sm:p-6"
        role="dialog"
        aria-modal="true"
      >
        {step === "camera" ? (
          <div className="space-y-3">
            <div className="flex items-center justify-between gap-2">
              <p className="text-[0.65rem] font-semibold uppercase tracking-widest text-kal-accent">
                Camera proven
              </p>
              <button
                type="button"
                onClick={onClose}
                className="rounded-xl p-2 text-kal-muted hover:bg-kal-card-muted"
                aria-label="Close"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <StudyCameraTracker
              subject={subject}
              userId={userId}
              onDone={onClose}
            />
          </div>
        ) : (
          <>
            <div className="flex items-start justify-between gap-2 border-b border-kal-border pb-3">
              <div>
                <p className="text-[0.65rem] font-semibold uppercase tracking-widest text-kal-muted">
                  Study session
                </p>
                <h2 className="mt-0.5 text-lg font-semibold text-kal-text">
                  {step === "subject"
                    ? "What are you studying?"
                    : step === "mode"
                      ? "How do you want to log time?"
                      : "Claimed time (no camera)"}
                </h2>
              </div>
              <button
                type="button"
                onClick={onClose}
                className="rounded-xl p-2 text-kal-muted hover:bg-kal-card-muted hover:text-kal-text"
                aria-label="Close"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {step === "subject" && (
              <div className="mt-5 space-y-4">
                <label className="block text-xs font-medium text-kal-muted">
                  Subject
                  <input
                    value={subject}
                    onChange={(e) => setSubject(e.target.value)}
                    list="study-session-subjects"
                    placeholder="Type or pick a task / subject"
                    className="mt-2 min-h-[52px] w-full rounded-2xl border border-kal-border bg-kal-input-bg px-4 text-base text-kal-text placeholder:text-kal-muted"
                  />
                </label>
                <datalist id="study-session-subjects">
                  {suggestions.map((s) => (
                    <option key={s} value={s} />
                  ))}
                </datalist>
                <button
                  type="button"
                  disabled={!subjectOk}
                  onClick={() => setStep("mode")}
                  className="flex w-full min-h-[52px] items-center justify-center rounded-2xl bg-kal-accent text-base font-semibold text-kal-accent-foreground hover:bg-kal-accent-hover disabled:opacity-40"
                >
                  Continue
                </button>
              </div>
            )}

            {step === "mode" && (
              <div className="mt-6 space-y-3">
                <button
                  type="button"
                  onClick={() => setStep("claimed")}
                  className="flex w-full min-h-[4.5rem] flex-col items-center justify-center rounded-2xl border-2 border-kal-border bg-kal-card-muted px-4 py-3 text-left transition-colors hover:border-kal-accent/40 hover:bg-kal-card"
                >
                  <span className="text-base font-bold text-kal-text">
                    Claimed time (no camera)
                  </span>
                  <span className="mt-1 text-xs text-kal-muted">
                    Enter minutes or use a manual timer
                  </span>
                </button>
                {studyCameraEnabled ? (
                  <button
                    type="button"
                    onClick={tryEnterCameraProven}
                    className="flex w-full min-h-[4.5rem] flex-col items-center justify-center rounded-2xl border-2 border-kal-accent/40 bg-kal-accent-soft px-4 py-3 text-left transition-colors hover:bg-kal-accent-soft dark:border-red-500/50 dark:bg-red-950/40 dark:hover:bg-red-950/60"
                  >
                    <span className="text-base font-bold text-red-900 dark:text-red-100">
                      Camera proven time
                    </span>
                    <span className="mt-1 text-xs text-red-800/90 dark:text-red-200/70">
                      On-device AI · video never uploaded
                    </span>
                  </button>
                ) : (
                  <div className="rounded-2xl border border-dashed border-kal-border bg-kal-card-muted px-4 py-4 text-center">
                    <p className="text-sm font-medium text-kal-text-secondary">
                      Camera proven time
                    </p>
                    <p className="mt-2 text-xs leading-relaxed text-kal-muted">
                      Turn on{" "}
                      <span className="font-medium text-kal-muted">
                        Enable Study Camera
                      </span>{" "}
                      in Settings first. Video stays on your device only—never
                      streamed or uploaded.
                    </p>
                    <Link
                      href="/settings"
                      className="mt-3 inline-flex min-h-[44px] items-center justify-center rounded-xl bg-kal-accent px-4 text-sm font-semibold text-kal-accent-foreground hover:bg-kal-accent-hover"
                    >
                      Open Settings
                    </Link>
                  </div>
                )}
                <button
                  type="button"
                  onClick={() => setStep("subject")}
                  className="w-full py-2 text-sm text-kal-muted hover:text-kal-text"
                >
                  Back
                </button>
              </div>
            )}

            {step === "claimed" && (
              <div className="mt-6 space-y-5">
                <div className="flex gap-2 rounded-xl bg-kal-card-muted p-1">
                  <button
                    type="button"
                    className={`min-h-[44px] flex-1 rounded-lg text-sm font-semibold ${
                      claimedUi === "quick"
                        ? "bg-kal-accent text-kal-accent-foreground"
                        : "text-kal-muted"
                    }`}
                    onClick={() => setClaimedUi("quick")}
                  >
                    Enter minutes
                  </button>
                  <button
                    type="button"
                    className={`min-h-[44px] flex-1 rounded-lg text-sm font-semibold ${
                      claimedUi === "timer"
                        ? "bg-kal-accent text-kal-accent-foreground"
                        : "text-kal-muted"
                    }`}
                    onClick={() => setClaimedUi("timer")}
                  >
                    Live timer
                  </button>
                </div>

                {claimedUi === "quick" && (
                  <div className="space-y-3">
                    <label className="block text-xs text-kal-muted">
                      Minutes studied
                      <input
                        type="number"
                        min={1}
                        max={1440}
                        inputMode="numeric"
                        value={minutesStr}
                        onChange={(e) => setMinutesStr(e.target.value)}
                        placeholder="e.g. 45"
                        className="mt-2 min-h-[52px] w-full rounded-2xl border border-kal-border bg-kal-input-bg px-4 text-lg text-kal-text"
                      />
                    </label>
                    <button
                      type="button"
                      disabled={saving}
                      onClick={() => void onQuickLog()}
                      className="flex w-full min-h-[52px] items-center justify-center rounded-2xl bg-kal-accent text-base font-semibold text-kal-accent-foreground hover:bg-kal-accent-hover disabled:opacity-50"
                    >
                      {saving ? "Saving…" : "Log session"}
                    </button>
                  </div>
                )}

                {claimedUi === "timer" && (
                  <div className="flex flex-col items-center py-4">
                    <p className="font-mono text-5xl font-bold tabular-nums text-kal-text">
                      {formatClock(timerSec)}
                    </p>
                    <div className="mt-6 flex flex-wrap justify-center gap-2">
                      {!timerRunning ? (
                        <button
                          type="button"
                          onClick={startClaimedTimer}
                          className="min-h-[52px] min-w-[10rem] rounded-2xl bg-kal-accent px-6 text-base font-semibold text-kal-accent-foreground hover:bg-kal-accent-hover"
                        >
                          Start
                        </button>
                      ) : (
                        <button
                          type="button"
                          disabled={saving}
                          onClick={() => void endClaimedTimer()}
                          className="min-h-[52px] min-w-[10rem] rounded-2xl border-2 border-rose-500/50 bg-rose-950/50 px-6 text-base font-semibold text-rose-100 disabled:opacity-50"
                        >
                          {saving ? "Saving…" : "End & log"}
                        </button>
                      )}
                    </div>
                  </div>
                )}

                <button
                  type="button"
                  onClick={() => setStep("mode")}
                  className="w-full py-2 text-sm text-kal-muted hover:text-kal-text"
                >
                  Back
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
    </>
  );
}

"use client";

import clsx from "clsx";
import { Loader2, Mic, MicOff, X } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { usePathname, useRouter } from "next/navigation";

import { insertDailyTask, updateDailyTask } from "@/actions/dailyPlan";
import { ScheduleRevisionReminderDialog } from "@/components/revision/ScheduleRevisionReminderDialog";
import { useAiGate } from "@/hooks/useAiGate";
import { useAuthStore } from "@/store/useAuthStore";
import { useDeviceSpeechRecognition } from "@/hooks/useDeviceSpeechRecognition";
import { useMediaRecorderVoice } from "@/hooks/useMediaRecorderVoice";
import { useVoiceCommandStore } from "@/store/useVoiceCommandStore";
import { fetchDailyPlanTasksForClient } from "@/lib/fetchDailyPlanTasksForClient";
import { VOICE_COMMAND_SILENCE_MS, VOICE_MAX_SESSION_MS } from "@/lib/voiceConstants";
import type { DailyTaskView } from "@/actions/dailyPlan";
import type { VoiceCommandIntent } from "@/lib/voiceCommandGroq";
import { VoiceListeningHint } from "@/components/voice/VoiceListeningHint";

// Example commands shown to the user while idle, to teach discoverability.
const COMMAND_HINTS = [
  "Go to daily plan",
  "Add task: review notes",
  "Mark completed: morning study",
  "Schedule revision for Physics",
  "Go to progress",
  "Ask prepbrain: explain Newton's laws",
  "Go to notifications",
  "Add task: evening exercise",
  "Go to syllabus",
];

// ─── Audio utilities ───────────────────────────────────────────────────────────

function playStartChime(): void {
  try {
    const AudioCtxClass =
      window.AudioContext ??
      (window as unknown as { webkitAudioContext?: typeof AudioContext })
        .webkitAudioContext;
    if (!AudioCtxClass) return;
    const ctx = new AudioCtxClass();
    const gain = ctx.createGain();
    gain.connect(ctx.destination);

    const notes: [number, number][] = [
      [440, 0],
      [660, 0.1],
    ];
    notes.forEach(([freq, start]) => {
      const osc = ctx.createOscillator();
      osc.type = "sine";
      osc.frequency.value = freq;
      osc.connect(gain);
      gain.gain.setValueAtTime(0.07, ctx.currentTime + start);
      gain.gain.exponentialRampToValueAtTime(
        0.001,
        ctx.currentTime + start + 0.09,
      );
      osc.start(ctx.currentTime + start);
      osc.stop(ctx.currentTime + start + 0.1);
    });
    setTimeout(() => ctx.close(), 600);
  } catch {
    // AudioContext unavailable — skip silently
  }
}

// ─── Utilities ─────────────────────────────────────────────────────────────────

function localISODate(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function fuzzyMatchTask(tasks: DailyTaskView[], subject: string): DailyTaskView | null {
  const needle = subject.toLowerCase().trim();

  const ordinals: Record<string, number> = {
    "first task": 0,
    "second task": 1,
    "third task": 2,
    "fourth task": 3,
    "fifth task": 4,
  };
  const ordinalIdx = ordinals[needle];
  if (ordinalIdx !== undefined) {
    const pending = tasks.filter((t) => t.status !== "completed");
    return pending[ordinalIdx] ?? tasks[ordinalIdx] ?? null;
  }

  return (
    tasks.find((t) => t.title.toLowerCase() === needle) ??
    tasks.find(
      (t) =>
        t.title.toLowerCase().includes(needle) ||
        needle.includes(t.title.toLowerCase()),
    ) ??
    null
  );
}

function shuffleArray<T>(arr: T[]): T[] {
  const out = [...arr];
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

// ─── AudioWaveform ──────────────────────────────────────────────────────────────

const WAVEFORM_BARS = [
  { frac: 0.38, delay: 0 },
  { frac: 0.72, delay: 0.12 },
  { frac: 1.0,  delay: 0.24 },
  { frac: 0.85, delay: 0.36 },
  { frac: 0.6,  delay: 0.18 },
  { frac: 0.9,  delay: 0.30 },
  { frac: 0.44, delay: 0.06 },
];

function AudioWaveform({ isListening }: { isListening: boolean }) {
  return (
    <div className="flex items-center justify-center gap-[3.5px] h-8" aria-hidden>
      {WAVEFORM_BARS.map(({ frac, delay }, i) => (
        <span
          key={i}
          className={clsx(
            "w-[3px] rounded-full bg-kal-accent",
            isListening ? "kal-voice-bar" : "opacity-20 transition-all duration-300",
          )}
          style={
            isListening
              ? ({
                  animationDelay: `${delay}s`,
                  "--bar-max-h": `${Math.round(frac * 26)}px`,
                } as React.CSSProperties)
              : { height: "3px" }
          }
        />
      ))}
    </div>
  );
}

// ─── CommandHints ───────────────────────────────────────────────────────────────

function CommandHints({ visible }: { visible: boolean }) {
  const [hints, setHints] = useState<string[]>(() =>
    shuffleArray(COMMAND_HINTS).slice(0, 3),
  );
  const [generation, setGeneration] = useState(0);

  useEffect(() => {
    if (!visible) return;
    const id = setInterval(() => {
      setHints(shuffleArray(COMMAND_HINTS).slice(0, 3));
      setGeneration((g) => g + 1);
    }, 4000);
    return () => clearInterval(id);
  }, [visible]);

  if (!visible) return null;

  return (
    <div key={generation} className="px-4 pb-4 kal-fade-in-fast">
      <p className="mb-2 text-[10px] font-semibold uppercase tracking-wider text-kal-text-secondary/50">
        Try saying
      </p>
      <div className="flex flex-wrap gap-1.5">
        {hints.map((h) => (
          <span
            key={h}
            className="rounded-lg border border-kal-accent/15 bg-kal-accent/[0.06] px-2.5 py-[3px] text-xs font-medium text-kal-accent/75"
          >
            &ldquo;{h}&rdquo;
          </span>
        ))}
      </div>
    </div>
  );
}

// ─── Sub-components ────────────────────────────────────────────────────────────

function QuotaGate({ voiceMinuteStatus }: { voiceMinuteStatus: string }) {
  const router = useRouter();
  const { close: closeSheet, reset } = useVoiceCommandStore();

  return (
    <div className="flex flex-col items-center gap-4 px-4 py-6">
      <div className="flex h-14 w-14 items-center justify-center rounded-full bg-amber-100 dark:bg-amber-950/40">
        <MicOff className="h-6 w-6 text-amber-600 dark:text-amber-400" aria-hidden />
      </div>
      <div className="text-center">
        <p className="text-sm font-semibold text-kal-text">Voice time used up</p>
        <p className="mt-0.5 text-xs text-kal-text-secondary">{voiceMinuteStatus}</p>
      </div>
      <button
        type="button"
        onClick={() => {
          closeSheet();
          reset();
          router.push("/my-subscription");
        }}
        className="w-full rounded-xl border border-kal-accent/30 bg-kal-accent-soft py-2 text-sm font-semibold text-kal-accent transition-colors hover:bg-kal-accent/15 active:scale-[0.98]"
      >
        Get more voice time →
      </button>
    </div>
  );
}

function ListeningState({
  isListening,
  transcript,
  voiceMinuteStatus,
  onStopListening,
  onStartListening,
  whisperMode = false,
}: {
  isListening: boolean;
  transcript: string | null;
  voiceMinuteStatus: string;
  onStopListening: () => void;
  onStartListening: () => void;
  /** True when recording via MediaRecorder (Whisper fallback) instead of Web Speech API. */
  whisperMode?: boolean;
}) {
  const showHints = !transcript && !whisperMode;
  const active = isListening || whisperMode;

  return (
    <div className="flex flex-col items-center gap-3 px-4 pt-5 pb-2">
      {/* Waveform */}
      <AudioWaveform isListening={active} />

      {/* Mic button */}
      <div className="relative">
        {active && (
          <span
            className="absolute inset-0 rounded-full bg-kal-accent/20 animate-ping"
            aria-hidden
          />
        )}
        <button
          type="button"
          onClick={active ? onStopListening : onStartListening}
          aria-label={active ? "Stop listening" : "Start listening"}
          className={clsx(
            "relative flex h-14 w-14 items-center justify-center rounded-full transition-all duration-200",
            active
              ? "bg-kal-accent text-white scale-105 shadow-[0_4px_20px_rgba(255,122,0,0.4)]"
              : "bg-kal-accent/85 text-white shadow-md hover:bg-kal-accent hover:scale-[1.04] hover:shadow-[0_4px_16px_rgba(255,122,0,0.28)]",
          )}
        >
          <Mic className="h-6 w-6" strokeWidth={2} aria-hidden />
        </button>
      </div>

      {/* Status text */}
      <div className="text-center pb-1">
        {/* HD badge shown when using Whisper fallback */}
        {whisperMode && (
          <span className="mb-1.5 inline-flex items-center rounded-md border border-kal-accent/20 bg-kal-accent/[0.08] px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-kal-accent/70">
            HD
          </span>
        )}
        <p className="text-sm font-medium text-kal-text leading-snug line-clamp-3">
          {transcript
            ? transcript
            : whisperMode
              ? "Tap the mic when done \u2014 up to 60s"
              : active
                ? "Go ahead, I'm listening\u2026"
                : "Tap the mic \u2014 I'm ready"}
        </p>
        <VoiceListeningHint
          visible={active && !transcript}
          variant={whisperMode ? "whisper" : "command"}
        />
        <p className="mt-1 text-[11px] text-kal-text-secondary/60">{voiceMinuteStatus}</p>
      </div>

      {/* Command hint chips — shown when idle and no transcript yet */}
      <CommandHints visible={showHints} />
    </div>
  );
}

function ProcessingState({ transcript }: { transcript: string | null }) {
  return (
    <div className="flex flex-col items-center gap-4 px-4 py-6">
      <div className="relative flex h-14 w-14 items-center justify-center rounded-full bg-kal-accent/10">
        <Loader2 className="h-6 w-6 animate-spin text-kal-accent" aria-hidden />
      </div>
      <div className="w-full text-center space-y-2">
        <p className="text-sm font-semibold text-kal-text">On it\u2026</p>
        {transcript && (
          <div className="relative overflow-hidden rounded-xl bg-kal-accent/[0.06] px-3 py-2">
            <p className="relative z-10 text-xs italic text-kal-text-secondary line-clamp-2">
              &ldquo;{transcript}&rdquo;
            </p>
            <span className="kal-shimmer-sweep pointer-events-none absolute inset-0" aria-hidden />
          </div>
        )}
      </div>
    </div>
  );
}

function DoneState({ responseText }: { responseText: string | null }) {
  return (
    <div className="flex flex-col items-center gap-3 px-4 py-6">
      <div className="flex h-14 w-14 items-center justify-center rounded-full bg-emerald-100 dark:bg-emerald-950/40">
        <svg viewBox="0 0 24 24" width="24" height="24" aria-hidden>
          <path
            d="M4.5 12.5 L9.5 17.5 L19.5 7.5"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="text-emerald-600 dark:text-emerald-400 kal-check-draw"
          />
        </svg>
      </div>
      <p className="text-center text-sm font-medium leading-snug text-kal-text">
        {responseText ?? "Done!"}
      </p>
    </div>
  );
}

function ErrorState({
  error,
  onRetry,
}: {
  error: string | null;
  onRetry: () => void;
}) {
  const router = useRouter();
  const { close: closeSheet, reset } = useVoiceCommandStore();
  const isQuotaError =
    (error ?? "").toLowerCase().includes("voice time") ||
    (error ?? "").toLowerCase().includes("subscription") ||
    (error ?? "").toLowerCase().includes("quota");

  return (
    <div className="flex flex-col items-center gap-4 px-4 py-6">
      <div className="flex h-14 w-14 items-center justify-center rounded-full bg-red-100 dark:bg-red-950/40">
        <MicOff className="h-6 w-6 text-red-500 dark:text-red-400" aria-hidden />
      </div>
      <p className="text-center text-sm leading-snug text-kal-text">
        {error ?? "Something went wrong."}
      </p>
      {isQuotaError ? (
        <button
          type="button"
          onClick={() => {
            closeSheet();
            reset();
            router.push("/my-subscription");
          }}
          className="w-full rounded-xl border border-kal-accent/30 bg-kal-accent-soft py-2 text-sm font-semibold text-kal-accent transition-colors hover:bg-kal-accent/15"
        >
          Get more voice time →
        </button>
      ) : (
        <button
          type="button"
          onClick={onRetry}
          className="w-full rounded-xl border border-kal-accent/30 bg-kal-accent-soft py-2 text-sm font-semibold text-kal-accent transition-colors hover:bg-kal-accent/15 active:scale-[0.98]"
        >
          Try again
        </button>
      )}
    </div>
  );
}

// ─── Main component ────────────────────────────────────────────────────────────

export function GlobalVoiceSheet() {
  const pathname = usePathname();
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const aiGate = useAiGate();

  const autoStartedRef = useRef(false);
  const closeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const executeRef = useRef<((intent: VoiceCommandIntent, text: string) => Promise<void>) | null>(null);
  // Prevents infinite retry: Whisper fallback fires at most once per session open.
  const whisperFallbackAttemptedRef = useRef(false);
  // Abort controller for the in-flight /api/voice-command fetch.
  const voiceFetchAbortRef = useRef<AbortController | null>(null);

  // Animation state: `mounted` controls DOM presence, `animatingOut` selects CSS class.
  const [mounted, setMounted] = useState(false);
  const [animatingOut, setAnimatingOut] = useState(false);

  const {
    isOpen,
    phase,
    transcript,
    responseText,
    error,
    pendingRevision,
    close: closeSheet,
    setPhase,
    setTranscript,
    setResponseText,
    setError,
    setPendingRevision,
    reset,
  } = useVoiceCommandStore();

  // Drive modal mount / unmount with enter + exit animations.
  useEffect(() => {
    if (isOpen) {
      setMounted(true);
      setAnimatingOut(false);
    } else if (mounted) {
      setAnimatingOut(true);
      const t = setTimeout(() => {
        setMounted(false);
        setAnimatingOut(false);
      }, 150);
      return () => clearTimeout(t);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen]);

  // Dismiss sheet the moment a voice-driven navigation lands.
  const prevPathnameRef = useRef(pathname);
  useEffect(() => {
    if (prevPathnameRef.current !== pathname) {
      prevPathnameRef.current = pathname;
      if (isOpen && (phase === "processing" || phase === "done")) {
        if (closeTimerRef.current) {
          clearTimeout(closeTimerRef.current);
          closeTimerRef.current = null;
        }
        closeSheet();
        reset();
      }
    }
  }, [pathname, isOpen, phase, closeSheet, reset]);

  // ─── Execute an intent returned from the API ─────────────────────────────────

  const execute = async (intent: VoiceCommandIntent, respText: string): Promise<void> => {
    setResponseText(respText);

    switch (intent.intent) {
      case "navigate": {
        router.push(intent.path);
        break;
      }

      case "add_task": {
        const planDate = localISODate();
        const id = crypto.randomUUID();
        const result = await insertDailyTask({
          plan_date: planDate,
          id,
          title: intent.subject,
          source: "voice",
          source_raw_text: `Voice command: ${intent.subject}`,
          time_slot: null,
        });
        if (!result.ok) {
          setError(result.error);
          setPhase("error");
          return;
        }
        break;
      }

      case "mark_completed": {
        const planDate = localISODate();
        const tasksRes = await fetchDailyPlanTasksForClient(planDate);
        if (tasksRes.ok && tasksRes.tasks.length > 0) {
          const matched = fuzzyMatchTask(tasksRes.tasks, intent.subject);
          if (matched) {
            await updateDailyTask(matched.id, { status: "completed" });
          } else {
            router.push("/daily-plan");
          }
        } else {
          router.push("/daily-plan");
        }
        break;
      }

      case "schedule_revision": {
        setPhase("done");
        setTimeout(() => {
          closeSheet();
          setPendingRevision({ subject: intent.subject, days: intent.days });
        }, 900);
        return;
      }

      case "ask_prepbrain": {
        if (typeof window !== "undefined") {
          sessionStorage.setItem("prepbrain_prefill", intent.query);
        }
        router.push("/prepbrain");
        break;
      }

      case "mark_syllabus_progress": {
        router.push("/syllabus");
        break;
      }

      case "log_sleep": {
        router.push("/daily-plan");
        break;
      }

      case "query_plan": {
        router.push("/daily-plan");
        break;
      }

      case "query_progress": {
        router.push("/progress");
        break;
      }

      case "unknown": {
        // Show "didn't understand" briefly then close — user re-opens if needed.
        closeTimerRef.current = setTimeout(() => {
          closeSheet();
          reset();
        }, 1500);
        setPhase("done");
        return;
      }
    }

    // Non-navigation success: show Done briefly then auto-close.
    setPhase("done");
    closeTimerRef.current = setTimeout(() => {
      closeSheet();
      reset();
    }, 3000);
  };

  executeRef.current = execute;

  // ─── Handle STT transcript ───────────────────────────────────────────────────

  const handleTranscript = useCallback(
    async ({
      transcript: text,
      durationSeconds,
    }: {
      transcript: string;
      occurredAt: string;
      durationSeconds: number;
    }) => {
      setPhase("processing");
      setTranscript(text);

      const controller = new AbortController();
      voiceFetchAbortRef.current = controller;

      try {
        const res = await fetch("/api/voice-command", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            transcript: text,
            page_context: pathname,
            durationSeconds,
          }),
          signal: controller.signal,
        });

        const data = (await res.json()) as {
          ok: boolean;
          error?: string;
          intent?: VoiceCommandIntent;
          response_text?: string;
        };

        if (!data.ok) {
          const isQuota = data.error === "quota_exceeded" || res.status === 429;
          const msg = isQuota
            ? "You've used your voice time for this month. Get more from My Subscription."
            : (data.error ?? "Something went wrong. Please try again.");
          setError(msg);
          setPhase("error");
          return;
        }

        if (!data.intent || !data.response_text) {
          setError("Couldn't parse that command. Please try again.");
          setPhase("error");
          return;
        }

        await executeRef.current?.(data.intent, data.response_text);
      } catch (e) {
        if (e instanceof Error && e.name === "AbortError") return;
        setError("Network error. Check your connection and try again.");
        setPhase("error");
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [pathname],
  );

  const {
    isSupported,
    isListening,
    startListening,
    stopListening,
    error: sttError,
    clearError: clearSttError,
  } = useDeviceSpeechRecognition({
    lang: "en-US",
    silenceMs: VOICE_COMMAND_SILENCE_MS,
    maxSessionMs: VOICE_MAX_SESSION_MS,
    interimPreview: true,
    onPreviewTranscript: (t) => {
      if (t) setTranscript(t);
    },
    onTranscript: handleTranscript,
  });

  // Whisper fallback — MediaRecorder + Groq distil-whisper-large-v3-en.
  // Called only when Web Speech API fails (once per session open).
  const {
    isRecording: isWhisperRecording,
    isTranscribing: isWhisperTranscribing,
    error: whisperError,
    clearError: clearWhisperError,
    startRecording: startWhisperRecording,
    stopRecording: stopWhisperRecording,
  } = useMediaRecorderVoice({
    onTranscript: handleTranscript,
    maxMs: VOICE_MAX_SESSION_MS,
  });

  // Auto-start listening when sheet opens, with chime.
  useEffect(() => {
    if (!isOpen) {
      autoStartedRef.current = false;
      return;
    }
    if (phase !== "idle" || autoStartedRef.current || aiGate.loading) return;
    if (!aiGate.canDoVoiceSession) return;
    if (!isSupported) {
      setError(
        "Voice commands are not supported in this browser. Try Chrome or the Kalnehi app.",
      );
      setPhase("error");
      return;
    }
    autoStartedRef.current = true;
    playStartChime();
    startListening();
  }, [isOpen, phase, aiGate.loading, aiGate.canDoVoiceSession, isSupported, startListening, setError, setPhase]);

  // Stop listening/recording and abort any in-flight fetch when the sheet closes.
  useEffect(() => {
    if (!isOpen) {
      stopListening();
      stopWhisperRecording();
      voiceFetchAbortRef.current?.abort();
      voiceFetchAbortRef.current = null;
      whisperFallbackAttemptedRef.current = false;
    }
  }, [isOpen, stopListening, stopWhisperRecording]);

  // STT error handler — auto-restart on "no speech", Whisper fallback on real failures.
  useEffect(() => {
    if (!sttError || !(phase === "idle" || phase === "listening")) return;

    // "No speech captured" is not a device/browser failure — the silence timer
    // fired before the user said anything. Just close the sheet quietly.
    const isNoSpeech = sttError.toLowerCase().startsWith("no speech");
    if (isNoSpeech) {
      clearSttError();
      closeSheet();
      reset();
      return;
    }

    if (!whisperFallbackAttemptedRef.current) {
      // First real failure: silently switch to Whisper recording.
      whisperFallbackAttemptedRef.current = true;
      clearSttError();
      setTranscript(null);
      playStartChime();
      void startWhisperRecording();
    } else {
      // Whisper already tried or STT error after fallback — surface to user.
      setError(sttError);
      setPhase("error");
      clearSttError();
    }
  }, [sttError, phase, clearSttError, setError, setPhase, setTranscript, startWhisperRecording]);

  // Surface Whisper errors into store.
  useEffect(() => {
    if (whisperError) {
      setError(whisperError);
      setPhase("error");
      clearWhisperError();
    }
  }, [whisperError, setError, setPhase, clearWhisperError]);

  // Cleanup on unmount.
  useEffect(() => {
    return () => {
      if (closeTimerRef.current) clearTimeout(closeTimerRef.current);
    };
  }, []);

  function handleClose() {
    stopListening();
    stopWhisperRecording();
    if (closeTimerRef.current) clearTimeout(closeTimerRef.current);
    closeSheet();
    reset();
    whisperFallbackAttemptedRef.current = false;
  }

  function handleRetry() {
    clearSttError();
    clearWhisperError();
    reset();
    autoStartedRef.current = false;
    whisperFallbackAttemptedRef.current = false;
    playStartChime();
    startListening();
  }

  const isWhisperActive = isWhisperRecording || isWhisperTranscribing;
  const isListeningPhase = phase === "idle" || phase === "listening" || isWhisperActive;

  // ─── Render ──────────────────────────────────────────────────────────────────

  return (
    <>
      {/* Revision dialog — always mounted so it can open after sheet closes */}
      <ScheduleRevisionReminderDialog
        open={!!pendingRevision}
        onOpenChange={(open) => {
          if (!open) setPendingRevision(null);
        }}
        userId={user?.id}
        showVoice={false}
        dialogTitle="Schedule Revision"
        initial={
          pendingRevision
            ? { title: pendingRevision.subject, sourceTab: "custom" }
            : undefined
        }
      />

      {/* Voice modal — rendered while mounted (includes exit animation window) */}
      {mounted && (
        <>
          {/* Backdrop */}
          <div
            className="kal-fade-in-fast fixed inset-0 z-[51] bg-black/35 backdrop-blur-[2px]"
            style={
              animatingOut
                ? { opacity: 0, transition: "opacity 0.15s ease" }
                : undefined
            }
            onClick={handleClose}
            aria-hidden
          />

          {/* Centered modal wrapper */}
          <div className="pointer-events-none fixed inset-0 z-[52] flex items-center justify-center p-4">
            {/* Card */}
            <div
              role="dialog"
              aria-label="Voice command"
              aria-modal="true"
              className={clsx(
                "pointer-events-auto w-full rounded-2xl kal-glass-panel shadow-2xl transition-[max-width] duration-300",
                isListeningPhase ? "max-w-md" : "max-w-sm",
                animatingOut ? "kal-voice-modal-out" : "kal-voice-modal-in",
              )}
            >
              {/* Header */}
              <div className="flex items-center justify-between border-b border-kal-border/30 px-4 pb-2.5 pt-3">
                <div className="flex items-center gap-2">
                  <p className="text-xs font-semibold uppercase tracking-wider text-kal-text-secondary">
                    Voice
                  </p>
                  <span className="rounded-md border border-kal-accent/15 bg-kal-accent/[0.06] px-1.5 py-[2px] text-[10px] font-medium text-kal-accent/60">
                    ⌘.
                  </span>
                </div>
                <button
                  type="button"
                  onClick={handleClose}
                  aria-label="Close voice command"
                  className="flex h-7 w-7 items-center justify-center rounded-lg border border-white/25 bg-white/40 text-kal-text-secondary backdrop-blur-md transition-colors hover:bg-white/60 active:scale-[0.97] dark:border-white/12 dark:bg-zinc-900/50"
                >
                  <X className="h-3.5 w-3.5" strokeWidth={2.5} aria-hidden />
                </button>
              </div>

              {/* Content — each state renders its own layout */}
              {!aiGate.loading && !aiGate.canDoVoiceSession ? (
                <QuotaGate voiceMinuteStatus={aiGate.voiceMinuteStatus} />
              ) : isWhisperTranscribing ? (
                <ProcessingState transcript={transcript} />
              ) : isListeningPhase ? (
                <ListeningState
                  isListening={isListening}
                  transcript={transcript}
                  voiceMinuteStatus={aiGate.voiceMinuteStatus}
                  whisperMode={isWhisperRecording}
                  onStopListening={isWhisperRecording ? stopWhisperRecording : stopListening}
                  onStartListening={() => {
                    reset();
                    autoStartedRef.current = true;
                    whisperFallbackAttemptedRef.current = false;
                    playStartChime();
                    startListening();
                  }}
                />
              ) : phase === "processing" ? (
                <ProcessingState transcript={transcript} />
              ) : phase === "done" ? (
                <DoneState responseText={responseText} />
              ) : (
                <ErrorState error={error} onRetry={handleRetry} />
              )}
            </div>
          </div>
        </>
      )}
    </>
  );
}

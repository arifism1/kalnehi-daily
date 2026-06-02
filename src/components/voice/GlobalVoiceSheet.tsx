"use client";

import clsx from "clsx";
import { addDays, format, parseISO } from "date-fns";
import { Loader2, Mic, MicOff, X } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { usePathname, useRouter } from "next/navigation";

import {
  insertDailyTask,
  moveDailyTaskToPlanDate,
  updateDailyTask,
  updateDailyTaskWorkedTime,
} from "@/actions/dailyPlan";
import { VoiceCreditBanner } from "@/components/budget/VoiceCreditBanner";
import { APP_HOME_PATH } from "@/config/appRoutes";
import { ScheduleRevisionReminderDialog } from "@/components/revision/ScheduleRevisionReminderDialog";
import { useVoiceCommand } from "@/hooks/useVoiceCommand";
import { useAuthStore } from "@/store/useAuthStore";
import { useDeviceSpeechRecognition } from "@/hooks/useDeviceSpeechRecognition";
import { useCapacitorSpeech } from "@/hooks/useCapacitorSpeech";
import { useMediaRecorderVoice } from "@/hooks/useMediaRecorderVoice";
import { useVoiceSttRouting } from "@/hooks/useVoiceSttRouting";
import { useVoiceCommandStore } from "@/store/useVoiceCommandStore";
import { useDoubtStore } from "@/store/useDoubtStore";
import { useUndoStore } from "@/store/useUndoStore";
import { useTaskStore, type Task } from "@/store/useTaskStore";
import { fetchDailyPlanTasksForClient } from "@/lib/fetchDailyPlanTasksForClient";
import { slotFromStartEnd } from "@/lib/dailyPlanTime";
import { toCalendarDateKey } from "@/lib/calendarDateKey";
import { writeVoiceFocusHint, writeVoicePlanHint } from "@/lib/voiceBossModeHints";
import {
  VOICE_GLOBAL_NAV_SPEECH_TIMING,
} from "@/lib/voiceConstants";
import type { DailyTaskView } from "@/actions/dailyPlan";
import type { VoiceCommandIntent } from "@/lib/voiceCommandGroq";
import {
  canonicalVoiceNavigatePath,
  isVoiceNavigatePathAllowed,
} from "@/lib/voiceCommandGroq";
import { VoiceListeningHint } from "@/components/voice/VoiceListeningHint";
import { CommandPreviewToast } from "@/components/voice/CommandPreviewToast";
import { trackMetaTaskCompleted } from "@/lib/analytics";
import { trackActivity } from "@/lib/activity";

// Example commands shown to the user while idle, to teach discoverability.
const COMMAND_HINTS = [
  "Go to daily plan",
  "Go to progress",
  "Go to syllabus",
  "Go to notifications",
  "Go to mastermind",
  "Go to consistency tracker",
  "Go to revision tracker",
  "Go to today's recap",
  "Open daily debrief",
  "Go to habits",
  "Go to timer",
  "Go to settings",
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

/** After voice mutates a plan day, open daily plan on that calendar date. */
function voiceDailyPlanHref(planDateIso: string): string {
  const today = localISODate();
  if (planDateIso === today) return "/daily-plan";
  return `/daily-plan?planDate=${encodeURIComponent(planDateIso)}`;
}

const ISO_CAL_DAY_RE = /^\d{4}-\d{2}-\d{2}$/;

function voiceTimeSlotFields(
  time_start: string | null,
  time_end: string | null,
): { time_slot: string | null; time_start: string | null; time_end: string | null } {
  if (!time_start && !time_end) {
    return { time_slot: null, time_start: null, time_end: null };
  }
  return slotFromStartEnd(time_start ?? "", time_end ?? "");
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
    const pending = tasks.filter((t) => t.status !== "done" && t.status !== "skipped");
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

function fuzzyMatchLegacyTodayTask(
  tasks: Task[],
  today: string,
  subject: string,
): Task | null {
  const needle = subject.toLowerCase().trim();
  const ordinals: Record<string, number> = {
    "first task": 0,
    "second task": 1,
    "third task": 2,
    "fourth task": 3,
    "fifth task": 4,
  };
  const ordinalIdx = ordinals[needle];
  const dayTasks = tasks.filter(
    (t) => toCalendarDateKey(t.assigned_date) === today,
  );
  if (ordinalIdx !== undefined) {
    const pending = dayTasks.filter((t) => t.status !== "completed");
    return pending[ordinalIdx] ?? dayTasks[ordinalIdx] ?? null;
  }
  return (
    dayTasks.find((t) => (t.name ?? "").toLowerCase().trim() === needle) ??
    dayTasks.find((t) => {
      const n = (t.name ?? "").toLowerCase();
      return n.includes(needle) || needle.includes(n);
    }) ??
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
      <div className="flex size-14 items-center justify-center rounded-full bg-amber-100 dark:bg-amber-950/40">
        <MicOff className="size-6 text-amber-600 dark:text-amber-400" aria-hidden />
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
  hideTranscript = false,
  showMicWhenDoneHint = false,
}: {
  isListening: boolean;
  transcript: string | null;
  voiceMinuteStatus: string;
  onStopListening: () => void;
  onStartListening: () => void;
  /** True when recording via MediaRecorder (Whisper fallback) instead of Web Speech API. */
  whisperMode?: boolean;
  /** When true, live transcript text is hidden (rare — global voice keeps it visible). */
  hideTranscript?: boolean;
  /** When true, show “tap mic to stop” above the mic while actively capturing (Web Speech or Whisper). */
  showMicWhenDoneHint?: boolean;
}) {
  const showHints = (!transcript || hideTranscript) && !whisperMode;
  const active = isListening || whisperMode;

  return (
    <div className="flex flex-col items-center gap-3 px-4 pt-5 pb-2">
      {/* Waveform */}
      <AudioWaveform isListening={active} />

      {showMicWhenDoneHint && (
        <p
          className="-mb-1 max-w-[240px] text-center text-[11px] font-semibold leading-snug text-kal-text-secondary"
          aria-live="polite"
        >
          Tap the mic anytime to stop listening
        </p>
      )}

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
            "relative flex size-14 items-center justify-center rounded-full transition-all duration-200",
            active
              ? "bg-kal-accent text-white scale-105 shadow-[0_4px_20px_rgba(255,122,0,0.4)]"
              : "bg-kal-accent/85 text-white shadow-md hover:bg-kal-accent hover:scale-[1.04] hover:shadow-[0_4px_16px_rgba(255,122,0,0.28)]",
          )}
        >
          <Mic className="size-6" strokeWidth={2} aria-hidden />
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
          {!hideTranscript && transcript
            ? transcript
            : whisperMode
              ? "Tap the mic anytime to stop \u2014 up to 2 min"
              : active
                ? "Go ahead, I'm listening\u2026"
                : "Tap the mic \u2014 I'm ready"}
        </p>
        <VoiceListeningHint
          visible={active && !whisperMode}
          variant={whisperMode ? "whisper" : "command"}
          showClearVoiceHint
        />
        <p className="mt-1 text-[11px] text-kal-text-secondary/60">{voiceMinuteStatus}</p>
      </div>

      {/* Command hint chips — shown when idle and no transcript yet */}
      <CommandHints visible={showHints} />
    </div>
  );
}

function ProcessingState({
  transcript,
  hideTranscript = false,
}: {
  transcript: string | null;
  hideTranscript?: boolean;
}) {
  return (
    <div className="flex flex-col items-center gap-4 px-4 py-6">
      <div className="relative flex size-14 items-center justify-center rounded-full bg-kal-accent/10">
        <Loader2 className="size-6 animate-spin text-kal-accent" aria-hidden />
      </div>
      <div className="w-full text-center space-y-2">
        <p className="text-sm font-semibold text-kal-text">On it\u2026</p>
        {transcript && !hideTranscript && (
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
      <div className="flex size-14 items-center justify-center rounded-full bg-emerald-100 dark:bg-emerald-950/40">
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
      <div className="flex size-14 items-center justify-center rounded-full bg-red-100 dark:bg-red-950/40">
        <MicOff className="size-6 text-red-500 dark:text-red-400" aria-hidden />
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
  const { submitVoiceCommand, aiGate } = useVoiceCommand();

  const autoStartedRef = useRef(false);
  const closeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const executeRef = useRef<((intent: VoiceCommandIntent, text: string) => Promise<void>) | null>(null);
  // Prevents infinite retry: Whisper fallback fires at most once per session open (non-app Web Speech failures only).
  const whisperFallbackAttemptedRef = useRef(false);
  // Abort controller for the in-flight /api/voice-command fetch.
  const voiceFetchAbortRef = useRef<AbortController | null>(null);

  // Animation state: `mounted` controls DOM presence, `animatingOut` selects CSS class.
  const [mounted, setMounted] = useState(false);
  const [animatingOut, setAnimatingOut] = useState(false);

  const routing = useVoiceSttRouting();
  const { silenceMs: speechSilenceMs, maxSessionMs: speechMaxSessionMs } =
    VOICE_GLOBAL_NAV_SPEECH_TIMING;

  const {
    isOpen,
    phase,
    transcript,
    responseText,
    error,
    pendingRevision,
    pendingIntent,
    close: closeSheet,
    setPhase,
    setTranscript,
    setResponseText,
    setError,
    setPendingRevision,
    setPendingIntent,
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
      if (isOpen && (phase === "processing" || phase === "done" || phase === "preview")) {
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
        router.push(
          isVoiceNavigatePathAllowed(intent.path)
            ? canonicalVoiceNavigatePath(intent.path)
            : APP_HOME_PATH,
        );
        break;
      }

      case "add_task": {
        const planDate = localISODate();
        const id = crypto.randomUUID();
        const slot = voiceTimeSlotFields(intent.time_start, intent.time_end);
        const result = await insertDailyTask({
          plan_date: planDate,
          id,
          title: intent.subject,
          source: "voice",
          source_raw_text: `Voice command: ${intent.subject}`,
          ...slot,
          // `duration_minutes` from the model is planned/estimated time, not time already worked.
          actual_worked_minutes: 0,
        });
        if (!result.ok) {
          setError(result.error);
          setPhase("error");
          return;
        }
        router.push(voiceDailyPlanHref(planDate));
        break;
      }

      case "mark_completed": {
        const planDate = localISODate();
        const tasksRes = await fetchDailyPlanTasksForClient(planDate);
        if (tasksRes.ok && tasksRes.tasks.length > 0) {
          const matched = fuzzyMatchTask(tasksRes.tasks, intent.subject);
          if (matched) {
            await updateDailyTask(matched.id, { status: "done" });
            trackMetaTaskCompleted();
            trackActivity("task_completed", { feature: "daily_plan", metadata: { task_id: matched.id, task_title: matched.title } });
            router.push(voiceDailyPlanHref(planDate));
          } else {
            writeVoicePlanHint({
              action_type: "mark_done",
              task_name: intent.subject,
              target_date: planDate,
              duration_logged: null,
            });
            useUndoStore.getState().offerUndo({
              message: `Couldn't find "${intent.subject}". Find it on your plan.`,
              runUndo: async () => {},
              autoDismissMs: 4500,
            });
            router.push("/daily-plan");
          }
        } else {
          router.push("/daily-plan");
        }
        break;
      }

      case "focus_mode": {
        const planDate = localISODate();
        const customSec = Math.min(
          120 * 60,
          Math.max(60, intent.duration * 60),
        );
        let dailyTaskId: string | null = null;
        let legacyTaskId: string | null = null;
        const taskHint: string | null = intent.linked_task;

        if (intent.linked_task) {
          const tasksRes = await fetchDailyPlanTasksForClient(planDate);
          if (tasksRes.ok) {
            const dm = fuzzyMatchTask(tasksRes.tasks, intent.linked_task);
            if (dm) dailyTaskId = dm.id;
          }
          if (!dailyTaskId) {
            const leg = fuzzyMatchLegacyTodayTask(
              Object.values(useTaskStore.getState().tasks),
              planDate,
              intent.linked_task,
            );
            if (leg) legacyTaskId = leg.id;
          }
        }

        writeVoiceFocusHint({
          customSec,
          taskHint,
          dailyTaskId,
          legacyTaskId,
          autoStart: intent.auto_start,
        });
        router.push("/timer");
        break;
      }

      case "plan_management": {
        const { action_type, task_name, target_date, duration_logged, time_start, time_end } =
          intent;

        if (action_type === "add") {
          const id = crypto.randomUUID();
          const slot = voiceTimeSlotFields(time_start, time_end);
          const result = await insertDailyTask({
            plan_date: target_date,
            id,
            title: task_name,
            source: "voice",
            source_raw_text: `Voice plan_management: ${task_name}`,
            ...slot,
            // For adds, model often fills `duration_logged` with planned minutes — not worked time.
            actual_worked_minutes: 0,
          });
          if (!result.ok) {
            setError(result.error);
            setPhase("error");
            return;
          }
          router.push(voiceDailyPlanHref(target_date));
          break;
        }

        const sourcePlanDate = localISODate();
        const tasksToday = await fetchDailyPlanTasksForClient(sourcePlanDate);
        let matched =
          tasksToday.ok && tasksToday.tasks.length > 0
            ? fuzzyMatchTask(tasksToday.tasks, task_name)
            : null;

        if (!matched) {
          const tasksTarget = await fetchDailyPlanTasksForClient(target_date);
          if (tasksTarget.ok && tasksTarget.tasks.length > 0) {
            matched = fuzzyMatchTask(tasksTarget.tasks, task_name);
          }
        }

        if (!matched) {
          writeVoicePlanHint({
            action_type,
            task_name,
            target_date,
            duration_logged,
          });
          useUndoStore.getState().offerUndo({
            message: `Couldn't find "${task_name}". Search on your daily plan.`,
            runUndo: async () => {},
            autoDismissMs: 4500,
          });
          router.push("/daily-plan");
          break;
        }

        if (action_type === "move") {
          const mv = await moveDailyTaskToPlanDate(matched.id, target_date);
          if (!mv.ok) {
            setError(mv.error);
            setPhase("error");
            return;
          }
        } else if (action_type === "mark_done") {
          await updateDailyTask(matched.id, { status: "done" });
          trackMetaTaskCompleted();
          trackActivity("task_completed", { feature: "daily_plan", metadata: { task_id: matched.id, task_title: matched.title } });
          if (duration_logged != null && duration_logged > 0) {
            const add = await updateDailyTaskWorkedTime(
              matched.id,
              duration_logged,
            );
            if (!add.ok) {
              setError(add.error);
              setPhase("error");
              return;
            }
          }
        }
        router.push(voiceDailyPlanHref(target_date));
        break;
      }

      case "batch_add_tasks": {
        for (const item of intent.items) {
          const id = crypto.randomUUID();
          const slot = voiceTimeSlotFields(item.time_start, item.time_end);
          // react-doctor-disable-next-line react-doctor/async-await-in-loop -- sequential task insertion preserves voice-parsed order
          const result = await insertDailyTask({
            plan_date: intent.plan_date,
            id,
            title: item.title,
            source: "voice",
            source_raw_text: `Voice batch_add_tasks: ${item.title}`,
            ...slot,
            actual_worked_minutes: 0,
          });
          if (!result.ok) {
            setError(result.error);
            setPhase("error");
            return;
          }
        }
        router.push(voiceDailyPlanHref(intent.plan_date));
        break;
      }

      case "doubt_logging": {
        await useDoubtStore.getState().createDoubt({
          title:
            intent.doubt_text.length > 72
              ? `${intent.doubt_text.slice(0, 72)}…`
              : intent.doubt_text,
          description: intent.doubt_text,
          subject: intent.subject,
        });
        if (intent.open_camera) router.push("/study-camera");
        else router.push("/doubts");
        break;
      }

      case "mindset_trigger": {
        if (intent.trigger_type === "purpose_mode") {
          router.push("/motivation");
        } else if (intent.trigger_type === "anxiety_reset") {
          router.push("/meditation?trigger=anxiety");
        } else {
          router.push("/meditation");
        }
        break;
      }

      case "schedule_revision": {
        const todayIso = localISODate();
        const nextDue =
          intent.exact_date && ISO_CAL_DAY_RE.test(intent.exact_date)
            ? intent.exact_date
            : format(addDays(parseISO(todayIso), intent.days), "yyyy-MM-dd");
        setPhase("done");
        setTimeout(() => {
          closeSheet();
          setPendingRevision({ subject: intent.subject, nextDue });
        }, 900);
        return;
      }

      case "ask_prepbrain": {
        if (typeof window !== "undefined") {
          sessionStorage.setItem("prepbrain_prefill", intent.query);
        }
        router.push("/mastermind");
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

  const handleNativeCapPartialTranscript = useCallback(
    (text: string) => {
      setTranscript(text);
    },
    [setTranscript],
  );

  const handlePreviewConfirm = useCallback(() => {
    const p = useVoiceCommandStore.getState().pendingIntent;
    if (!p) return;
    // Move to processing before clearing pending — otherwise one frame has
    // phase "preview" + null pending and the UI falls through to ErrorState.
    setError(null);
    setPhase("processing");
    setPendingIntent(null);
    void executeRef.current?.(p.intent, p.responseText);
  }, [setPendingIntent, setPhase, setError]);

  const handlePreviewCancel = useCallback(() => {
    setPendingIntent(null);
    setPhase("idle");
    setTranscript(null);
  }, [setPendingIntent, setPhase, setTranscript]);

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
        const result = await submitVoiceCommand(
          text,
          pathname,
          durationSeconds,
          controller.signal,
        );

        if (!result.ok) {
          setError(result.error);
          setPhase("error");
          return;
        }

        const { intent: parsedIntent, response_text: respText } = result.data;
        if (!parsedIntent || !respText) {
          setError("Couldn't parse that command. Please try again.");
          setPhase("error");
          return;
        }

        if (parsedIntent.intent === "unknown") {
          await executeRef.current?.(parsedIntent, respText);
          return;
        }

        setError(null);
        setPendingIntent({ intent: parsedIntent, responseText: respText });
        setPhase("preview");
      } catch (e) {
        if (e instanceof Error && e.name === "AbortError") return;
        setError("Network error. Check your connection and try again.");
        setPhase("error");
      }
    },
    [pathname, submitVoiceCommand, setError, setPendingIntent, setPhase, setTranscript],
  );

  const {
    isSupported,
    isListening,
    startListening,
    stopListening,
    error: sttError,
    clearError: clearSttError,
  } = useDeviceSpeechRecognition({
    lang: "en-IN",
    silenceMs: speechSilenceMs,
    maxSessionMs: speechMaxSessionMs,
    interimPreview: true,
    onPreviewTranscript: (t) => {
      if (t) setTranscript(t);
    },
    onTranscript: handleTranscript,
  });

  // useCapacitorSpeech — unused on Android while `useNativeCapacitorStt` is false; shell uses Whisper below.
  const {
    isRecording: isCapRecording,
    isTranscribing: isCapTranscribing,
    error: capSpeechError,
    clearError: clearCapSpeechError,
    startRecording: startCapRecording,
    stopRecording: stopCapRecording,
  } = useCapacitorSpeech({
    onTranscript: handleTranscript,
    maxMs: speechMaxSessionMs,
    variant: "longForm",
    silenceAfterSpeechMs: speechSilenceMs,
    onPartialTranscript: handleNativeCapPartialTranscript,
  });

  // MediaRecorder + Groq when Web Speech unavailable (WebView) or as fallback after Web Speech errors.
  const {
    isRecording: isWhisperRecording,
    isTranscribing: isWhisperTranscribing,
    error: whisperError,
    clearError: clearWhisperError,
    startRecording: startWhisperRecording,
    stopRecording: stopWhisperRecording,
    isSupported: whisperMicSupported,
  } = useMediaRecorderVoice({
    onTranscript: handleTranscript,
    maxMs: speechMaxSessionMs,
  });

  // Auto-start listening when sheet opens, with chime.
  useEffect(() => {
    if (!isOpen) {
      autoStartedRef.current = false;
      return;
    }
    if (phase !== "idle" || autoStartedRef.current || aiGate.loading) return;
    if (!aiGate.canDoVoiceSession) return;
    autoStartedRef.current = true;
    playStartChime();

    if (routing.useNativeCapacitorStt) {
      whisperFallbackAttemptedRef.current = true;
      void startCapRecording();
      return;
    }

    if (routing.useBrowserWhisperStt) {
      if (!whisperMicSupported) {
        setError(
          "Voice commands need a microphone. Allow mic access in your browser settings.",
        );
        setPhase("error");
        return;
      }
      whisperFallbackAttemptedRef.current = true;
      void startWhisperRecording();
      return;
    }

    if (!isSupported) {
      setError(
        "Voice commands are not supported in this browser. Try Google Chrome (desktop or Android, including Install app).",
      );
      setPhase("error");
      return;
    }
    startListening();
  }, [
    isOpen,
    phase,
    aiGate.loading,
    aiGate.canDoVoiceSession,
    isSupported,
    routing.useNativeCapacitorStt,
    routing.useBrowserWhisperStt,
    whisperMicSupported,
    startListening,
    startCapRecording,
    startWhisperRecording,
    setError,
    setPhase,
  ]);

  // Stop listening/recording and abort any in-flight fetch when the sheet closes.
  useEffect(() => {
    if (!isOpen) {
      stopListening();
      stopCapRecording();
      stopWhisperRecording();
      voiceFetchAbortRef.current?.abort();
      voiceFetchAbortRef.current = null;
      whisperFallbackAttemptedRef.current = false;
    }
  }, [isOpen, stopListening, stopCapRecording, stopWhisperRecording]);

  // STT error handler — Whisper fallback when Web Speech fails (never silent dismiss).
  useEffect(() => {
    if (!sttError || !(phase === "idle" || phase === "listening")) return;

    const lower = sttError.toLowerCase();
    const skipWhisperFallback =
      lower.includes("permission") ||
      lower.includes("microphone permission") ||
      lower.includes("does not support device speech") ||
      lower.includes("secure context") ||
      lower.includes("no microphone") ||
      lower.includes("not found on this device");

    if (skipWhisperFallback) {
      setError(sttError);
      setPhase("error");
      clearSttError();
      return;
    }

    if (!whisperFallbackAttemptedRef.current) {
      // First real failure: silently switch to Whisper recording (web only).
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

  // Capacitor-plugin errors — only surfaced if native STT routing is enabled (currently unused on Android).
  useEffect(() => {
    if (!capSpeechError || !(phase === "idle" || phase === "listening")) return;
    if (!routing.useNativeCapacitorStt) return;

    setError(capSpeechError);
    setPhase("error");
    clearCapSpeechError();
  }, [
    capSpeechError,
    phase,
    routing.useNativeCapacitorStt,
    clearCapSpeechError,
    setError,
    setPhase,
  ]);

  // Surface Whisper/MediaRecorder errors into store (Android app + Chrome; desktop after Web-Speech→Whisper fallback).
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
    stopCapRecording();
    stopWhisperRecording();
    if (closeTimerRef.current) clearTimeout(closeTimerRef.current);
    closeSheet();
    reset();
    whisperFallbackAttemptedRef.current = false;
  }

  function handleRetry() {
    clearSttError();
    clearCapSpeechError();
    clearWhisperError();
    void (async () => {
      stopListening();
      await stopCapRecording();
      await stopWhisperRecording();
      reset();
      playStartChime();
      // Mirror onStartListening: block duplicate auto-start effect from starting a second session.
      autoStartedRef.current = true;
      whisperFallbackAttemptedRef.current = false;
      if (routing.useNativeCapacitorStt) {
        whisperFallbackAttemptedRef.current = true;
        await startCapRecording();
      } else if (routing.useBrowserWhisperStt) {
        whisperFallbackAttemptedRef.current = true;
        await startWhisperRecording();
      } else {
        startListening();
      }
    })();
  }

  const isCapActive = isCapRecording || isCapTranscribing;
  const isWhisperActive = isWhisperRecording || isWhisperTranscribing;
  const isListeningPhase =
    phase === "idle" || phase === "listening" || isCapActive || isWhisperActive;
  const isWideCard = isListeningPhase || phase === "preview";

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
            ? {
                title: pendingRevision.subject,
                sourceTab: "custom",
                nextDue: pendingRevision.nextDue,
              }
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
                isWideCard ? "max-w-md" : "max-w-sm",
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
                  className="flex size-7 items-center justify-center rounded-lg border border-white/25 bg-white/40 text-kal-text-secondary backdrop-blur-md transition-colors hover:bg-white/60 active:scale-[0.97] dark:border-white/12 dark:bg-zinc-900/50"
                >
                  <X className="size-3.5" strokeWidth={2.5} aria-hidden />
                </button>
              </div>

              {aiGate.canDoVoiceSession && !aiGate.loading ? <VoiceCreditBanner /> : null}

              {/* Content — each state renders its own layout */}
              {!aiGate.loading && !aiGate.canDoVoiceSession ? (
                <QuotaGate voiceMinuteStatus={aiGate.voiceMinuteStatus} />
              ) : (isCapTranscribing || isWhisperTranscribing) ? (
                <ProcessingState transcript={transcript} hideTranscript={false} />
              ) : isListeningPhase ? (
                <ListeningState
                  isListening={isListening}
                  transcript={transcript}
                  voiceMinuteStatus={aiGate.voiceMinuteStatus}
                  whisperMode={isCapRecording || isWhisperRecording}
                  hideTranscript={false}
                  showMicWhenDoneHint={
                    isListening || isCapRecording || isWhisperRecording
                  }
                  onStopListening={
                    isCapRecording
                      ? stopCapRecording
                      : isWhisperRecording
                        ? stopWhisperRecording
                        : stopListening
                  }
                  onStartListening={() => {
                    reset();
                    autoStartedRef.current = true;
                    whisperFallbackAttemptedRef.current = false;
                    playStartChime();
                    if (routing.useNativeCapacitorStt) {
                      whisperFallbackAttemptedRef.current = true;
                      void startCapRecording();
                    } else if (routing.useBrowserWhisperStt) {
                      whisperFallbackAttemptedRef.current = true;
                      void startWhisperRecording();
                    } else {
                      startListening();
                    }
                  }}
                />
              ) : phase === "preview" && pendingIntent ? (
                <CommandPreviewToast
                  intent={pendingIntent.intent}
                  responseText={pendingIntent.responseText}
                  onConfirm={handlePreviewConfirm}
                  onCancel={handlePreviewCancel}
                />
              ) : phase === "processing" ? (
                <ProcessingState transcript={transcript} hideTranscript={false} />
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

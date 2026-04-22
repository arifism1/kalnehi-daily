"use client";

import clsx from "clsx";
import { Check, Loader2, Mic, MicOff, X } from "lucide-react";
import { useCallback, useEffect, useRef } from "react";
import { usePathname, useRouter } from "next/navigation";

import { insertDailyTask, updateDailyTask } from "@/actions/dailyPlan";
import { ScheduleRevisionReminderDialog } from "@/components/revision/ScheduleRevisionReminderDialog";
import { useAiGate } from "@/hooks/useAiGate";
import { useAuthStore } from "@/store/useAuthStore";
import { useDeviceSpeechRecognition } from "@/hooks/useDeviceSpeechRecognition";
import { useVoiceCommandStore } from "@/store/useVoiceCommandStore";
import { fetchDailyPlanTasksForClient } from "@/lib/fetchDailyPlanTasksForClient";
import type { DailyTaskView } from "@/actions/dailyPlan";
import type { VoiceCommandIntent } from "@/lib/voiceCommandGroq";

// ─── Utilities ────────────────────────────────────────────────────────────────

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


// ─── Sub-components ───────────────────────────────────────────────────────────

function QuotaGate({ voiceMinuteStatus }: { voiceMinuteStatus: string }) {
  const router = useRouter();
  const { close: closeSheet, reset } = useVoiceCommandStore();

  return (
    <div className="flex flex-col gap-3 px-4 py-4">
      <div className="flex items-center gap-3">
        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-amber-100 dark:bg-amber-950/40">
          <MicOff className="h-5 w-5 text-amber-600 dark:text-amber-400" aria-hidden />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold text-kal-text">Voice time used up</p>
          <p className="mt-0.5 truncate text-xs text-kal-text-secondary">{voiceMinuteStatus}</p>
        </div>
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
}: {
  isListening: boolean;
  transcript: string | null;
  voiceMinuteStatus: string;
  onStopListening: () => void;
  onStartListening: () => void;
}) {
  return (
    <div className="flex items-start gap-3 px-4 py-4">
      <div className="relative shrink-0 mt-0.5">
        {isListening && (
          <span
            className="absolute inset-0 rounded-full bg-kal-accent/25 animate-ping"
            aria-hidden
          />
        )}
        <button
          type="button"
          onClick={isListening ? onStopListening : onStartListening}
          aria-label={isListening ? "Stop listening" : "Start listening"}
          className={clsx(
            "relative flex h-12 w-12 items-center justify-center rounded-full shadow-md transition-all duration-200",
            isListening
              ? "bg-kal-accent text-white scale-105"
              : "bg-kal-accent/85 text-white hover:bg-kal-accent hover:scale-[1.03]",
          )}
        >
          <Mic className="h-5 w-5" strokeWidth={2} aria-hidden />
        </button>
      </div>
      <div className="min-w-0 flex-1">
        <p className="line-clamp-4 text-sm font-medium text-kal-text">
          {transcript
            ? transcript
            : isListening
              ? "Listening… say your command"
              : "Tap the mic to speak"}
        </p>
        <p className="mt-0.5 text-xs text-kal-text-secondary/70">{voiceMinuteStatus}</p>
      </div>
    </div>
  );
}

function ProcessingState({ transcript }: { transcript: string | null }) {
  return (
    <div className="flex items-center gap-3 px-4 py-4">
      <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-kal-accent/10">
        <Loader2 className="h-5 w-5 animate-spin text-kal-accent" aria-hidden />
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium text-kal-text">Thinking…</p>
        {transcript && (
          <p className="mt-0.5 truncate text-xs italic text-kal-text-secondary">
            "{transcript}"
          </p>
        )}
      </div>
    </div>
  );
}

function DoneState({ responseText }: { responseText: string | null }) {
  return (
    <div className="flex items-start gap-3 px-4 py-4">
      <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-emerald-100 dark:bg-emerald-950/40">
        <Check className="h-5 w-5 text-emerald-600 dark:text-emerald-400" strokeWidth={2.5} aria-hidden />
      </div>
      <div className="min-w-0 flex-1 pt-0.5">
        <p className="text-sm font-medium leading-snug text-kal-text">
          {responseText ?? "Done!"}
        </p>
      </div>
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
    <div className="flex flex-col gap-3 px-4 py-4">
      <div className="flex items-start gap-3">
        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-red-100 dark:bg-red-950/40">
          <MicOff className="h-5 w-5 text-red-500 dark:text-red-400" aria-hidden />
        </div>
        <p className="flex-1 pt-1 text-sm leading-snug text-kal-text">
          {error ?? "Something went wrong."}
        </p>
      </div>
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

// ─── Main component ───────────────────────────────────────────────────────────

export function GlobalVoiceSheet() {
  const pathname = usePathname();
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const aiGate = useAiGate();

  const autoStartedRef = useRef(false);
  const closeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Keep a stable ref to the latest execute function to avoid stale closures in STT callback
  const executeRef = useRef<((intent: VoiceCommandIntent, text: string) => Promise<void>) | null>(null);

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

  // ─── Execute an intent returned from the API ───────────────────────────────

  const execute = async (intent: VoiceCommandIntent, respText: string): Promise<void> => {
    setResponseText(respText);

    let shouldAutoClose = true;

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
        shouldAutoClose = false;
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
        shouldAutoClose = false;
        // Auto-restart listening after showing the "didn't understand" message briefly
        closeTimerRef.current = setTimeout(() => {
          reset();                        // sets phase → "idle"
          autoStartedRef.current = false; // lets the auto-start effect fire again
        }, 1500);
        break;
      }
    }

    setPhase("done");

    if (shouldAutoClose) {
      closeTimerRef.current = setTimeout(() => {
        closeSheet();
        reset();
      }, 3000);
    }
  };

  // Always keep the ref up-to-date
  executeRef.current = execute;

  // ─── Handle STT transcript ─────────────────────────────────────────────────

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

      try {
        const res = await fetch("/api/voice-command", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            transcript: text,
            page_context: pathname,
            durationSeconds,
          }),
        });

        const data = (await res.json()) as {
          ok: boolean;
          error?: string;
          intent?: VoiceCommandIntent;
          response_text?: string;
        };

        if (!data.ok) {
          const isQuota =
            data.error === "quota_exceeded" ||
            (res.status === 429);
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
      } catch {
        setError("Network error. Check your connection and try again.");
        setPhase("error");
      }
    },
    // pathname is the only external dep; setters are stable Zustand refs
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
    lang: "en-IN",
    silenceMs: 4000,
    maxSessionMs: 30_000,
    interimPreview: true,
    onPreviewTranscript: (t) => {
      if (t) setTranscript(t);
    },
    onTranscript: handleTranscript,
  });

  // Auto-start listening when sheet opens
  useEffect(() => {
    if (!isOpen) {
      autoStartedRef.current = false;
      return;
    }
    if (phase !== "idle" || autoStartedRef.current || aiGate.loading) return;
    if (!aiGate.canDoVoiceSession) return; // quota gate will display
    if (!isSupported) {
      setError(
        "Voice commands are not supported in this browser. Try Chrome or the Kalnehi app.",
      );
      setPhase("error");
      return;
    }
    autoStartedRef.current = true;
    startListening();
  }, [isOpen, phase, aiGate.loading, aiGate.canDoVoiceSession, isSupported, startListening, setError, setPhase]);

  // Surface STT errors into store
  useEffect(() => {
    if (sttError && (phase === "idle" || phase === "listening")) {
      setError(sttError);
      setPhase("error");
      clearSttError();
    }
  }, [sttError, phase, setError, setPhase, clearSttError]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (closeTimerRef.current) clearTimeout(closeTimerRef.current);
    };
  }, []);

  function handleClose() {
    stopListening();
    if (closeTimerRef.current) clearTimeout(closeTimerRef.current);
    closeSheet();
    reset();
  }

  function handleRetry() {
    clearSttError();
    reset();
    autoStartedRef.current = false;
    startListening();
  }

  // ─── Render ────────────────────────────────────────────────────────────────

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

      {/* Voice modal — only when open */}
      {isOpen && (
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 z-[51] bg-black/35 backdrop-blur-[2px]"
            onClick={handleClose}
            aria-hidden
          />

          {/* Centered modal wrapper — pointer-events-none so clicks on backdrop pass through */}
          <div className="fixed inset-0 z-[52] flex items-center justify-center p-4 pointer-events-none">
            {/* Card */}
            <div
              role="dialog"
              aria-label="Voice command"
              aria-modal="true"
              className="w-full max-w-sm rounded-2xl kal-glass-panel shadow-2xl pointer-events-auto"
            >
              {/* Header */}
              <div className="flex items-center justify-between border-b border-kal-border/30 px-4 pb-2 pt-3">
                <p className="text-xs font-semibold uppercase tracking-wider text-kal-text-secondary">
                  Voice Command
                </p>
                <button
                  type="button"
                  onClick={handleClose}
                  aria-label="Close voice command"
                  className="flex h-7 w-7 items-center justify-center rounded-lg border border-white/25 bg-white/40 text-kal-text-secondary backdrop-blur-md transition-colors hover:bg-white/60 active:scale-[0.97] dark:border-white/12 dark:bg-zinc-900/50"
                >
                  <X className="h-3.5 w-3.5" strokeWidth={2.5} aria-hidden />
                </button>
              </div>

              {/* Content — each state renders its own padding/layout */}
              {!aiGate.loading && !aiGate.canDoVoiceSession ? (
                <QuotaGate voiceMinuteStatus={aiGate.voiceMinuteStatus} />
              ) : phase === "idle" || phase === "listening" ? (
                <ListeningState
                  isListening={isListening}
                  transcript={transcript}
                  voiceMinuteStatus={aiGate.voiceMinuteStatus}
                  onStopListening={stopListening}
                  onStartListening={() => {
                    reset();
                    autoStartedRef.current = true;
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

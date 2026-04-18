"use client";

import { format, parseISO } from "date-fns";
import clsx from "clsx";
import { Loader2, Mic, MicOff, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";

import { createScheduledNotification } from "@/actions/scheduledNotifications";
import { SCHEDULED_NOTIFICATION_TAGS } from "@/lib/scheduledNotifications/tagsAndTypes";
import { useDeviceSpeechRecognition } from "@/hooks/useDeviceSpeechRecognition";
import { useAiGate } from "@/hooks/useAiGate";
import { surfaceOptionalString } from "@/lib/userFacingErrors";
import { useVoiceNotificationStore } from "@/store/useVoiceNotificationStore";

type Phase = "idle" | "parsing" | "preview" | "saving";

function formatNotifyPreview(iso: string): string {
  try {
    const d = parseISO(iso);
    if (Number.isNaN(d.getTime())) return iso;
    return format(d, "MMM d, yyyy · h:mm a");
  } catch {
    return iso;
  }
}

function isoToDatetimeLocalValue(iso: string): string {
  try {
    const d = parseISO(iso);
    if (Number.isNaN(d.getTime())) return "";
    return format(d, "yyyy-MM-dd'T'HH:mm");
  } catch {
    return "";
  }
}

export function VoiceNotificationSheet({ onSaved }: { onSaved?: () => void }) {
  const router = useRouter();
  const open = useVoiceNotificationStore((s) => s.open);
  const closeSheet = useVoiceNotificationStore((s) => s.closeSheet);
  const {
    canDoVoiceSession,
    voiceMinuteStatus,
    loading: gateLoading,
    refetch: refetchAiGate,
  } = useAiGate();

  const [lang] = useState("en-IN");
  const [phase, setPhase] = useState<Phase>("idle");
  const [error, setError] = useState<string | null>(null);
  const [title, setTitle] = useState("");
  const [notifyAtIso, setNotifyAtIso] = useState("");
  const [notifyLocal, setNotifyLocal] = useState("");
  const [subject, setSubject] = useState<string | null>(null);
  const [chapter, setChapter] = useState<string | null>(null);
  const [tag, setTag] = useState<string>("Study");
  const [repeatType, setRepeatType] = useState<"once" | "daily" | "weekly">("once");
  const [groqModel, setGroqModel] = useState<string | null>(null);
  const [userTz, setUserTz] = useState("UTC");

  const resetDraft = useCallback(() => {
    setTitle("");
    setNotifyAtIso("");
    setNotifyLocal("");
    setSubject(null);
    setChapter(null);
    setTag("Study");
    setRepeatType("once");
    setGroqModel(null);
    setError(null);
    setPhase("idle");
  }, []);

  useEffect(() => {
    if (typeof Intl !== "undefined") {
      setUserTz(Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC");
    }
  }, []);

  useEffect(() => {
    if (!open) {
      resetDraft();
    }
  }, [open, resetDraft]);

  const parseTranscript = useCallback(async (transcript: string, durationSeconds: number) => {
    const cleaned = transcript.trim();
    if (!cleaned) {
      setError("No speech captured. Try again.");
      setPhase("idle");
      return;
    }
    if (!canDoVoiceSession) {
      setError("You have no voice minutes left. Add this notification with typing instead.");
      setPhase("idle");
      return;
    }
    setPhase("parsing");
    setError(null);
    const parseSeconds = 90_000;
    const controller = new AbortController();
    const abortTimer = window.setTimeout(() => controller.abort(), parseSeconds);
    try {
      const tz =
        typeof Intl !== "undefined"
          ? Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC"
          : "UTC";
      const res = await fetch("/api/voice-notification/parse", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        signal: controller.signal,
        body: JSON.stringify({
          transcript: cleaned,
          ianaTimeZone: tz,
          nowIso: new Date().toISOString(),
          durationSeconds,
        }),
      });
      const rawText = await res.text();
      let data: {
        ok?: boolean;
        error?: string;
        title?: string;
        notify_at?: string;
        subject?: string | null;
        chapter?: string | null;
        tag?: string;
        repeat_type?: string;
        groq_model?: string;
      };
      try {
        data = rawText
          ? (JSON.parse(rawText) as typeof data)
          : {};
      } catch {
        if (res.status === 404) {
          setError(
            "The voice service endpoint was not found. Refresh the app and try again.",
          );
        } else if (res.status === 502 || res.status === 503 || res.status === 504) {
          setError("The service is busy right now. Please try again in a moment.");
        } else {
          setError(
            "The server response could not be read. Check your connection, refresh, and try again.",
          );
        }
        setPhase("idle");
        return;
      }
      if (!res.ok || !data.ok) {
        const fallback =
          res.status === 401
            ? "Please sign in to use voice notifications."
            : res.status === 429
              ? "Voice quota was exceeded for this request."
              : res.status === 500 || res.status === 502
                ? "The server had a problem. Try again shortly."
                : res.status === 422
                  ? "Could not turn that into a clear date and time. Say a specific time, like “tomorrow at 5 p.m.”"
                  : "Could not parse that into a notification.";
        setError(
          surfaceOptionalString(
            typeof data.error === "string" ? data.error : null,
            fallback,
          ),
        );
        setPhase("idle");
        return;
      }
      if (typeof data.title === "string" && typeof data.notify_at === "string") {
        setTitle(data.title);
        setNotifyAtIso(data.notify_at);
        setNotifyLocal(isoToDatetimeLocalValue(data.notify_at));
        setSubject(typeof data.subject === "string" ? data.subject : null);
        setChapter(typeof data.chapter === "string" ? data.chapter : null);
        if (
          typeof data.tag === "string" &&
          (SCHEDULED_NOTIFICATION_TAGS as readonly string[]).includes(data.tag)
        ) {
          setTag(data.tag);
        }
        if (data.repeat_type === "daily" || data.repeat_type === "weekly") {
          setRepeatType(data.repeat_type);
        } else {
          setRepeatType("once");
        }
        setGroqModel(typeof data.groq_model === "string" ? data.groq_model : null);
        void refetchAiGate();
        setPhase("preview");
      } else {
        setError("Unexpected response from server.");
        setPhase("idle");
      }
    } catch (e) {
      if (e instanceof Error && e.name === "AbortError") {
        setError("Parsing is taking too long. Check your connection and try again.");
        setPhase("idle");
        return;
      }
      if (e instanceof TypeError) {
        setError(
          "We could not reach the server. Check your connection, then try again.",
        );
        setPhase("idle");
        return;
      }
      setError("Network error. Check connection and try again.");
      setPhase("idle");
    } finally {
      window.clearTimeout(abortTimer);
    }
  }, [canDoVoiceSession, refetchAiGate]);

  const {
    clearError: clearRecognitionError,
    error: recognitionError,
    isListening,
    isSupported,
    startListening,
    stopListening,
  } = useDeviceSpeechRecognition({
    lang,
    fallbackLang: lang !== "en-US" ? "en-US" : undefined,
    maxSessionMs: null,
    silenceMs: null,
    onStart: () => {
      setError(null);
    },
    onTranscript: ({ transcript, durationSeconds }) => {
      void parseTranscript(transcript, durationSeconds);
    },
  });

  const handleConfirm = useCallback(async () => {
    const t = title.trim();
    const nextIso = notifyLocal
      ? new Date(notifyLocal).toISOString()
      : notifyAtIso;
    if (!t || !nextIso) return;
    setPhase("saving");
    setError(null);
    try {
      const res = await createScheduledNotification({
        title: t,
        tag,
        subject,
        chapter,
        next_fire_at: nextIso,
        user_timezone: userTz,
        repeat_type: repeatType,
      });
      if (!res.ok) {
        setError(res.error);
        setPhase("preview");
        return;
      }
      onSaved?.();
      router.refresh();
      closeSheet();
      resetDraft();
    } catch {
      setError("Could not save notification.");
      setPhase("preview");
    }
  }, [
    title,
    notifyLocal,
    notifyAtIso,
    tag,
    subject,
    chapter,
    userTz,
    repeatType,
    closeSheet,
    resetDraft,
    onSaved,
  ]);

  if (!open) return null;

  const voiceBlocked = gateLoading ? false : !canDoVoiceSession;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Voice notification"
      className="fixed inset-0 z-[60] flex items-end justify-center sm:items-center sm:p-4"
    >
      <button
        type="button"
        aria-label="Close"
        className="absolute inset-0 bg-[var(--kal-overlay)]"
        onClick={() => {
          if (isListening) stopListening();
          closeSheet();
        }}
      />
      <div
        className={clsx(
          "relative z-[61] w-full max-w-md rounded-t-2xl border border-white/35 bg-[rgba(255,252,248,0.97)] p-4 shadow-2xl backdrop-blur-2xl dark:border-white/12 dark:bg-[rgba(25,18,10,0.96)] sm:rounded-2xl sm:p-5",
          "pb-[max(1rem,env(safe-area-inset-bottom))]",
        )}
      >
        <div className="mb-3 flex items-start justify-between gap-2">
          <div>
            <p className="text-[0.62rem] font-bold uppercase tracking-widest text-kal-accent-dark">
              Voice notification
            </p>
            <h2 className="text-lg font-semibold text-kal-text">Speak naturally</h2>
            <div className="mt-2 rounded-lg border border-kal-border/80 bg-kal-card-muted/50 px-2.5 py-1.5">
              <p className="text-[0.65rem] font-semibold uppercase tracking-wide text-kal-muted">
                Voice quota
              </p>
              <p className="text-xs font-medium text-kal-text">{voiceMinuteStatus}</p>
            </div>
            <ol className="mt-2 list-decimal space-y-0.5 pl-4 text-xs text-kal-muted">
              <li>Allow the microphone when prompted</li>
              <li>Tap the mic and speak your reminder</li>
              <li>Tap again to stop recording</li>
              <li>Review the preview, then confirm</li>
            </ol>
          </div>
          <button
            type="button"
            onClick={() => {
              if (isListening) stopListening();
              closeSheet();
            }}
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-kal-border/80 bg-white/50 text-kal-muted transition hover:bg-kal-card-muted dark:bg-white/5"
            aria-label="Close voice notification"
          >
            <X className="h-5 w-5" strokeWidth={2.25} />
          </button>
        </div>

        {!isSupported ? (
          <p className="text-sm text-kal-muted">
            This browser does not support on-device speech recognition. Try Chrome or the Kalnehi
            Android app.
          </p>
        ) : null}

        {voiceBlocked && phase !== "preview" && phase !== "saving" ? (
          <p className="mb-3 rounded-xl border border-amber-200/80 bg-amber-50/90 px-3 py-2 text-sm text-amber-950 dark:border-amber-900/40 dark:bg-amber-950/30 dark:text-amber-100">
            No voice minutes left. Use the notification hub to add a typed notification (unlimited).
          </p>
        ) : null}

        {recognitionError ? (
          <p className="mb-2 rounded-xl border border-amber-200/80 bg-amber-50/90 px-3 py-2 text-sm text-amber-950 dark:border-amber-900/40 dark:bg-amber-950/40 dark:text-amber-100">
            <span className="font-semibold">Speech: </span>
            {recognitionError}
          </p>
        ) : null}
        {error ? (
          <p className="mb-3 rounded-xl border border-red-200/80 bg-red-50/90 px-3 py-2 text-sm text-red-900 dark:border-red-900/40 dark:bg-red-950/40 dark:text-red-100">
            <span className="font-semibold">Server: </span>
            {error}
          </p>
        ) : null}

        {phase === "preview" || phase === "saving" ? (
          <div className="space-y-3">
            <div className="space-y-2 text-sm">
              <label className="block text-kal-muted">
                Title
                <input
                  className="mt-1 w-full rounded-lg border border-kal-border bg-white/80 px-3 py-2 text-kal-text dark:bg-zinc-900/60"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                />
              </label>
              <label className="block text-kal-muted">
                When
                <input
                  type="datetime-local"
                  className="mt-1 w-full rounded-lg border border-kal-border bg-white/80 px-3 py-2 text-kal-text dark:bg-zinc-900/60"
                  value={notifyLocal}
                  onChange={(e) => {
                    setNotifyLocal(e.target.value);
                    if (e.target.value) {
                      const d = new Date(e.target.value);
                      if (!Number.isNaN(d.getTime())) setNotifyAtIso(d.toISOString());
                    }
                  }}
                />
              </label>
              <label className="block text-kal-muted">
                Tag
                <select
                  className="mt-1 w-full rounded-lg border border-kal-border bg-white/80 px-3 py-2 text-kal-text dark:bg-zinc-900/60"
                  value={tag}
                  onChange={(e) => setTag(e.target.value)}
                >
                  {SCHEDULED_NOTIFICATION_TAGS.map((x) => (
                    <option key={x} value={x}>
                      {x}
                    </option>
                  ))}
                </select>
              </label>
              <label className="block text-kal-muted">
                Repeat
                <select
                  className="mt-1 w-full rounded-lg border border-kal-border bg-white/80 px-3 py-2 text-kal-text dark:bg-zinc-900/60"
                  value={repeatType}
                  onChange={(e) =>
                    setRepeatType(e.target.value as "once" | "daily" | "weekly")
                  }
                >
                  <option value="once">Once</option>
                  <option value="daily">Daily</option>
                  <option value="weekly">Weekly</option>
                </select>
              </label>
              <label className="block text-kal-muted">
                Subject (optional)
                <input
                  className="mt-1 w-full rounded-lg border border-kal-border bg-white/80 px-3 py-2 text-kal-text dark:bg-zinc-900/60"
                  value={subject ?? ""}
                  onChange={(e) => setSubject(e.target.value || null)}
                />
              </label>
              <label className="block text-kal-muted">
                Chapter (optional)
                <input
                  className="mt-1 w-full rounded-lg border border-kal-border bg-white/80 px-3 py-2 text-kal-text dark:bg-zinc-900/60"
                  value={chapter ?? ""}
                  onChange={(e) => setChapter(e.target.value || null)}
                />
              </label>
            </div>
            <p className="text-sm leading-relaxed text-kal-text">
              <span className="font-semibold text-kal-accent-dark">{title}</span>
              {" · "}
              <span className="font-medium">{formatNotifyPreview(notifyAtIso)}</span>
            </p>
            <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap">
              <button
                type="button"
                disabled={phase === "saving" || voiceBlocked}
                onClick={() => {
                  clearRecognitionError();
                  setError(null);
                  resetDraft();
                  void startListening();
                }}
                className="inline-flex min-h-[44px] flex-1 items-center justify-center gap-2 rounded-xl border border-kal-border bg-kal-card-muted px-4 text-sm font-semibold text-kal-text transition hover:bg-white/80 disabled:opacity-50 dark:hover:bg-white/10"
              >
                <Mic className="h-4 w-4" />
                Try again
              </button>
              <button
                type="button"
                onClick={() => void handleConfirm()}
                disabled={phase === "saving"}
                className="inline-flex min-h-[44px] flex-1 items-center justify-center gap-2 rounded-xl border border-kal-accent/40 bg-kal-accent px-4 text-sm font-semibold text-white shadow-sm transition hover:opacity-95 disabled:opacity-60"
              >
                {phase === "saving" ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Saving…
                  </>
                ) : (
                  "Confirm"
                )}
              </button>
            </div>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-4 py-2">
            <button
              type="button"
              disabled={!isSupported || phase === "parsing" || voiceBlocked}
              onClick={() => {
                if (isListening) {
                  stopListening();
                  return;
                }
                clearRecognitionError();
                setError(null);
                void startListening();
              }}
              className={clsx(
                "flex h-20 w-20 items-center justify-center rounded-full border-2 shadow-lg transition active:scale-[0.98]",
                isListening
                  ? "border-kal-accent bg-kal-accent-soft text-kal-accent-dark ring-4 ring-kal-accent/25"
                  : "border-white/40 bg-white/70 text-kal-accent backdrop-blur-md hover:border-kal-accent/50 dark:border-white/15 dark:bg-zinc-900/60",
              )}
              aria-pressed={isListening}
              aria-label={isListening ? "Stop listening" : "Start voice notification"}
            >
              {phase === "parsing" ? (
                <Loader2 className="h-9 w-9 animate-spin" strokeWidth={2} />
              ) : isListening ? (
                <MicOff className="h-9 w-9" strokeWidth={2} />
              ) : (
                <Mic className="h-9 w-9" strokeWidth={2} />
              )}
            </button>
            <p className="text-center text-sm text-kal-muted">
              {isListening
                ? "Listening… tap the mic again when you are done."
                : phase === "parsing"
                  ? "Turning your words into a notification…"
                  : "Tap the mic, say your notification, then tap again to finish."}
            </p>
          </div>
        )}

        {groqModel ? (
          <p className="mt-3 text-center text-[10px] text-kal-muted opacity-70">
            Parsed with {groqModel}
          </p>
        ) : null}
      </div>
    </div>
  );
}

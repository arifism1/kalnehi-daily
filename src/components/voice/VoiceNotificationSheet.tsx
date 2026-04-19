"use client";

import { format, parseISO } from "date-fns";
import clsx from "clsx";
import { Loader2, Mic, MicOff, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";

import { createScheduledNotification } from "@/actions/scheduledNotifications";
import { scheduledNotifyIsoToDatetimeLocalValue } from "@/lib/scheduledNotifications/isoToDatetimeLocal";
import { SCHEDULED_NOTIFICATION_TAGS } from "@/lib/scheduledNotifications/tags";
import { useDeviceSpeechRecognition } from "@/hooks/useDeviceSpeechRecognition";
import { useAiGate } from "@/hooks/useAiGate";
import { useVoiceNotificationStore } from "@/store/useVoiceNotificationStore";

type Phase = "idle" | "parsing" | "preview" | "saving";

const SPEECH_LANG_OPTIONS: { value: string; label: string }[] = [
  { value: "en-US", label: "English (US) — recommended for reliable speech" },
  { value: "en-IN", label: "English (India)" },
  { value: "en-GB", label: "English (UK)" },
  { value: "hi-IN", label: "Hindi (India)" },
];

function defaultSpeechLang(): string {
  if (typeof navigator === "undefined") return "en-US";
  const raw = navigator.language?.split(",")[0]?.trim();
  if (!raw) return "en-US";
  const match = SPEECH_LANG_OPTIONS.some((o) => o.value === raw);
  if (match) return raw;
  if (raw.toLowerCase().startsWith("en")) return "en-US";
  return raw;
}

function formatNotifyPreview(iso: string): string {
  try {
    const d = parseISO(iso);
    if (Number.isNaN(d.getTime())) return iso;
    return format(d, "MMM d, yyyy · h:mm a");
  } catch {
    return iso;
  }
}

/** Prefer datetime-local when set; otherwise parsed ISO from the server. */
function resolveNotifyFireIso(notifyLocal: string, notifyAtIso: string): string {
  const local = notifyLocal.trim();
  if (local) {
    const d = new Date(local);
    if (!Number.isNaN(d.getTime())) return d.toISOString();
  }
  return notifyAtIso;
}

/** API returns trusted, user-facing strings — do not run through surfaceErrorForUi (it hides them). */
function voiceParseErrorMessage(raw: unknown, status: number): string {
  if (typeof raw === "string" && raw.trim()) {
    const t = raw.trim();
    return t.length > 320 ? `${t.slice(0, 317)}…` : t;
  }
  if (status === 401) return "Please sign in again.";
  if (status === 429) {
    return "Voice minute limit reached. Add this notification by typing (unlimited).";
  }
  if (status === 422) {
    return "Could not turn that into a notification. Try rephrasing with a clear time.";
  }
  if (status === 503) {
    return "Notification parsing is temporarily unavailable. Try again shortly or use typing.";
  }
  if (status >= 500) return "The server had a problem. Try again in a moment.";
  return "Could not parse notification. Try again or use typing.";
}

export function VoiceNotificationSheet({ onSaved }: { onSaved?: () => void }) {
  const router = useRouter();
  const open = useVoiceNotificationStore((s) => s.open);
  const closeSheet = useVoiceNotificationStore((s) => s.closeSheet);
  const hubHandoff = useVoiceNotificationStore((s) => s.handoffToHubModal);
  const commitHubPrefill = useVoiceNotificationStore((s) => s.commitHubPrefill);
  const {
    canDoVoiceSession,
    voiceMinuteStatus,
    loading: gateLoading,
    refetch: refetchAiGate,
  } = useAiGate();

  const [speechLang, setSpeechLang] = useState(defaultSpeechLang);
  const [phase, setPhase] = useState<Phase>("idle");
  const [parseError, setParseError] = useState<string | null>(null);
  const [liveTranscript, setLiveTranscript] = useState("");
  const [speechRunsLocally, setSpeechRunsLocally] = useState<boolean | null>(null);
  const [title, setTitle] = useState("");
  const [notifyAtIso, setNotifyAtIso] = useState("");
  const [notifyLocal, setNotifyLocal] = useState("");
  const [subject, setSubject] = useState<string | null>(null);
  const [chapter, setChapter] = useState<string | null>(null);
  const [tag, setTag] = useState<string>("Study");
  const [repeatType, setRepeatType] = useState<"once" | "daily" | "weekly">("once");
  const [groqModel, setGroqModel] = useState<string | null>(null);
  const [userTz, setUserTz] = useState("UTC");
  const [voiceQuotaNote, setVoiceQuotaNote] = useState<string | null>(null);

  const resetDraft = useCallback(() => {
    setTitle("");
    setNotifyAtIso("");
    setNotifyLocal("");
    setSubject(null);
    setChapter(null);
    setTag("Study");
    setRepeatType("once");
    setGroqModel(null);
    setParseError(null);
    setLiveTranscript("");
    setSpeechRunsLocally(null);
    setVoiceQuotaNote(null);
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

  const parseTranscript = useCallback(
    async (transcript: string, durationSeconds: number) => {
      const cleaned = transcript.trim();
      if (!cleaned) {
        setParseError("No speech captured. Try again.");
        setPhase("idle");
        return;
      }
      if (!canDoVoiceSession) {
        setParseError(
          "You have no voice minutes left. Add this notification with typing instead.",
        );
        setPhase("idle");
        return;
      }
      setPhase("parsing");
      setParseError(null);
      setVoiceQuotaNote(null);
      try {
        const tz =
          typeof Intl !== "undefined"
            ? Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC"
            : "UTC";
        const res = await fetch("/api/voice-time/parse", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
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
          voice_seconds_charged?: number;
        } = {};

        if (rawText.trim()) {
          try {
            data = JSON.parse(rawText) as typeof data;
          } catch {
            setParseError(
              res.ok
                ? "Invalid response from server. Try again."
                : `Request failed (${res.status}). Try again or use typing.`,
            );
            setPhase("idle");
            return;
          }
        }

        if (!res.ok || !data.ok) {
          setParseError(voiceParseErrorMessage(data.error, res.status));
          setPhase("idle");
          return;
        }
        if (typeof data.title === "string" && typeof data.notify_at === "string") {
          const nextTitle = data.title.trim().slice(0, 200);
          let nextTag = "Study";
          if (
            typeof data.tag === "string" &&
            (SCHEDULED_NOTIFICATION_TAGS as readonly string[]).includes(data.tag)
          ) {
            nextTag = data.tag;
          }
          let nextRepeat: "once" | "daily" | "weekly" = "once";
          if (data.repeat_type === "daily" || data.repeat_type === "weekly") {
            nextRepeat = data.repeat_type;
          }
          const nextSubject =
            typeof data.subject === "string" && data.subject.trim()
              ? data.subject.trim().slice(0, 200)
              : null;
          const nextChapter =
            typeof data.chapter === "string" && data.chapter.trim()
              ? data.chapter.trim().slice(0, 200)
              : null;

          void refetchAiGate();

          if (useVoiceNotificationStore.getState().handoffToHubModal) {
            let quotaNote: string | null = null;
            if (typeof data.voice_seconds_charged === "number") {
              quotaNote = `Used ${data.voice_seconds_charged}s of your voice time for this parse.`;
            }
            commitHubPrefill({
              title: nextTitle,
              next_fire_at: data.notify_at,
              tag: nextTag,
              repeat_type: nextRepeat,
              subject: nextSubject,
              chapter: nextChapter,
              user_timezone: tz,
              voiceQuotaNote: quotaNote,
            });
            return;
          }

          setTitle(nextTitle);
          setNotifyAtIso(data.notify_at);
          setNotifyLocal(scheduledNotifyIsoToDatetimeLocalValue(data.notify_at));
          setSubject(nextSubject);
          setChapter(nextChapter);
          setTag(nextTag);
          setRepeatType(nextRepeat);
          setGroqModel(typeof data.groq_model === "string" ? data.groq_model : null);
          if (typeof data.voice_seconds_charged === "number") {
            setVoiceQuotaNote(
              `Used ${data.voice_seconds_charged}s of your voice time for this parse.`,
            );
          }
          setPhase("preview");
        } else {
          setParseError("Unexpected response from server.");
          setPhase("idle");
        }
      } catch (err) {
        console.error("[VoiceNotificationSheet] parseTranscript error:", err);
        const isNetworkBlock = err instanceof TypeError;
        setParseError(
          isNetworkBlock
            ? "A browser extension (ad blocker) may be blocking this request. Try disabling it for this site, then retry. Or add the notification by typing (unlimited)."
            : "Could not reach the server. Check your connection, then try again or add the notification by typing.",
        );
        setPhase("idle");
      }
    },
    [canDoVoiceSession, refetchAiGate, commitHubPrefill],
  );

  const {
    clearError: clearRecognitionError,
    error: recognitionError,
    isListening,
    isSupported,
    startListening,
    stopListening,
  } = useDeviceSpeechRecognition({
    lang: speechLang,
    maxSessionMs: null,
    silenceMs: null,
    interimPreview: true,
    onPreviewTranscript: setLiveTranscript,
    onSpeechEngineInfo: ({ processLocally }) => {
      setSpeechRunsLocally(processLocally);
    },
    onStart: () => {
      setParseError(null);
    },
    onTranscript: ({ transcript, durationSeconds }) => {
      void parseTranscript(transcript, durationSeconds);
    },
  });

  const steps = hubHandoff
    ? [
        "Allow the microphone when your browser asks.",
        "Pick a speech language below (English US is the most reliable in Chrome).",
        "Tap the mic, say what to do and when, then tap again to finish.",
        "We open the Add notification form with your details — review, edit if needed, then tap Save notification.",
      ]
    : [
        "Allow the microphone when your browser asks.",
        "Pick a speech language below (English US is the most reliable in Chrome).",
        "Tap the mic, say what to do and when, then tap again to finish.",
        "Review the preview and confirm — we save it and send a push at that time.",
      ];

  const handleConfirm = useCallback(async () => {
    const t = title.trim();
    const nextIso = resolveNotifyFireIso(notifyLocal, notifyAtIso);
    if (!t || !nextIso) return;
    setPhase("saving");
    setParseError(null);
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
        setParseError(res.error);
        setPhase("preview");
        return;
      }
      onSaved?.();
      router.refresh();
      closeSheet();
      resetDraft();
    } catch {
      setParseError("Could not save notification.");
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
    router,
  ]);

  if (!open) return null;

  const effectiveNotifyIso = resolveNotifyFireIso(notifyLocal, notifyAtIso);

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
            <p className="mt-1 text-xs text-kal-muted">
              Voice uses your Dictate My Day minutes ({voiceMinuteStatus}). Typed notifications on
              the hub are unlimited.
            </p>
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

        {phase !== "preview" && phase !== "saving" ? (
          <ol className="mb-3 list-decimal space-y-1.5 pl-4 text-xs leading-relaxed text-kal-muted">
            {steps.map((s) => (
              <li key={s}>{s}</li>
            ))}
          </ol>
        ) : null}

        <label className="mb-3 block text-xs text-kal-muted">
          <span className="mb-1 block font-medium text-kal-text">Speech language</span>
          <select
            className="mt-0.5 w-full rounded-lg border border-kal-border bg-white/80 px-3 py-2 text-sm text-kal-text dark:bg-zinc-900/60"
            value={speechLang}
            onChange={(e) => setSpeechLang(e.target.value)}
            disabled={phase === "parsing" || phase === "saving" || isListening}
          >
            {SPEECH_LANG_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
            {!SPEECH_LANG_OPTIONS.some((o) => o.value === speechLang) ? (
              <option value={speechLang}>Device: {speechLang}</option>
            ) : null}
          </select>
        </label>

        {!isSupported ? (
          <p className="text-sm text-kal-muted">
            This browser does not support speech recognition. Try Chrome or the Kalnehi Android
            app.
          </p>
        ) : null}

        {voiceBlocked && phase !== "preview" && phase !== "saving" ? (
          <p className="mb-3 rounded-xl border border-amber-200/80 bg-amber-50/90 px-3 py-2 text-sm text-amber-950 dark:border-amber-900/40 dark:bg-amber-950/30 dark:text-amber-100">
            No voice minutes left. Use the notification hub to add a typed notification (unlimited).
          </p>
        ) : null}

        {isListening && speechRunsLocally === false ? (
          <p className="mb-3 rounded-xl border border-amber-200/80 bg-amber-50/90 px-3 py-2 text-xs text-amber-950 dark:border-amber-900/40 dark:bg-amber-950/35 dark:text-amber-100">
            This session is using online speech recognition (browser-dependent). A stable connection
            helps avoid errors — or switch to English (US) for on-device speech when available.
          </p>
        ) : null}

        {isListening && liveTranscript ? (
          <p className="mb-3 rounded-xl border border-kal-border/80 bg-white/60 px-3 py-2 text-sm text-kal-text dark:bg-white/5">
            <span className="text-[0.65rem] font-semibold uppercase tracking-wide text-kal-muted">
              Hearing
            </span>
            <span className="mt-1 block leading-snug">{liveTranscript}</span>
          </p>
        ) : null}

        {recognitionError ? (
          <div className="mb-3 rounded-xl border border-red-200/80 bg-red-50/90 px-3 py-2 text-sm text-red-900 dark:border-red-900/40 dark:bg-red-950/40 dark:text-red-100">
            <p className="text-[0.65rem] font-semibold uppercase tracking-wide text-red-800/90 dark:text-red-200/90">
              Microphone / speech
            </p>
            <p className="mt-1">{recognitionError}</p>
          </div>
        ) : null}

        {parseError ? (
          <div className="mb-3 rounded-xl border border-red-200/80 bg-red-50/90 px-3 py-2 text-sm text-red-900 dark:border-red-900/40 dark:bg-red-950/40 dark:text-red-100">
            <p className="text-[0.65rem] font-semibold uppercase tracking-wide text-red-800/90 dark:text-red-200/90">
              Understanding your notification
            </p>
            <p className="mt-1">{parseError}</p>
          </div>
        ) : null}

        {phase === "preview" || phase === "saving" ? (
          <div className="space-y-3">
            {voiceQuotaNote ? (
              <p className="rounded-xl border border-kal-accent/25 bg-kal-accent/5 px-3 py-2 text-xs text-kal-text-secondary">
                {voiceQuotaNote}
              </p>
            ) : null}
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
                    const v = e.target.value;
                    setNotifyLocal(v);
                    if (!v) {
                      setNotifyAtIso("");
                      return;
                    }
                    const d = new Date(v);
                    if (!Number.isNaN(d.getTime())) setNotifyAtIso(d.toISOString());
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
              <span className="font-medium">{formatNotifyPreview(effectiveNotifyIso)}</span>
            </p>
            <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap">
              <button
                type="button"
                disabled={phase === "saving" || voiceBlocked}
                onClick={() => {
                  clearRecognitionError();
                  setParseError(null);
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
                setParseError(null);
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
            <p className="max-w-sm text-center text-sm text-kal-muted">
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

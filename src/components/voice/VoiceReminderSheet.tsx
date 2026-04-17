"use client";

import { format, parseISO } from "date-fns";
import clsx from "clsx";
import { Loader2, Mic, MicOff, X } from "lucide-react";
import { useCallback, useEffect, useState } from "react";

import { useDeviceSpeechRecognition } from "@/hooks/useDeviceSpeechRecognition";
import { getSupabaseBrowserClient } from "@/lib/supabase";
import { useVoiceReminderStore } from "@/store/useVoiceReminderStore";

type Phase = "idle" | "parsing" | "preview" | "saving";

function formatReminderPreview(iso: string): string {
  try {
    const d = parseISO(iso);
    if (Number.isNaN(d.getTime())) return iso;
    return format(d, "MMM d, yyyy · h:mm a");
  } catch {
    return iso;
  }
}

export function VoiceReminderSheet() {
  const open = useVoiceReminderStore((s) => s.open);
  const closeSheet = useVoiceReminderStore((s) => s.closeSheet);

  const [lang] = useState("en-IN");
  const [phase, setPhase] = useState<Phase>("idle");
  const [error, setError] = useState<string | null>(null);
  const [title, setTitle] = useState("");
  const [remindAtIso, setRemindAtIso] = useState("");
  const [subject, setSubject] = useState<string | null>(null);
  const [groqModel, setGroqModel] = useState<string | null>(null);

  const resetDraft = useCallback(() => {
    setTitle("");
    setRemindAtIso("");
    setSubject(null);
    setGroqModel(null);
    setError(null);
    setPhase("idle");
  }, []);

  useEffect(() => {
    if (!open) {
      resetDraft();
    }
  }, [open, resetDraft]);

  const parseTranscript = useCallback(async (transcript: string) => {
    const cleaned = transcript.trim();
    if (!cleaned) {
      setError("No speech captured. Try again.");
      setPhase("idle");
      return;
    }
    setPhase("parsing");
    setError(null);
    try {
      const tz =
        typeof Intl !== "undefined"
          ? Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC"
          : "UTC";
      const res = await fetch("/api/voice-reminder/parse", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          transcript: cleaned,
          ianaTimeZone: tz,
          nowIso: new Date().toISOString(),
        }),
      });
      const data = (await res.json()) as {
        ok?: boolean;
        error?: string;
        title?: string;
        remind_at?: string;
        subject?: string | null;
        groq_model?: string;
      };
      if (!res.ok || !data.ok) {
        setError(typeof data.error === "string" ? data.error : "Could not parse reminder.");
        setPhase("idle");
        return;
      }
      if (typeof data.title === "string" && typeof data.remind_at === "string") {
        setTitle(data.title);
        setRemindAtIso(data.remind_at);
        setSubject(typeof data.subject === "string" ? data.subject : null);
        setGroqModel(typeof data.groq_model === "string" ? data.groq_model : null);
        setPhase("preview");
      } else {
        setError("Unexpected response from server.");
        setPhase("idle");
      }
    } catch {
      setError("Network error. Check connection and try again.");
      setPhase("idle");
    }
  }, []);

  const {
    clearError: clearRecognitionError,
    error: recognitionError,
    isListening,
    isSupported,
    startListening,
    stopListening,
  } = useDeviceSpeechRecognition({
    lang,
    maxSessionMs: null,
    silenceMs: null,
    onStart: () => {
      setError(null);
    },
    onTranscript: ({ transcript }) => {
      void parseTranscript(transcript);
    },
  });

  const activeError = recognitionError ?? error;

  const handleConfirm = useCallback(async () => {
    if (!title.trim() || !remindAtIso) return;
    setPhase("saving");
    setError(null);
    try {
      const supabase = getSupabaseBrowserClient();
      /** `user_reminders` exists in DB; regenerate `Database` types when schema is finalized. */
      const reminderDb = supabase as unknown as {
        from: (name: string) => {
          insert: (
            row: Record<string, unknown>,
          ) => Promise<{ error: { message: string } | null }>;
        };
      };
      const { error: insErr } = await reminderDb.from("user_reminders").insert({
        title: title.trim(),
        remind_at: remindAtIso,
        subject: subject?.trim() || null,
        status: "pending",
      });
      if (insErr) {
        setError(insErr.message || "Could not save reminder.");
        setPhase("preview");
        return;
      }
      closeSheet();
      resetDraft();
    } catch {
      setError("Could not save reminder.");
      setPhase("preview");
    }
  }, [title, remindAtIso, subject, closeSheet, resetDraft]);

  if (!open) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Voice reminder"
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
              Voice reminder
            </p>
            <h2 className="text-lg font-semibold text-kal-text">Speak naturally</h2>
          </div>
          <button
            type="button"
            onClick={() => {
              if (isListening) stopListening();
              closeSheet();
            }}
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-kal-border/80 bg-white/50 text-kal-muted transition hover:bg-kal-card-muted dark:bg-white/5"
            aria-label="Close voice reminder"
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

        {activeError ? (
          <p className="mb-3 rounded-xl border border-red-200/80 bg-red-50/90 px-3 py-2 text-sm text-red-900 dark:border-red-900/40 dark:bg-red-950/40 dark:text-red-100">
            {activeError}
          </p>
        ) : null}

        {phase === "preview" || phase === "saving" ? (
          <div className="space-y-4">
            <p className="text-sm leading-relaxed text-kal-text">
              Set reminder:{" "}
              <span className="font-semibold text-kal-accent-dark">{title}</span>
              {" · "}
              <span className="font-medium">{formatReminderPreview(remindAtIso)}</span>
              {subject ? (
                <>
                  {" "}
                  <span className="text-kal-muted">({subject})</span>
                </>
              ) : null}
              ?
            </p>
            <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap">
              <button
                type="button"
                disabled={phase === "saving"}
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
                onClick={handleConfirm}
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
              disabled={!isSupported || phase === "parsing"}
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
              aria-label={isListening ? "Stop listening" : "Start voice reminder"}
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
                  ? "Turning your words into a reminder…"
                  : "Tap the mic, say your reminder, then tap again to finish."}
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

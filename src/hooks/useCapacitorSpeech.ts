"use client";

/**
 * useCapacitorSpeech — on-device STT via `@capacitor-community/speech-recognition`.
 *
 * Active when `useVoiceSttRouting().useNativeCapacitorStt` (Capacitor Android shell).
 * Text post-transcript flows to server parse/command routes (Groq structured), not `/api/voice-transcribe`.
 *
 * - variant "command": single-shot session (short phrases, no partial UI).
 * - variant "longForm": partial results + trailing silence after last partial.
 */

import type { PluginListenerHandle } from "@capacitor/core";
import { useCallback, useEffect, useRef, useState } from "react";

import {
  VOICE_LONG_FORM_MAX_SESSION_MS,
  VOICE_LONG_FORM_SILENCE_MS,
  VOICE_MAX_SESSION_MS,
} from "@/lib/voiceConstants";

type TranscriptPayload = {
  transcript: string;
  occurredAt: string;
  durationSeconds: number;
};

export type CapacitorSpeechVariant = "command" | "longForm";

type Options = {
  onTranscript: (payload: TranscriptPayload) => void;
  /** Wall-clock safety cap. Defaults by variant. */
  maxMs?: number;
  /** BCP-47 language tag, e.g. "en-IN", "hi-IN". Defaults to "en-IN". */
  lang?: string;
  /** Short commands vs long dictation (partial + trailing silence). Default "command". */
  variant?: CapacitorSpeechVariant;
  /** After last partial, wait this long before finalizing (longForm only). Default long-form 120s; pass `VOICE_COMMAND_SILENCE_MS` from `@/lib/voiceConstants` for global commands. */
  silenceAfterSpeechMs?: number;
  /** Live partial text for UI (longForm; optional for command if enabled later). */
  onPartialTranscript?: (text: string) => void;
};

export function useCapacitorSpeech({
  onTranscript,
  maxMs: maxMsProp,
  lang = "en-IN",
  variant = "command",
  silenceAfterSpeechMs = VOICE_LONG_FORM_SILENCE_MS,
  onPartialTranscript,
}: Options) {
  const [isRecording, setIsRecording] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isMountedRef = useRef(true);
  const onTranscriptRef = useRef(onTranscript);
  const onPartialTranscriptRef = useRef(onPartialTranscript);
  const startedAtRef = useRef<number | null>(null);
  const sessionTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const trailingSilenceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const cancelledRef = useRef(false);
  const listenerHandlesRef = useRef<PluginListenerHandle[]>([]);
  const accumulatedRef = useRef("");
  const activeLongFormSessionRef = useRef(false);
  const finalizeLongFormRef = useRef<((reason: "silence" | "maxMs" | "manual") => Promise<void>) | null>(
    null,
  );
  /** Bumped when a long-form session ends or unmounts so stale partial events are ignored. */
  const partialEpochRef = useRef(0);

  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  useEffect(() => {
    onTranscriptRef.current = onTranscript;
    onPartialTranscriptRef.current = onPartialTranscript;
  }, [onTranscript, onPartialTranscript]);

  const clearSessionTimer = useCallback(() => {
    if (sessionTimerRef.current !== null) {
      clearTimeout(sessionTimerRef.current);
      sessionTimerRef.current = null;
    }
  }, []);

  const clearTrailingSilenceTimer = useCallback(() => {
    if (trailingSilenceTimerRef.current !== null) {
      clearTimeout(trailingSilenceTimerRef.current);
      trailingSilenceTimerRef.current = null;
    }
  }, []);

  const clearError = useCallback(() => setError(null), []);

  const removeSpeechListeners = useCallback(async () => {
    for (const h of listenerHandlesRef.current) {
      try {
        await h.remove();
      } catch {
        /* ignore */
      }
    }
    listenerHandlesRef.current = [];
  }, []);

  const stopRecording = useCallback(async () => {
    cancelledRef.current = true;
    clearSessionTimer();
    clearTrailingSilenceTimer();

    if (activeLongFormSessionRef.current && finalizeLongFormRef.current) {
      await finalizeLongFormRef.current("manual");
      return;
    }

    try {
      const { SpeechRecognition } = await import(
        "@capacitor-community/speech-recognition"
      );
      await SpeechRecognition.stop();
    } catch {
      // ignore — stop() can throw if recognition wasn't active
    }
    if (isMountedRef.current) setIsRecording(false);
  }, [clearSessionTimer, clearTrailingSilenceTimer]);

  const startRecording = useCallback(async () => {
    cancelledRef.current = false;
    setError(null);
    setIsRecording(true);
    startedAtRef.current = Date.now();
    accumulatedRef.current = "";

    const effectiveMaxMs =
      maxMsProp ??
      (variant === "longForm" ? VOICE_LONG_FORM_MAX_SESSION_MS : VOICE_MAX_SESSION_MS);

    try {
      const { SpeechRecognition } = await import(
        "@capacitor-community/speech-recognition"
      );

      const perms = await SpeechRecognition.checkPermissions();
      if (perms.speechRecognition !== "granted") {
        const req = await SpeechRecognition.requestPermissions();
        if (req.speechRecognition !== "granted") {
          if (isMountedRef.current) {
            setIsRecording(false);
            setError("Microphone permission denied.");
          }
          return;
        }
      }

      if (variant === "longForm") {
        partialEpochRef.current += 1;
        const partialEpoch = partialEpochRef.current;
        activeLongFormSessionRef.current = true;

        const finalizeLongForm = async (reason: "silence" | "maxMs" | "manual") => {
          if (!activeLongFormSessionRef.current) return;
          activeLongFormSessionRef.current = false;
          finalizeLongFormRef.current = null;
          clearSessionTimer();
          clearTrailingSilenceTimer();

          // Android: SpeechRecognizer delivers final hypotheses after stop() as
          // `partialResults`. We must stop first and keep listeners alive until the
          // bridge flushes — removing listeners before stop drops the final transcript.
          try {
            await SpeechRecognition.stop();
          } catch {
            /* ignore */
          }

          // Native onResults → notifyListeners("partialResults") can trail the stop() resolve.
          await new Promise((r) => setTimeout(r, 480));

          partialEpochRef.current += 1;
          await removeSpeechListeners();

          const transcript = accumulatedRef.current.trim();
          const durationSeconds = startedAtRef.current
            ? Math.max(1, (Date.now() - startedAtRef.current) / 1000)
            : 1;
          startedAtRef.current = null;

          if (!isMountedRef.current) return;
          setIsRecording(false);

          if (transcript) {
            onTranscriptRef.current({
              transcript,
              occurredAt: new Date().toISOString(),
              durationSeconds,
            });
          } else if (reason === "manual") {
            // User stopped with nothing captured — quiet cancel
          } else {
            setError("No speech captured. Try again.");
          }
        };

        finalizeLongFormRef.current = finalizeLongForm;

        const resetTrailingSilence = () => {
          clearTrailingSilenceTimer();
          trailingSilenceTimerRef.current = setTimeout(() => {
            void finalizeLongForm("silence");
          }, silenceAfterSpeechMs);
        };

        const partialHandle = await SpeechRecognition.addListener(
          "partialResults",
          (ev: { matches: string[] }) => {
            if (partialEpoch !== partialEpochRef.current) return;
            const next = (ev.matches?.[0] ?? "").trim();
            if (!next) return;
            accumulatedRef.current = next;
            onPartialTranscriptRef.current?.(next);
            resetTrailingSilence();
          },
        );
        listenerHandlesRef.current.push(partialHandle);

        sessionTimerRef.current = setTimeout(() => {
          void finalizeLongForm("maxMs");
        }, effectiveMaxMs);

        await SpeechRecognition.start({
          language: lang,
          maxResults: 5,
          partialResults: true,
          popup: false,
        });

        return;
      }

      // ─── Command variant: single-shot ─────────────────────────────────────
      sessionTimerRef.current = setTimeout(() => {
        void stopRecording();
      }, effectiveMaxMs);

      const { matches } = await SpeechRecognition.start({
        language: lang,
        maxResults: 1,
        partialResults: false,
        popup: false,
      });

      clearSessionTimer();

      if (cancelledRef.current) return;

      const transcript = (matches?.[0] ?? "").trim();
      const durationSeconds = startedAtRef.current
        ? Math.max(1, (Date.now() - startedAtRef.current) / 1000)
        : 1;
      startedAtRef.current = null;

      if (!isMountedRef.current) return;
      setIsRecording(false);

      if (transcript) {
        onTranscriptRef.current({
          transcript,
          occurredAt: new Date().toISOString(),
          durationSeconds,
        });
      } else {
        setError("No speech captured. Try again.");
      }
    } catch (e) {
      clearSessionTimer();
      clearTrailingSilenceTimer();
      partialEpochRef.current += 1;
      await removeSpeechListeners();
      activeLongFormSessionRef.current = false;
      finalizeLongFormRef.current = null;
      startedAtRef.current = null;
      if (cancelledRef.current || !isMountedRef.current) return;
      setIsRecording(false);
      const msg = e instanceof Error ? e.message.toLowerCase() : "";
      if (msg.includes("no match") || msg.includes("no speech")) {
        setError("No speech captured. Try again.");
      } else {
        setError("Speech recognition failed. Try again.");
      }
    }
  }, [
    variant,
    lang,
    maxMsProp,
    silenceAfterSpeechMs,
    stopRecording,
    clearSessionTimer,
    clearTrailingSilenceTimer,
    removeSpeechListeners,
  ]);

  useEffect(() => {
    return () => {
      clearSessionTimer();
      clearTrailingSilenceTimer();
      partialEpochRef.current += 1;
      void (async () => {
        await removeSpeechListeners();
        try {
          const { SpeechRecognition } = await import(
            "@capacitor-community/speech-recognition"
          );
          await SpeechRecognition.stop();
        } catch {
          /* ignore */
        }
      })();
    };
  }, [clearSessionTimer, clearTrailingSilenceTimer, removeSpeechListeners]);

  return {
    isRecording,
    isTranscribing: false as const,
    error,
    clearError,
    startRecording,
    stopRecording,
    isSupported: true as const,
  };
}

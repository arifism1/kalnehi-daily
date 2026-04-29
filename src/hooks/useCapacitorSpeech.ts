"use client";

/**
 * useCapacitorSpeech
 *
 * Wraps @capacitor-community/speech-recognition to provide free, on-device
 * speech-to-text on Android via the native SpeechRecognizer API (Google's
 * built-in engine). Drop-in replacement for useMediaRecorderVoice in the
 * Android path — same return shape, no Groq API calls, no quota cost.
 */

import { useCallback, useEffect, useRef, useState } from "react";

import { VOICE_MAX_SESSION_MS } from "@/lib/voiceConstants";

type TranscriptPayload = {
  transcript: string;
  occurredAt: string;
  durationSeconds: number;
};

type Options = {
  onTranscript: (payload: TranscriptPayload) => void;
  maxMs?: number;
  /** BCP-47 language tag, e.g. "en-IN", "hi-IN". Defaults to "en-IN". */
  lang?: string;
};

export function useCapacitorSpeech({
  onTranscript,
  maxMs = VOICE_MAX_SESSION_MS,
  lang = "en-IN",
}: Options) {
  const [isRecording, setIsRecording] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isMountedRef = useRef(true);
  const onTranscriptRef = useRef(onTranscript);
  const startedAtRef = useRef<number | null>(null);
  const sessionTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  // Set to true when stopRecording() is called so the start() promise knows
  // the session was intentionally cancelled and should not call onTranscript.
  const cancelledRef = useRef(false);

  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  useEffect(() => {
    onTranscriptRef.current = onTranscript;
  }, [onTranscript]);

  const clearTimer = useCallback(() => {
    if (sessionTimerRef.current !== null) {
      clearTimeout(sessionTimerRef.current);
      sessionTimerRef.current = null;
    }
  }, []);

  const clearError = useCallback(() => setError(null), []);

  const stopRecording = useCallback(async () => {
    cancelledRef.current = true;
    clearTimer();
    try {
      const { SpeechRecognition } = await import(
        "@capacitor-community/speech-recognition"
      );
      await SpeechRecognition.stop();
    } catch {
      // ignore — stop() can throw if recognition wasn't active
    }
    if (isMountedRef.current) setIsRecording(false);
  }, [clearTimer]);

  const startRecording = useCallback(async () => {
    cancelledRef.current = false;
    setError(null);
    setIsRecording(true);
    startedAtRef.current = Date.now();

    try {
      const { SpeechRecognition } = await import(
        "@capacitor-community/speech-recognition"
      );

      // Ensure permission is granted.
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

      // Safety: auto-stop if user forgets to tap Stop.
      sessionTimerRef.current = setTimeout(() => {
        void stopRecording();
      }, maxMs);

      const { matches } = await SpeechRecognition.start({
        language: lang,
        maxResults: 1,
        partialResults: false,
        popup: false,
      });

      clearTimer();

      // Session was cancelled via stopRecording() while start() was pending.
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
      clearTimer();
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
  }, [lang, maxMs, stopRecording, clearTimer]);

  // Cleanup on unmount.
  useEffect(() => {
    return () => {
      clearTimer();
    };
  }, [clearTimer]);

  return {
    isRecording,
    /** Always false — native STT returns the transcript synchronously, no
     *  separate upload/transcription step unlike Whisper. */
    isTranscribing: false as const,
    error,
    clearError,
    startRecording,
    stopRecording,
    /** Always true in native Android context. */
    isSupported: true as const,
  };
}

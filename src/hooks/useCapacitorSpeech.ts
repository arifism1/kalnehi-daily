"use client";

/**
 * useCapacitorSpeech — stubbed for PWA-only distribution.
 *
 * The Capacitor native shell and `@capacitor-community/speech-recognition` have been removed.
 * Kalnehi's voice routing always uses `useMediaRecorderVoice` + `/api/voice-transcribe` on web
 * (controlled by `useNativeCapacitorStt` being false in `useVoiceSttRouting`), so this hook
 * is never started. It is kept as a no-op stub for interface compatibility.
 */

import { useCallback } from "react";

export type CapacitorSpeechVariant = "command" | "longForm";

type TranscriptPayload = {
  transcript: string;
  occurredAt: string;
  durationSeconds: number;
};

type Options = {
  onTranscript: (payload: TranscriptPayload) => void;
  maxMs?: number;
  lang?: string;
  variant?: CapacitorSpeechVariant;
  silenceAfterSpeechMs?: number;
  onPartialTranscript?: (text: string) => void;
};

export function useCapacitorSpeech(_options: Options) {
  const startRecording = useCallback(async () => {
    // no-op: native speech recognition not available in PWA mode
  }, []);

  const stopRecording = useCallback(async () => {
    // no-op
  }, []);

  const clearError = useCallback(() => {
    // no-op
  }, []);

  return {
    isRecording: false as const,
    isTranscribing: false as const,
    error: null,
    clearError,
    startRecording,
    stopRecording,
    isSupported: false as const,
  };
}

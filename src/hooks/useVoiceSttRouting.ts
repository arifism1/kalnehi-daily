"use client";

import { useMemo } from "react";

import { usePlatform } from "@/hooks/usePlatform";

export type VoiceSttRouting = {
  /** True when `navigator.userAgent` matches Android. */
  isAndroidUa: boolean;
  /** Kalnehi Capacitor native shell (`Capacitor.isNativePlatform()`). */
  isNativeApp: boolean;
  /**
   * Retained for call-site branching. **Always false** — Android shell uses Whisper (same as Chrome on Android).
   */
  useNativeCapacitorStt: boolean;
  /**
   * **Any Android** User-Agent (Kalnehi app shell or browser): MediaRecorder → `/api/voice-transcribe` (Groq).
   */
  useAndroidWhisperStt: boolean;
  /** @deprecated Alias of `useAndroidWhisperStt`. */
  useBrowserWhisperStt: boolean;
  /** Desktop / iPhone Safari / etc.: Web Speech API. */
  useWebSpeechStt: boolean;
};

/**
 * Voice capture routing:
 *
 * | Where | STT | Server |
 * |-------|-----|--------|
 * | **Any Android** (`isAndroidUa`, app shell or Chrome) | MediaRecorder upload | Groq **transcribe** (`/api/voice-transcribe`), then parse/command APIs |
 * | **Normal browser** (`!isApp`, not Android UA) | Web Speech | Text-only → Groq for structure |
 *
 * On iOS shell (`isApp && !isAndroidUa`), Whisper and native flags are both false → Web Speech in components.
 *
 * `useWebSpeechStt` is `!isApp && !isAndroidUa`.
 */
export function useVoiceSttRouting(): VoiceSttRouting {
  const { isApp } = usePlatform();

  return useMemo(() => {
    const isAndroidUa =
      typeof navigator !== "undefined" && /Android/i.test(navigator.userAgent);

    const useNativeCapacitorStt = false;
    const useAndroidWhisperStt = isAndroidUa;
    const useWebSpeechStt = !isApp && !isAndroidUa;

    return {
      isAndroidUa,
      isNativeApp: isApp,
      useNativeCapacitorStt,
      /** @deprecated Prefer `useAndroidWhisperStt` — retained for call-site compatibility. */
      useBrowserWhisperStt: useAndroidWhisperStt,
      useAndroidWhisperStt,
      useWebSpeechStt,
    };
  }, [isApp]);
}

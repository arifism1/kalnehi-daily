"use client";

import { useMemo } from "react";

import { usePlatform } from "@/hooks/usePlatform";

export type VoiceSttRouting = {
  /** True when `navigator.userAgent` matches Android. */
  isAndroidUa: boolean;
  /** Kalnehi Capacitor shell — native plugins available. */
  isNativeApp: boolean;
  /** `@capacitor-community/speech-recognition` (native STT). */
  useNativeCapacitorStt: boolean;
  /** Android mobile browsers: Web Speech disabled (`useDeviceSpeechRecognition`) → MediaRecorder + `/api/voice-transcribe`. */
  useBrowserWhisperStt: boolean;
  /** Desktop / iPhone Safari / etc.: Web Speech API. */
  useWebSpeechStt: boolean;
};

/**
 * Routes voice capture across native Capacitor STT, browser Whisper upload, and Web Speech.
 * Do not use `/Android/` UA alone as a proxy for the Play Store shell.
 */
export function useVoiceSttRouting(): VoiceSttRouting {
  const { isApp } = usePlatform();

  return useMemo(() => {
    const isAndroidUa =
      typeof navigator !== "undefined" && /Android/i.test(navigator.userAgent);

    const useNativeCapacitorStt = isApp;
    const useBrowserWhisperStt = isAndroidUa && !isApp;
    const useWebSpeechStt = !isApp && !isAndroidUa;

    return {
      isAndroidUa,
      isNativeApp: isApp,
      useNativeCapacitorStt,
      useBrowserWhisperStt,
      useWebSpeechStt,
    };
  }, [isApp]);
}

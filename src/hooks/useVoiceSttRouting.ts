"use client";

import { Capacitor } from "@capacitor/core";
import { useMemo } from "react";

import { usePlatform } from "@/hooks/usePlatform";
import {
  getSpeechRecognitionCtor,
  isAndroidWebViewUserAgent,
} from "@/lib/androidWebSpeechEnv";

export type VoiceSttRouting = {
  /** True when `navigator.userAgent` matches Android. */
  isAndroidUa: boolean;
  /** Kalnehi Capacitor native shell (`Capacitor.isNativePlatform()`). */
  isNativeApp: boolean;
  /** `@capacitor-community/speech-recognition` on Android Capacitor shell. */
  useNativeCapacitorStt: boolean;
  /**
   * Android when Web Speech is unsafe or missing: MediaRecorder → `/api/voice-transcribe` (Groq).
   * Regular Android Chrome / PWA uses Web Speech first when API exists.
   */
  useAndroidWhisperStt: boolean;
  /** @deprecated Alias of `useAndroidWhisperStt`. */
  useBrowserWhisperStt: boolean;
  /** Web Speech API (device / browser STT); includes Android Chrome when ctor exists and not WebView. */
  useWebSpeechStt: boolean;
};

/**
 * Voice capture routing:
 *
 * | Where | Primary STT | Fallback |
 * |-------|-------------|----------|
 * | **Capacitor Android** | Native speech recognition plugin | MediaRecorder → `/api/voice-transcribe` |
 * | **Android Chrome / PWA** | Web Speech (when ctor exists) | MediaRecorder → `/api/voice-transcribe` |
 * | **Android WebView** (`; wv)` in UA, not app) | Whisper only | — |
 * | **Desktop / iOS Safari** | Web Speech | Whisper (e.g. global sheet on errors) |
 */
export function useVoiceSttRouting(): VoiceSttRouting {
  const { isApp } = usePlatform();

  return useMemo(() => {
    const ua = typeof navigator !== "undefined" ? navigator.userAgent : "";
    const isAndroidUa = /Android/i.test(ua);
    const androidWebView = isAndroidWebViewUserAgent(ua);
    const ctorAvailable =
      typeof window !== "undefined" && Boolean(getSpeechRecognitionCtor(window));

    const useNativeCapacitorStt =
      isApp && Capacitor.getPlatform() === "android";
    const useAndroidWhisperStt =
      isAndroidUa && (androidWebView || !ctorAvailable) && !useNativeCapacitorStt;
    const useWebSpeechStt = !isApp && !useAndroidWhisperStt && ctorAvailable;

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

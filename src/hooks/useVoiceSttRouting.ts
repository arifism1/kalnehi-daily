"use client";

import { useMemo } from "react";

import { usePlatform } from "@/hooks/usePlatform";
import { isAndroidWebViewUserAgent } from "@/lib/androidWebSpeechEnv";

export type VoiceSttRouting = {
  /** True when `navigator.userAgent` matches Android. */
  isAndroidUa: boolean;
  /** Kalnehi Capacitor native shell (`Capacitor.isNativePlatform()`). */
  isNativeApp: boolean;
  /**
   * Retained for call-site branching. **Always false** — Capacitor shell removed.
   */
  useNativeCapacitorStt: boolean;
  /**
   * Android when Web Speech is unsafe or missing: MediaRecorder → `/api/voice-transcribe` (Groq).
   * Regular Android Chrome / PWA uses Web Speech first (same as desktop Chrome) when API exists.
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
 * | **Android Chrome / PWA** | Web Speech (same family as Mac Chrome) | MediaRecorder → `/api/voice-transcribe` |
 * | **Android WebView** (`; wv)` in UA) | Whisper only (Web Speech stub/crash risk) | — |
 * | **Desktop / iOS Safari** | Web Speech | Whisper (e.g. global sheet on errors) |
 *
 * `usePlatform().isApp` is always false (PWA distribution); hook kept for compatibility.
 */
export function useVoiceSttRouting(): VoiceSttRouting {
  const { isApp } = usePlatform();

  return useMemo(() => {
    const ua = typeof navigator !== "undefined" ? navigator.userAgent : "";
    const isAndroidUa = /Android/i.test(ua);
    const androidWebView = isAndroidWebViewUserAgent(ua);
    const ctorAvailable =
      typeof window !== "undefined" &&
      !!(window.SpeechRecognition ?? window.webkitSpeechRecognition);

    const useNativeCapacitorStt = false;
    const useAndroidWhisperStt = isAndroidUa && (androidWebView || !ctorAvailable);
    const useWebSpeechStt =
      !isApp && !useAndroidWhisperStt && ctorAvailable;

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

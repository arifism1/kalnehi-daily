"use client";

import { useEffect, useRef, useState } from "react";

import { useVoiceCommandStore } from "@/store/useVoiceCommandStore";

// Group 1: "Kalnehi" phonetic variants (covers common STT mishearings)
const KALNEHI_PHRASES = [
  "hi kalnehi",  "hey kalnehi",
  "hi kalnahi",  "hey kalnahi",
  "hi kalni",    "hey kalni",
  "hi kalney",   "hey kalney",
  "hi calnahi",  "hey calnahi",
  "hi colney",   "hey colney",
];

// Group 2: short "boss" trigger phrases
const BOSS_PHRASES = [
  "hey boss", "ok boss", "okay boss",
  "yo boss",  "hi boss", "aye boss",
];

function containsWakeWord(text: string): boolean {
  // Strip punctuation so "Hi, Kalnehi" (comma added by Chrome STT) still matches
  const t = text.toLowerCase().replace(/[^a-z0-9\s]/g, "").replace(/\s+/g, " ").trim();

  if (KALNEHI_PHRASES.some((p) => t.includes(p))) return true;
  if (BOSS_PHRASES.some((p) => t.includes(p))) return true;

  // Loose proximity check: catches split-word transcriptions like "hi kal nehi"
  const hasGreeting = /\b(hi|hey|ok|yo)\b/.test(t);
  const hasKalStem = /\bkal/.test(t) || /\bcal/.test(t) || /\bkol/.test(t);
  return hasGreeting && hasKalStem;
}

function getSpeechRecognitionCtor(): typeof window.SpeechRecognition | null {
  if (typeof window === "undefined") return null;
  return (
    (window as Window & typeof globalThis).SpeechRecognition ??
    (window as Window & typeof globalThis & { webkitSpeechRecognition?: typeof window.SpeechRecognition }).webkitSpeechRecognition ??
    null
  );
}

type UseWakeWordResult = {
  /** True when the wake word listener is actively receiving audio. */
  isListening: boolean;
  /** True if browser doesn't support SpeechRecognition. */
  isUnsupported: boolean;
};

/**
 * Runs a lightweight continuous SpeechRecognition loop that only watches for
 * "Hi/Hey Kalnehi" in transcripts. When detected, opens the voice command sheet.
 *
 * Pauses automatically when:
 * - `enabled` is false
 * - The tab is hidden (`document.visibilityState === "hidden"`)
 * - The voice command sheet is already open
 */
export function useWakeWord(enabled: boolean): UseWakeWordResult {
  const openVoice = useVoiceCommandStore((s) => s.open);
  const voiceOpen = useVoiceCommandStore((s) => s.isOpen);
  const isMicBusy = useVoiceCommandStore((s) => s.isMicBusy);

  const [isListening, setIsListening] = useState(false);
  const [isUnsupported, setIsUnsupported] = useState(false);

  // Stable refs so the running recognition closure always reads fresh values
  const openVoiceRef = useRef(openVoice);
  useEffect(() => { openVoiceRef.current = openVoice; }, [openVoice]);

  // Pause when the voice command sheet is open or any other voice input has the mic.
  const shouldBeActive = enabled && !voiceOpen && !isMicBusy;

  useEffect(() => {
    if (!shouldBeActive) {
      setIsListening(false);
      return;
    }

    const Ctor = getSpeechRecognitionCtor();
    if (!Ctor) {
      setIsUnsupported(true);
      return;
    }

    let recognition: SpeechRecognition | null = null;
    let dead = false; // set true when effect cleanup runs
    let restartTimer: ReturnType<typeof setTimeout> | null = null;
    let warmStream: MediaStream | null = null;

    function clearRestartTimer() {
      if (restartTimer !== null) {
        clearTimeout(restartTimer);
        restartTimer = null;
      }
    }

    function abortCurrent() {
      const r = recognition;
      recognition = null;
      if (r) {
        try {
          r.onstart = null;
          r.onresult = null;
          r.onend = null;
          r.onerror = null;
          r.abort();
        } catch {
          // ignore
        }
      }
      setIsListening(false);
    }

    function scheduleRestart(delayMs: number) {
      clearRestartTimer();
      restartTimer = setTimeout(() => {
        restartTimer = null;
        if (!dead && !document.hidden) start();
      }, delayMs);
    }

    function start() {
      if (dead || document.hidden || recognition !== null) return;

      const r = new Ctor!();
      recognition = r;

      r.continuous = true;
      r.interimResults = true;
      r.maxAlternatives = 1;

      r.onstart = () => {
        if (!dead) setIsListening(true);
      };

      r.onresult = (event: SpeechRecognitionEvent) => {
        for (let i = event.resultIndex; i < event.results.length; i++) {
          const chunk = event.results[i]?.[0]?.transcript ?? "";
          if (containsWakeWord(chunk)) {
            // Wake word found — abort listener and open voice command sheet
            dead = true; // prevent re-start from onend
            abortCurrent();
            openVoiceRef.current();
            return;
          }
        }
      };

      r.onend = () => {
        recognition = null;
        setIsListening(false);
        if (!dead) scheduleRestart(300);
      };

      r.onerror = (event: SpeechRecognitionErrorEvent) => {
        if (event.error === "aborted") return;
        recognition = null;
        setIsListening(false);
        if (!dead) scheduleRestart(1500);
      };

      try {
        r.start();
      } catch {
        recognition = null;
        setIsListening(false);
        if (!dead) scheduleRestart(2000);
      }
    }

    function handleVisibility() {
      if (document.hidden) {
        clearRestartTimer();
        abortCurrent();
        warmStream?.getTracks().forEach((t) => t.stop());
        warmStream = null;
      } else {
        // Reacquire warm stream then restart recognition
        navigator.mediaDevices
          .getUserMedia({ audio: true, video: false })
          .then((stream) => {
            if (dead) { stream.getTracks().forEach((t) => t.stop()); return; }
            warmStream = stream;
            scheduleRestart(200);
          })
          .catch(() => {
            if (!dead) scheduleRestart(200);
          });
      }
    }

    document.addEventListener("visibilitychange", handleVisibility);

    // Acquire mic once to keep the macOS indicator solid across session restarts.
    // Without this, Chrome fully releases the mic between SpeechRecognition sessions
    // (~every 5–15 s of silence), causing the orange dot to blink on and off.
    if (!document.hidden) {
      navigator.mediaDevices
        .getUserMedia({ audio: true, video: false })
        .then((stream) => {
          if (dead) {
            stream.getTracks().forEach((t) => t.stop());
            return;
          }
          warmStream = stream;
          start();
        })
        .catch(() => {
          // Mic permission already granted or not available via getUserMedia;
          // fall back to letting SpeechRecognition handle its own permission.
          if (!dead) start();
        });
    }

    return () => {
      dead = true;
      clearRestartTimer();
      abortCurrent();
      document.removeEventListener("visibilitychange", handleVisibility);
      warmStream?.getTracks().forEach((t) => t.stop());
      warmStream = null;
    };
  }, [shouldBeActive]); // Re-runs when enabled changes or voiceOpen toggles off

  return { isListening, isUnsupported };
}

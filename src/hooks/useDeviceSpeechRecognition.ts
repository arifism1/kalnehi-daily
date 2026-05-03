"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { isAndroidWebViewUserAgent } from "@/lib/androidWebSpeechEnv";
import { VOICE_LONG_FORM_SILENCE_MS, VOICE_MAX_SESSION_MS } from "@/lib/voiceConstants";
import { useVoiceCommandStore } from "@/store/useVoiceCommandStore";

type SpeechStatus = "idle" | "listening";

type UseDeviceSpeechRecognitionOptions = {
  lang: string;
  silenceMs?: number | null;
  maxSessionMs?: number | null;
  onStart?: () => void;
  onTranscript: (payload: {
    transcript: string;
    occurredAt: string;
    /** Wall-clock seconds from speech engine start until finalize (for quota billing). */
    durationSeconds: number;
  }) => void;
  /** Called once per listen session right before `recognition.start()` (after language pack resolution). */
  onSpeechEngineInfo?: (info: { processLocally: boolean; lang: string }) => void;
  /** When true, enables interim results and calls `onPreviewTranscript` with finals + partial text (UI only). */
  interimPreview?: boolean;
  onPreviewTranscript?: (text: string) => void;
};

function getSpeechRecognitionCtor(): (typeof window)["webkitSpeechRecognition"] | null {
  if (typeof window === "undefined") return null;
  const ua = typeof navigator !== "undefined" ? navigator.userAgent : "";
  if (isAndroidWebViewUserAgent(ua)) return null;
  return window.SpeechRecognition ?? window.webkitSpeechRecognition ?? null;
}

function stopStream(stream: MediaStream | null) {
  stream?.getTracks().forEach((track) => track.stop());
}

function microphoneErrorMessage(error: unknown): string {
  const name =
    error instanceof DOMException
      ? error.name
      : typeof error === "object" &&
          error &&
          "name" in error &&
          typeof (error as { name?: unknown }).name === "string"
        ? String((error as { name: string }).name)
        : "";

  switch (name) {
    case "NotAllowedError":
    case "SecurityError":
      return "Microphone permission denied. Allow mic access in your browser settings.";
    case "NotFoundError":
    case "DevicesNotFoundError":
      return "No microphone was found on this device.";
    case "NotReadableError":
    case "TrackStartError":
      return "Your microphone is busy or unavailable. Close other apps using it and try again.";
    default:
      return "Could not start the microphone. Check permissions and try again.";
  }
}

type RecognitionCtor = NonNullable<(typeof window)["webkitSpeechRecognition"]>;

async function prepareOnDeviceRecognition(
  Ctor: RecognitionCtor,
  lang: string,
): Promise<{
  canStart: boolean;
  shouldProcessLocally: boolean;
  error: string | null;
}> {
  if (typeof Ctor.available !== "function") {
    return {
      canStart: true,
      shouldProcessLocally: false,
      error: null,
    };
  }

  try {
    const availability = await Ctor.available({
      langs: [lang],
      processLocally: true,
    });

    if (availability === "available") {
      return {
        canStart: true,
        shouldProcessLocally: true,
        error: null,
      };
    }

    if (
      (availability === "downloadable" || availability === "downloading") &&
      typeof Ctor.install === "function"
    ) {
      const installed = await Ctor.install({
        langs: [lang],
        processLocally: true,
      });
      return installed
        ? {
            canStart: true,
            shouldProcessLocally: true,
            error: null,
          }
        : {
            canStart: false,
            shouldProcessLocally: false,
            error:
              "This browser could not install the local speech pack for that language yet. Try again in a moment or switch the speech language.",
          };
    }

    return {
      canStart: true,
      shouldProcessLocally: false,
      error: null,
    };
  } catch {
    return {
      canStart: true,
      shouldProcessLocally: false,
      error: null,
    };
  }
}

export function useDeviceSpeechRecognition({
  lang,
  silenceMs = VOICE_LONG_FORM_SILENCE_MS,
  maxSessionMs = VOICE_MAX_SESSION_MS,
  onStart,
  onTranscript,
  onSpeechEngineInfo,
  interimPreview = false,
  onPreviewTranscript,
}: UseDeviceSpeechRecognitionOptions) {
  // Stable shortcut — we call getState() so we never need this in a dep array
  const setMicBusy = useCallback(
    (busy: boolean) => useVoiceCommandStore.getState().setMicBusy(busy),
    [],
  );

  const recognitionRef = useRef<SpeechRecognition | null>(null);
  const speechStartedAtMsRef = useRef<number | null>(null);
  const finalTranscriptRef = useRef("");
  /** Last `combined` (final+interim) from onresult; onend can run before a final is committed, so this preserves what the user saw. */
  const lastCombinedPreviewRef = useRef("");
  const silenceTimerRef = useRef<number | null>(null);
  const sessionTimerRef = useRef<number | null>(null);
  const suppressSubmitRef = useRef(false);
  const ignoreAbortErrorRef = useRef(false);
  const onSpeechEngineInfoRef = useRef(onSpeechEngineInfo);
  const onPreviewTranscriptRef = useRef(onPreviewTranscript);
  const interimPreviewRef = useRef(interimPreview);
  const hadSpeechSegmentRef = useRef(false);
  const [status, setStatus] = useState<SpeechStatus>("idle");
  const [error, setError] = useState<string | null>(null);
  /** True after `onspeechend` in this session; requires a prior `onspeechstart`. For UI (e.g. "tap mic when done"). */
  const [speechPausedAfterUtterance, setSpeechPausedAfterUtterance] = useState(false);

  useEffect(() => {
    onSpeechEngineInfoRef.current = onSpeechEngineInfo;
    onPreviewTranscriptRef.current = onPreviewTranscript;
    interimPreviewRef.current = interimPreview;
  }, [onSpeechEngineInfo, onPreviewTranscript, interimPreview]);

  const isSupported = useMemo(() => Boolean(getSpeechRecognitionCtor()), []);

  useEffect(() => {
    if (status === "idle") setSpeechPausedAfterUtterance(false);
  }, [status]);

  const clearTimers = useCallback(() => {
    if (silenceTimerRef.current !== null) {
      window.clearTimeout(silenceTimerRef.current);
      silenceTimerRef.current = null;
    }
    if (sessionTimerRef.current !== null) {
      window.clearTimeout(sessionTimerRef.current);
      sessionTimerRef.current = null;
    }
  }, []);

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  const stopRecognition = useCallback(
    (mode: "stop" | "abort", suppressSubmit: boolean) => {
      const recognition = recognitionRef.current;
      if (!recognition) return;
      suppressSubmitRef.current = suppressSubmit;
      ignoreAbortErrorRef.current = mode === "abort";
      clearTimers();
      if (suppressSubmit) {
        recognition.onend = null;
        recognition.onerror = null;
        recognition.onresult = null;
        recognition.onstart = null;
        recognition.onspeechend = null;
        recognition.onspeechstart = null;
        recognitionRef.current = null;
      }
      try {
        if (mode === "stop") recognition.stop();
        else recognition.abort();
      } catch {
        recognitionRef.current = null;
        setStatus("idle");
      }
    },
    [clearTimers],
  );

  const scheduleSilenceStop = useCallback(() => {
    if (silenceMs == null || silenceMs <= 0) return;
    if (silenceTimerRef.current !== null) {
      window.clearTimeout(silenceTimerRef.current);
    }
    silenceTimerRef.current = window.setTimeout(() => {
      stopRecognition("stop", false);
    }, silenceMs);
  }, [silenceMs, stopRecognition]);

  const finalizeSession = useCallback(() => {
    clearTimers();
    recognitionRef.current = null;
    setStatus("idle");
    setMicBusy(false);

    const fromPreview = lastCombinedPreviewRef.current.trim();
    const fromFinal = finalTranscriptRef.current.trim();
    const transcript = (fromPreview || fromFinal).trim();
    lastCombinedPreviewRef.current = "";
    finalTranscriptRef.current = "";

    const suppressSubmit = suppressSubmitRef.current;
    suppressSubmitRef.current = false;
    ignoreAbortErrorRef.current = false;

    if (suppressSubmit) {
      speechStartedAtMsRef.current = null;
      onPreviewTranscriptRef.current?.("");
      return;
    }
    if (!transcript) {
      speechStartedAtMsRef.current = null;
      onPreviewTranscriptRef.current?.("");
      setError("No speech captured. Try again.");
      return;
    }

    const startedMs = speechStartedAtMsRef.current;
    speechStartedAtMsRef.current = null;
    const durationSeconds =
      startedMs != null ? Math.max(0, (Date.now() - startedMs) / 1000) : 0;
    onTranscript({
      transcript,
      occurredAt: new Date().toISOString(),
      durationSeconds,
    });
    onPreviewTranscriptRef.current?.("");
  }, [clearTimers, onTranscript, setMicBusy]);

  const requestMicPermission = useCallback(async (): Promise<string | null> => {
    if (typeof window !== "undefined" && !window.isSecureContext) {
      return "Microphone access needs HTTPS or localhost.";
    }
    if (
      typeof navigator === "undefined" ||
      !navigator.mediaDevices ||
      typeof navigator.mediaDevices.getUserMedia !== "function"
    ) {
      return null;
    }

    let stream: MediaStream | null = null;
    try {
      stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      return null;
    } catch (permissionError) {
      return microphoneErrorMessage(permissionError);
    } finally {
      stopStream(stream);
    }
  }, []);

  const startListening = useCallback(async () => {
    const Ctor = getSpeechRecognitionCtor();
    if (!Ctor) {
      setError(
        "This browser does not support device speech recognition. Try Google Chrome (including Install app / PWA on Android).",
      );
      return;
    }

    setError(null);
    stopRecognition("abort", true);

    const permissionError = await requestMicPermission();
    if (permissionError) {
      setError(permissionError);
      return;
    }

    const prepared = await prepareOnDeviceRecognition(Ctor, lang);
    if (!prepared.canStart) {
      setError(prepared.error);
      return;
    }

    finalTranscriptRef.current = "";
    lastCombinedPreviewRef.current = "";
    speechStartedAtMsRef.current = null;
    suppressSubmitRef.current = false;
    ignoreAbortErrorRef.current = false;
    onPreviewTranscriptRef.current?.("");

    const recognition = new Ctor();
    recognitionRef.current = recognition;
    recognition.continuous = true;
    recognition.interimResults = interimPreviewRef.current;
    recognition.lang = lang;
    recognition.maxAlternatives = 1;
    if (prepared.shouldProcessLocally && "processLocally" in recognition) {
      recognition.processLocally = true;
    }

    recognition.onstart = () => {
      hadSpeechSegmentRef.current = false;
      setSpeechPausedAfterUtterance(false);
      speechStartedAtMsRef.current = Date.now();
      setStatus("listening");
      onStart?.();
      if (silenceMs != null && silenceMs > 0) scheduleSilenceStop();
    };

    recognition.onspeechstart = () => {
      hadSpeechSegmentRef.current = true;
      setSpeechPausedAfterUtterance(false);
      if (silenceMs == null || silenceMs <= 0) return;
      if (silenceTimerRef.current !== null) {
        window.clearTimeout(silenceTimerRef.current);
        silenceTimerRef.current = null;
      }
    };

    recognition.onspeechend = () => {
      if (silenceMs != null && silenceMs > 0) scheduleSilenceStop();
      if (hadSpeechSegmentRef.current) setSpeechPausedAfterUtterance(true);
    };

    recognition.onresult = (event: SpeechRecognitionEvent) => {
      let heardSpeech = false;
      let interimPiece = "";
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const result = event.results[i];
        const chunk = result[0]?.transcript?.trim();
        if (!chunk) continue;
        heardSpeech = true;
        if (result.isFinal) {
          finalTranscriptRef.current = finalTranscriptRef.current
            ? `${finalTranscriptRef.current} ${chunk}`
            : chunk;
        } else if (interimPreviewRef.current) {
          interimPiece += result[0]?.transcript ?? "";
        }
      }
      if (interimPreviewRef.current) {
        const combined = [finalTranscriptRef.current, interimPiece.trim()]
          .filter(Boolean)
          .join(" ")
          .trim();
        lastCombinedPreviewRef.current = combined;
        onPreviewTranscriptRef.current?.(combined);
      }
      if (heardSpeech && silenceMs != null && silenceMs > 0) scheduleSilenceStop();
    };

    recognition.onerror = (event: SpeechRecognitionErrorEvent) => {
      if (event.error === "aborted" && ignoreAbortErrorRef.current) {
        return;
      }
      if (event.error === "no-speech") {
        setError("No speech captured. Try again.");
      } else if (event.error === "not-allowed") {
        setError("Microphone permission denied. Allow mic access in your browser settings.");
      } else if (event.error === "network") {
        setError(
          prepared.shouldProcessLocally
            ? "On-device speech hit a glitch. Wait a moment, then try again."
            : "Speech is using an online service and the connection failed. Check Wi‑Fi or VPN, try English (US) in the language menu, or add the notification by typing.",
        );
      } else {
        setError(`Speech recognition error: ${event.error}`);
      }
      suppressSubmitRef.current = true;
      onPreviewTranscriptRef.current?.("");
      clearTimers();
      setSpeechPausedAfterUtterance(false);
      setStatus("idle");
      setMicBusy(false);
    };

    recognition.onend = () => {
      finalizeSession();
    };

    try {
      onSpeechEngineInfoRef.current?.({
        processLocally: prepared.shouldProcessLocally,
        lang,
      });
      setMicBusy(true);
      recognition.start();
      if (maxSessionMs != null && maxSessionMs > 0) {
        sessionTimerRef.current = window.setTimeout(() => {
          stopRecognition("stop", false);
        }, maxSessionMs);
      }
    } catch (startError) {
      recognitionRef.current = null;
      setStatus("idle");
      setMicBusy(false);
      setError(microphoneErrorMessage(startError));
    }
  }, [
    clearTimers,
    finalizeSession,
    lang,
    maxSessionMs,
    onStart,
    requestMicPermission,
    setMicBusy,
    silenceMs,
    scheduleSilenceStop,
    stopRecognition,
  ]);

  const stopListening = useCallback(() => {
    stopRecognition("stop", false);
  }, [stopRecognition]);

  useEffect(() => {
    return () => {
      stopRecognition("abort", true);
      clearTimers();
      setMicBusy(false);
    };
  }, [clearTimers, setMicBusy, stopRecognition]);

  return {
    clearError,
    error,
    isListening: status === "listening",
    isSupported,
    speechPausedAfterUtterance,
    startListening,
    status,
    stopListening,
  };
}

"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";

type SpeechStatus = "idle" | "listening";

export type DeviceSpeechTranscriptPayload = {
  transcript: string;
  occurredAt: string;
  durationSeconds: number;
};

type UseDeviceSpeechRecognitionOptions = {
  lang: string;
  /** One retry with this language after certain recognition errors (e.g. en-US after en-IN). */
  fallbackLang?: string;
  silenceMs?: number | null;
  maxSessionMs?: number | null;
  onStart?: () => void;
  onTranscript: (payload: DeviceSpeechTranscriptPayload) => void;
};

function getSpeechRecognitionCtor(): (typeof window)["webkitSpeechRecognition"] | null {
  if (typeof window === "undefined") return null;
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

function recognitionErrorShouldTryLocaleFallback(code: string): boolean {
  return (
    code === "network" ||
    code === "language-not-supported" ||
    code === "service-not-allowed"
  );
}

export function useDeviceSpeechRecognition({
  lang,
  fallbackLang,
  silenceMs = 5_000,
  maxSessionMs = 60_000,
  onStart,
  onTranscript,
}: UseDeviceSpeechRecognitionOptions) {
  const recognitionRef = useRef<SpeechRecognition | null>(null);
  const finalTranscriptRef = useRef("");
  const silenceTimerRef = useRef<number | null>(null);
  const sessionTimerRef = useRef<number | null>(null);
  const suppressSubmitRef = useRef(false);
  const ignoreAbortErrorRef = useRef(false);
  const sessionStartedAtMsRef = useRef<number | null>(null);
  const usedFallbackRef = useRef(false);
  const [status, setStatus] = useState<SpeechStatus>("idle");
  const [error, setError] = useState<string | null>(null);

  const isSupported = useMemo(() => Boolean(getSpeechRecognitionCtor()), []);

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

    const transcript = finalTranscriptRef.current.trim();
    finalTranscriptRef.current = "";

    const suppressSubmit = suppressSubmitRef.current;
    suppressSubmitRef.current = false;
    ignoreAbortErrorRef.current = false;

    const startMs = sessionStartedAtMsRef.current;
    sessionStartedAtMsRef.current = null;

    if (suppressSubmit) return;
    if (!transcript) {
      setError("No speech captured. Try again.");
      return;
    }

    const durationSeconds =
      startMs != null ? Math.max(0, Math.round((Date.now() - startMs) / 1000)) : 0;

    onTranscript({
      transcript,
      occurredAt: new Date().toISOString(),
      durationSeconds,
    });
  }, [clearTimers, onTranscript]);

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
        "This browser does not support device speech recognition. Try Chrome or the Kalnehi Android app.",
      );
      return;
    }

    setError(null);
    stopRecognition("abort", true);
    usedFallbackRef.current = false;
    sessionStartedAtMsRef.current = null;

    const permissionError = await requestMicPermission();
    if (permissionError) {
      setError(permissionError);
      return;
    }

    const runForLang = async (activeLang: string): Promise<void> => {
      const prepared = await prepareOnDeviceRecognition(Ctor, activeLang);
      if (!prepared.canStart) {
        setError(prepared.error);
        return;
      }

      finalTranscriptRef.current = "";
      suppressSubmitRef.current = false;
      ignoreAbortErrorRef.current = false;

      const recognition = new Ctor();
      recognitionRef.current = recognition;
      recognition.continuous = true;
      recognition.interimResults = false;
      recognition.lang = activeLang;
      recognition.maxAlternatives = 1;
      if (prepared.shouldProcessLocally && "processLocally" in recognition) {
        recognition.processLocally = true;
      }

      recognition.onstart = () => {
        sessionStartedAtMsRef.current = Date.now();
        setStatus("listening");
        onStart?.();
        if (silenceMs != null && silenceMs > 0) scheduleSilenceStop();
      };

      recognition.onspeechstart = () => {
        if (silenceMs == null || silenceMs <= 0) return;
        if (silenceTimerRef.current !== null) {
          window.clearTimeout(silenceTimerRef.current);
          silenceTimerRef.current = null;
        }
      };

      recognition.onspeechend = () => {
        if (silenceMs != null && silenceMs > 0) scheduleSilenceStop();
      };

      recognition.onresult = (event: SpeechRecognitionEvent) => {
        let heardSpeech = false;
        for (let i = event.resultIndex; i < event.results.length; i++) {
          const result = event.results[i];
          const chunk = result[0]?.transcript?.trim();
          if (!chunk) continue;
          heardSpeech = true;
          if (result.isFinal) {
            finalTranscriptRef.current = finalTranscriptRef.current
              ? `${finalTranscriptRef.current} ${chunk}`
              : chunk;
          }
        }
        if (heardSpeech && silenceMs != null && silenceMs > 0) scheduleSilenceStop();
      };

      recognition.onerror = (event: SpeechRecognitionErrorEvent) => {
        if (event.error === "aborted" && ignoreAbortErrorRef.current) {
          return;
        }

        const fb = fallbackLang?.trim();
        if (
          fb &&
          fb !== activeLang &&
          !usedFallbackRef.current &&
          recognitionErrorShouldTryLocaleFallback(event.error)
        ) {
          usedFallbackRef.current = true;
          suppressSubmitRef.current = true;
          clearTimers();
          recognitionRef.current = null;
          setStatus("idle");
          sessionStartedAtMsRef.current = null;
          void runForLang(fb);
          return;
        }

        if (event.error === "no-speech") {
          setError("No speech captured. Try again.");
        } else if (event.error === "not-allowed") {
          setError("Microphone permission denied. Allow mic access in your browser settings.");
        } else if (event.error === "network") {
          setError(
            prepared.shouldProcessLocally
              ? "Speech recognition could not start on this device right now. Wait a moment and try again."
              : "This browser's speech service is unavailable right now. Try Chrome, switch the speech language, or use the Kalnehi Android app.",
          );
        } else {
          setError(`Speech recognition error: ${event.error}`);
        }
        suppressSubmitRef.current = true;
        clearTimers();
        setStatus("idle");
      };

      recognition.onend = () => {
        finalizeSession();
      };

      try {
        recognition.start();
        if (maxSessionMs != null && maxSessionMs > 0) {
          sessionTimerRef.current = window.setTimeout(() => {
            stopRecognition("stop", false);
          }, maxSessionMs);
        }
      } catch (startError) {
        recognitionRef.current = null;
        setStatus("idle");
        setError(microphoneErrorMessage(startError));
      }
    };

    await runForLang(lang);
  }, [
    clearTimers,
    fallbackLang,
    finalizeSession,
    lang,
    maxSessionMs,
    onStart,
    requestMicPermission,
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
    };
  }, [clearTimers, stopRecognition]);

  return {
    clearError,
    error,
    isListening: status === "listening",
    isSupported,
    startListening,
    status,
    stopListening,
  };
}

"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import {
  getSpeechRecognitionCtor,
  isAndroidChromeLikeSpeechHost,
} from "@/lib/androidWebSpeechEnv";
import {
  VOICE_ANDROID_COMMAND_MAX_SESSION_MS,
  VOICE_ANDROID_MAX_ENGINE_RESTARTS,
  VOICE_ANDROID_ONEND_RESTART_JITTER_MS,
  VOICE_ANDROID_PRE_START_DELAY_MS,
  VOICE_ANDROID_SESSION_BUMP_BELOW_MS,
  VOICE_ANDROID_SPEECH_END_GRACE_MS,
  VOICE_ANDROID_TRAILING_SILENCE_MS,
  VOICE_LONG_FORM_SILENCE_MS,
  VOICE_MAX_SESSION_MS,
} from "@/lib/voiceConstants";
import { KALNEHI_PROFILE_UPDATED_EVENT } from "@/lib/profileEvents";
import { useVoiceCommandStore } from "@/store/useVoiceCommandStore";

type SpeechStatus = "idle" | "listening";

type UseDeviceSpeechRecognitionOptions = {
  lang: string;
  /** Fallback BCP‑47 tag (default `en-US` when primary is not already `en-US`). */
  langFallback?: string | null;
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
  /**
   * `onTranscript`: deduct voice quota for this browser Web Speech session on the server
   * (flows that bill again on `/api/voice-parse-*` / `voice-command` must keep `"none"` to avoid double charge).
   */
  reportUsage?: "none" | "onTranscript";
};

function stopStream(stream: MediaStream | null) {
  stream?.getTracks().forEach((track) => track.stop());
}

function deriveLangFallback(primary: string, explicit: string | null | undefined): string | null {
  if (explicit === null) return null;
  if (typeof explicit === "string") return explicit.trim() || null;
  return primary !== "en-US" ? "en-US" : null;
}

function effectiveSilenceForHost(
  isAndroidStable: boolean,
  silenceMs: number | null | undefined,
): number | null {
  if (silenceMs == null || silenceMs <= 0) return silenceMs ?? null;
  if (!isAndroidStable) return silenceMs;
  return Math.max(silenceMs, VOICE_ANDROID_TRAILING_SILENCE_MS);
}

function effectiveMaxSessionForHost(
  isAndroidStable: boolean,
  maxSessionMs: number | null | undefined,
): number | null {
  if (maxSessionMs == null || maxSessionMs <= 0) return maxSessionMs ?? null;
  if (!isAndroidStable) return maxSessionMs;
  if (maxSessionMs >= VOICE_ANDROID_SESSION_BUMP_BELOW_MS) return maxSessionMs;
  return Math.max(maxSessionMs, VOICE_ANDROID_COMMAND_MAX_SESSION_MS);
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

type RecognitionCtor = NonNullable<
  NonNullable<ReturnType<typeof getSpeechRecognitionCtor>>
>;

async function prepareOnDeviceRecognitionForLang(
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

async function prepareOnDeviceRecognition(
  Ctor: RecognitionCtor,
  langPrimary: string,
  langFallback: string | null,
): Promise<{
  canStart: boolean;
  shouldProcessLocally: boolean;
  error: string | null;
  langUsed: string;
}> {
  const first = await prepareOnDeviceRecognitionForLang(Ctor, langPrimary);
  if (first.canStart) {
    return { ...first, langUsed: langPrimary };
  }

  const fallback =
    langFallback && langFallback.trim() !== "" && langFallback !== langPrimary
      ? langFallback
      : null;

  if (fallback) {
    const second = await prepareOnDeviceRecognitionForLang(Ctor, fallback);
    if (second.canStart) {
      return { ...second, langUsed: fallback };
    }
    return {
      ...first,
      langUsed: langPrimary,
      error:
        second.error ??
        first.error ??
        "Speech language not available yet. Try English (US) in the menu or retry in a moment.",
    };
  }

  return { ...first, langUsed: langPrimary };
}

function androidEmptyFinalizeMessage(hadHeardSpeech: boolean): string {
  if (hadHeardSpeech) {
    return "Couldn't hear clearly—speak a bit louder, pause less between phrases, hold the mic closer, then tap Try again.";
  }
  return "Nothing picked up yet. Speak again—on Android speak toward the mic—or tap Try again.";
}

function delayMs(ms: number): Promise<void> {
  return new Promise((resolve) => window.setTimeout(resolve, ms));
}

/** Skips overlapping finals Chrome sometimes re-delivers on Android (“help” + “help”). */
function appendFinalTranscriptDedupe(existingRaw: string, chunkRaw: string): string {
  const chunk = chunkRaw.replace(/\s+/g, " ").trim();
  if (!chunk) return existingRaw;
  const existing = existingRaw.replace(/\s+/g, " ").trimEnd();
  if (!existing) return chunk;
  const e = existing.toLowerCase();
  const c = chunk.toLowerCase();
  if (e === c || e.endsWith(c) || e.endsWith(` ${c}`)) return existing;
  return `${existing} ${chunk}`;
}

/** Squash contiguous repeated spans Android sometimes emits (“a b a b”). */
function squashAdjacentPhraseRepeats(text: string): string {
  let t = text.replace(/\s+/g, " ").trim();
  for (;;) {
    const replaced = t.replace(
      /\b((?:[\w'-]+\s+){0,12}[\w'-]+)(\s+\1)+\b/gi,
      "$1",
    );
    if (replaced === t) return t;
    t = replaced.trim();
  }
}

export function useDeviceSpeechRecognition({
  lang,
  langFallback: langFallbackOpt,
  silenceMs = VOICE_LONG_FORM_SILENCE_MS,
  maxSessionMs = VOICE_MAX_SESSION_MS,
  onStart,
  onTranscript,
  onSpeechEngineInfo,
  interimPreview = false,
  onPreviewTranscript,
  reportUsage = "none",
}: UseDeviceSpeechRecognitionOptions) {
  const setMicBusy = useCallback(
    (busy: boolean) => useVoiceCommandStore.getState().setMicBusy(busy),
    [],
  );

  const uaRef = useRef(
    typeof navigator !== "undefined" ? navigator.userAgent : "",
  );
  const langFallbackEffective = deriveLangFallback(lang, langFallbackOpt);

  const recognitionRef = useRef<SpeechRecognition | null>(null);
  /** First `onstart` of this logical user session — never overwritten on Android engine restarts */
  const speechSessionAnchorMsRef = useRef<number | null>(null);
  const finalTranscriptRef = useRef("");
  /**
   * Android Chrome often reports `resultIndex === 0` on every `onresult` while `continuous` is true,
   * re-delivering all prior finals — we skip indices already committed via this count.
   */
  const processedFinalCountRef = useRef(0);
  /** Last `combined` (final+interim) from onresult; onend can run before a final is committed */
  const lastCombinedPreviewRef = useRef("");
  const silenceTimerRef = useRef<number | null>(null);
  const androidSpeechEndGraceTimerRef = useRef<number | null>(null);
  const sessionTimerRef = useRef<number | null>(null);
  const suppressSubmitRef = useRef(false);
  const ignoreAbortErrorRef = useRef(false);
  /** True once `stop()`, `abort()`, timers, errors, or new session teardown run — skips Android auto-restart. */
  const intentionalEngineEndRef = useRef(true);
  const lastRecognitionErrorKindRef = useRef<string>("");
  const silenceMsEffectiveRef = useRef(0);
  const androidRestartCountRef = useRef(0);

  const onSpeechEngineInfoRef = useRef(onSpeechEngineInfo);
  const onPreviewTranscriptRef = useRef(onPreviewTranscript);
  const interimPreviewRef = useRef(interimPreview);
  const onTranscriptRef = useRef(onTranscript);
  const reportUsageRef = useRef(reportUsage);

  const hadSpeechSegmentRef = useRef(false);
  const [status, setStatus] = useState<SpeechStatus>("idle");
  const [error, setError] = useState<string | null>(null);
  const [transcriptionQualityHint, setTranscriptionQualityHint] = useState<string | null>(null);
  const [speechPausedAfterUtterance, setSpeechPausedAfterUtterance] = useState(false);

  useEffect(() => {
    onSpeechEngineInfoRef.current = onSpeechEngineInfo;
    onPreviewTranscriptRef.current = onPreviewTranscript;
    interimPreviewRef.current = interimPreview;
    onTranscriptRef.current = onTranscript;
  }, [onSpeechEngineInfo, onPreviewTranscript, interimPreview, onTranscript]);

  reportUsageRef.current = reportUsage;

  const isAndroidStableHost =
    typeof navigator !== "undefined"
      ? isAndroidChromeLikeSpeechHost(navigator.userAgent)
      : false;

  const isSupported = useMemo(
    () =>
      typeof window !== "undefined" &&
      Boolean(getSpeechRecognitionCtor(window)),
    [],
  );

  useEffect(() => {
    if (status === "idle") setSpeechPausedAfterUtterance(false);
  }, [status]);

  const clearTimers = useCallback(() => {
    if (silenceTimerRef.current !== null) {
      window.clearTimeout(silenceTimerRef.current);
      silenceTimerRef.current = null;
    }
    if (androidSpeechEndGraceTimerRef.current !== null) {
      window.clearTimeout(androidSpeechEndGraceTimerRef.current);
      androidSpeechEndGraceTimerRef.current = null;
    }
    if (sessionTimerRef.current !== null) {
      window.clearTimeout(sessionTimerRef.current);
      sessionTimerRef.current = null;
    }
  }, []);

  const clearError = useCallback(() => {
    setError(null);
    setTranscriptionQualityHint(null);
  }, []);

  const finalizeSession = useCallback(() => {
    void (async () => {
      clearTimers();
      recognitionRef.current = null;
      intentionalEngineEndRef.current = true;
      androidRestartCountRef.current = 0;
      setStatus("idle");
      setMicBusy(false);

      const hadHeardSpeech = hadSpeechSegmentRef.current;
      hadSpeechSegmentRef.current = false;

      const fromPreview = lastCombinedPreviewRef.current.trim();
      const fromFinal = finalTranscriptRef.current.trim();
      const transcriptRaw = (fromPreview || fromFinal).trim();
      lastCombinedPreviewRef.current = "";
      finalTranscriptRef.current = "";

      const suppressSubmit = suppressSubmitRef.current;
      suppressSubmitRef.current = false;
      ignoreAbortErrorRef.current = false;
      lastRecognitionErrorKindRef.current = "";

      if (suppressSubmit) {
        speechSessionAnchorMsRef.current = null;
        onPreviewTranscriptRef.current?.("");
        setTranscriptionQualityHint(null);
        return;
      }
      if (!transcriptRaw) {
        speechSessionAnchorMsRef.current = null;
        onPreviewTranscriptRef.current?.("");
        setTranscriptionQualityHint(null);
        setError(
          isAndroidStableHost
            ? androidEmptyFinalizeMessage(hadHeardSpeech)
            : hadHeardSpeech
              ? "We lost the last phrase. Try again, or speak a bit longer."
              : "Nothing picked up yet. Speak again or tap Try again.",
        );
        return;
      }

      const transcript = isAndroidStableHost
        ? squashAdjacentPhraseRepeats(transcriptRaw)
        : transcriptRaw;

      if (!transcript.trim()) {
        speechSessionAnchorMsRef.current = null;
        onPreviewTranscriptRef.current?.("");
        setTranscriptionQualityHint(null);
        setError(
          isAndroidStableHost
            ? androidEmptyFinalizeMessage(hadHeardSpeech)
            : hadHeardSpeech
              ? "We lost the last phrase. Try again, or speak a bit longer."
              : "Nothing picked up yet. Speak again or tap Try again.",
        );
        return;
      }

      const startedMs = speechSessionAnchorMsRef.current;
      speechSessionAnchorMsRef.current = null;
      const durationSeconds =
        startedMs != null ? Math.max(0, (Date.now() - startedMs) / 1000) : 0;

      const wc = transcript.split(/\s+/).filter(Boolean).length;
      const cleanedDuplicates =
        isAndroidStableHost && transcriptRaw.length - transcript.length > 6;

      if (isAndroidStableHost && cleanedDuplicates) {
        setTranscriptionQualityHint(
          "Android cleaned repeated words Chrome sometimes duplicates. Speak in shorter phrases if you still see echoes.",
        );
      } else if (isAndroidStableHost && hadHeardSpeech && wc >= 2 && wc < 5) {
        setTranscriptionQualityHint(
          "Android tip: if this looks shortened, pause briefly between tasks and speak closer to the mic.",
        );
      } else {
        setTranscriptionQualityHint(null);
      }

      if (reportUsageRef.current === "onTranscript") {
        try {
          const res = await fetch("/api/voice-usage/consume", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            credentials: "include",
            body: JSON.stringify({ durationSeconds }),
          });
          const data = (await res.json()) as { ok?: boolean; error?: string };
          if (!data.ok) {
            const quota =
              data.error === "quota_exceeded" || res.status === 429;
            setTranscriptionQualityHint(null);
            setError(
              quota
                ? "You've used your voice time for this month. Get more from My Subscription."
                : (data.error ??
                    "Could not apply voice usage. Try again or type instead."),
            );
            onPreviewTranscriptRef.current?.("");
            return;
          }
          if (typeof window !== "undefined") {
            window.dispatchEvent(new Event(KALNEHI_PROFILE_UPDATED_EVENT));
          }
        } catch {
          setTranscriptionQualityHint(null);
          setError(
            "Connection dropped. Check your network and try again, or type instead.",
          );
          onPreviewTranscriptRef.current?.("");
          return;
        }
      }

      onTranscriptRef.current?.({
        transcript,
        occurredAt: new Date().toISOString(),
        durationSeconds,
      });
      onPreviewTranscriptRef.current?.("");
    })();
  }, [clearTimers, isAndroidStableHost, setMicBusy]);

  const stopRecognition = useCallback(
    (mode: "stop" | "abort", suppressSubmit: boolean) => {
      const recognition = recognitionRef.current;
      if (!recognition) return;
      suppressSubmitRef.current = suppressSubmit;
      ignoreAbortErrorRef.current = mode === "abort";
      intentionalEngineEndRef.current = true;
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
    const effective = silenceMsEffectiveRef.current;
    if (effective <= 0) return;
    if (silenceTimerRef.current !== null) {
      window.clearTimeout(silenceTimerRef.current);
    }
    silenceTimerRef.current = window.setTimeout(() => {
      stopRecognition("stop", false);
    }, effective);
  }, [stopRecognition]);

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
    const Ctor =
      typeof window !== "undefined" ? getSpeechRecognitionCtor(window) : null;
    if (!Ctor) {
      setError(
        "This browser does not support device speech recognition. Try Google Chrome (including Install app / PWA on Android).",
      );
      return;
    }

    const run = async (opts: {
      preserveTranscripts: boolean;
      prepareLangPrimary: string;
    }) => {
      uaRef.current = typeof navigator !== "undefined" ? navigator.userAgent : "";
      const isAndroidHost = isAndroidChromeLikeSpeechHost(uaRef.current);

      setError(null);
      setTranscriptionQualityHint(null);
      stopRecognition("abort", true);

      intentionalEngineEndRef.current = false;
      lastRecognitionErrorKindRef.current = "";
      androidRestartCountRef.current = 0;

      const permissionError = await requestMicPermission();
      if (permissionError) {
        setError(permissionError);
        intentionalEngineEndRef.current = true;
        return;
      }

      const effectiveSilence = effectiveSilenceForHost(isAndroidHost, silenceMs);
      const effectiveMax = effectiveMaxSessionForHost(isAndroidHost, maxSessionMs);
      silenceMsEffectiveRef.current =
        effectiveSilence != null && effectiveSilence > 0 ? effectiveSilence : 0;

      const preparePrimary = opts.prepareLangPrimary;
      const fallbackForPrepare =
        langFallbackEffective &&
        langFallbackEffective !== preparePrimary &&
        preparePrimary === lang
          ? langFallbackEffective
          : null;

      const prepared = await prepareOnDeviceRecognition(
        Ctor,
        preparePrimary,
        fallbackForPrepare,
      );
      if (!prepared.canStart) {
        setError(prepared.error);
        intentionalEngineEndRef.current = true;
        return;
      }

      const engineLang = prepared.langUsed;

      if (!opts.preserveTranscripts) {
        finalTranscriptRef.current = "";
        processedFinalCountRef.current = 0;
        lastCombinedPreviewRef.current = "";
        speechSessionAnchorMsRef.current = null;
        onPreviewTranscriptRef.current?.("");
      } else {
        processedFinalCountRef.current = 0;
      }

      suppressSubmitRef.current = false;
      ignoreAbortErrorRef.current = false;

      const recognition = new Ctor();
      recognitionRef.current = recognition;
      recognition.continuous = true;
      /** When `interimPreview` is true, surface partial + final text on all hosts (incl. Android Chrome). */
      recognition.interimResults = !!interimPreviewRef.current;
      recognition.lang = engineLang;
      recognition.maxAlternatives = 1;
      if (prepared.shouldProcessLocally && "processLocally" in recognition) {
        recognition.processLocally = true;
      }

      const androidNetworkMsg = prepared.shouldProcessLocally
        ? "On-device speech hit a glitch. Wait a moment, then try again."
        : "Couldn't reach the speech server. Check Wi‑Fi or mobile data, then try again. You can switch to English (US) under Speech language.";

      const scheduleOrClearSilence = () => {
        const s = silenceMsEffectiveRef.current;
        if (s > 0) scheduleSilenceStop();
      };

      recognition.onstart = () => {
        hadSpeechSegmentRef.current = false;
        setSpeechPausedAfterUtterance(false);
        lastRecognitionErrorKindRef.current = "";

        if (speechSessionAnchorMsRef.current === null) {
          speechSessionAnchorMsRef.current = Date.now();
        }

        setStatus("listening");
        onStart?.();
        if (!isAndroidHost) scheduleOrClearSilence();
      };

      recognition.onspeechstart = () => {
        hadSpeechSegmentRef.current = true;
        setSpeechPausedAfterUtterance(false);
        if (androidSpeechEndGraceTimerRef.current !== null) {
          window.clearTimeout(androidSpeechEndGraceTimerRef.current);
          androidSpeechEndGraceTimerRef.current = null;
        }
        if (silenceMsEffectiveRef.current <= 0) return;
        if (silenceTimerRef.current !== null) {
          window.clearTimeout(silenceTimerRef.current);
          silenceTimerRef.current = null;
        }
      };

      recognition.onspeechend = () => {
        if (isAndroidHost) {
          if (silenceMsEffectiveRef.current > 0) {
            if (androidSpeechEndGraceTimerRef.current !== null) {
              window.clearTimeout(androidSpeechEndGraceTimerRef.current);
            }
            androidSpeechEndGraceTimerRef.current = window.setTimeout(() => {
              androidSpeechEndGraceTimerRef.current = null;
              scheduleSilenceStop();
            }, VOICE_ANDROID_SPEECH_END_GRACE_MS);
          }
        } else {
          scheduleOrClearSilence();
        }
        if (hadSpeechSegmentRef.current) setSpeechPausedAfterUtterance(true);
      };

      recognition.onresult = (event: SpeechRecognitionEvent) => {
        const wantInterim = !!interimPreviewRef.current;
        let heardSpeech = false;
        let interimPiece = "";
        const startIndex = Math.max(
          event.resultIndex,
          processedFinalCountRef.current,
        );
        for (let i = startIndex; i < event.results.length; i++) {
          const result = event.results[i];
          const chunk = result[0]?.transcript?.trim();
          if (!chunk) continue;
          heardSpeech = true;
          if (result.isFinal) {
            if (isAndroidHost) {
              finalTranscriptRef.current = appendFinalTranscriptDedupe(
                finalTranscriptRef.current,
                chunk,
              );
            } else {
              finalTranscriptRef.current = finalTranscriptRef.current
                ? `${finalTranscriptRef.current} ${chunk}`
                : chunk;
            }
            processedFinalCountRef.current = i + 1;
          } else if (wantInterim) {
            interimPiece += result[0]?.transcript ?? "";
          }
        }
        if (wantInterim) {
          const combined = [finalTranscriptRef.current, interimPiece.trim()]
            .filter(Boolean)
            .join(" ")
            .trim();
          lastCombinedPreviewRef.current = combined;
          onPreviewTranscriptRef.current?.(combined);
        }
        if (heardSpeech && silenceMsEffectiveRef.current > 0) scheduleSilenceStop();
      };

      recognition.onerror = (event: SpeechRecognitionErrorEvent) => {
        if (event.error === "aborted" && ignoreAbortErrorRef.current) {
          return;
        }

        if (event.error === "language-not-supported") {
          intentionalEngineEndRef.current = true;
          lastRecognitionErrorKindRef.current = "language-not-supported";
          suppressSubmitRef.current = true;
          onPreviewTranscriptRef.current?.("");
          clearTimers();

          const fb = langFallbackEffective;
          const canAutoRetry =
            isAndroidHost &&
            typeof fb === "string" &&
            fb.trim() !== "" &&
            fb !== preparePrimary &&
            preparePrimary === lang;

          if (canAutoRetry && typeof fb === "string") {
            recognitionRef.current = null;
            setStatus("idle");
            setMicBusy(false);
            window.queueMicrotask(() => {
              void run({ preserveTranscripts: true, prepareLangPrimary: fb });
            });
            return;
          }

          setError(
            isAndroidHost
              ? "This language pack isn’t available here yet. Choose English (US) in Speech language and try again."
              : `Speech recognition error: ${event.error}`,
          );
          setSpeechPausedAfterUtterance(false);
          setStatus("idle");
          setMicBusy(false);
          return;
        }

        if (event.error === "no-speech") {
          lastRecognitionErrorKindRef.current = "no-speech";
          clearTimers();
          setSpeechPausedAfterUtterance(false);
          return;
        }

        intentionalEngineEndRef.current = true;
        lastRecognitionErrorKindRef.current = event.error;

        if (event.error === "not-allowed") {
          setError(
            isAndroidHost
              ? "Microphone blocked. Open site settings in Chrome, allow the mic, then try again."
              : "Microphone permission denied. Allow mic access in your browser settings.",
          );
        } else if (event.error === "network") {
          setError(
            isAndroidHost
              ? androidNetworkMsg
              : prepared.shouldProcessLocally
                ? "On-device speech hit a glitch. Wait a moment, then try again."
                : "Speech is using an online service and the connection failed. Check Wi‑Fi or VPN, try English (US) in the language menu, or add the notification by typing.",
          );
        } else {
          setError(
            isAndroidHost
              ? "Speech hit a snag. Try again, speak a little slower, or switch to English (US) in the menu."
              : `Speech recognition error: ${event.error}`,
          );
        }
        suppressSubmitRef.current = true;
        onPreviewTranscriptRef.current?.("");
        clearTimers();
        setSpeechPausedAfterUtterance(false);
        setStatus("idle");
        setMicBusy(false);
      };

      recognition.onend = () => {
        const shouldTryAndroidRestart =
          isAndroidHost &&
          !intentionalEngineEndRef.current &&
          lastRecognitionErrorKindRef.current !== "no-speech" &&
          lastRecognitionErrorKindRef.current !== "language-not-supported" &&
          !suppressSubmitRef.current &&
          recognitionRef.current === recognition &&
          androidRestartCountRef.current < VOICE_ANDROID_MAX_ENGINE_RESTARTS;

        if (shouldTryAndroidRestart) {
          androidRestartCountRef.current += 1;
          window.setTimeout(() => {
            if (recognitionRef.current !== recognition || intentionalEngineEndRef.current) {
              finalizeSession();
              return;
            }
            try {
              recognition.start();
            } catch {
              intentionalEngineEndRef.current = true;
              finalizeSession();
            }
          }, VOICE_ANDROID_ONEND_RESTART_JITTER_MS);
          return;
        }

        finalizeSession();
      };

      try {
        onSpeechEngineInfoRef.current?.({
          processLocally: prepared.shouldProcessLocally,
          lang: engineLang,
        });
        setMicBusy(true);
        if (isAndroidHost && !opts.preserveTranscripts) {
          await delayMs(VOICE_ANDROID_PRE_START_DELAY_MS);
        }
        recognition.start();
        if (effectiveMax != null && effectiveMax > 0) {
          sessionTimerRef.current = window.setTimeout(() => {
            stopRecognition("stop", false);
          }, effectiveMax);
        }
      } catch (startError) {
        recognitionRef.current = null;
        setStatus("idle");
        setMicBusy(false);
        intentionalEngineEndRef.current = true;
        setError(microphoneErrorMessage(startError));
      }
    };

    await run({ preserveTranscripts: false, prepareLangPrimary: lang });
  }, [
    clearTimers,
    finalizeSession,
    lang,
    langFallbackEffective,
    maxSessionMs,
    onStart,
    requestMicPermission,
    scheduleSilenceStop,
    setMicBusy,
    silenceMs,
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
    transcriptionQualityHint,
  };
}

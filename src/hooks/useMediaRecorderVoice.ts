"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import { isAndroidWebViewUserAgent } from "@/lib/androidWebSpeechEnv";
import {
  audioFileExtensionForMime,
  isAudioBlobTooSmall,
  isGroqSupportedAudioMime,
  normalizeAudioMime,
} from "@/lib/voiceTranscribeMime";
import { VOICE_MAX_SESSION_MS } from "@/lib/voiceConstants";

type TranscriptPayload = {
  transcript: string;
  occurredAt: string;
  durationSeconds: number;
};

type UseMediaRecorderVoiceOptions = {
  onTranscript: (payload: TranscriptPayload) => void;
  maxMs?: number;
  /** BCP-47 tag passed to `/api/voice-transcribe` (e.g. en-IN, hi-IN). */
  lang?: string;
};

const WEBVIEW_STOP_FLUSH_MS = 120;

function preferredMimeCandidates(): string[] {
  const c: string[] = [];
  if (typeof MediaRecorder === "undefined") return c;
  if (MediaRecorder.isTypeSupported("audio/webm;codecs=opus"))
    c.push("audio/webm;codecs=opus");
  if (MediaRecorder.isTypeSupported("audio/webm")) c.push("audio/webm");
  if (MediaRecorder.isTypeSupported("audio/mp4")) c.push("audio/mp4");
  // Groq does not accept 3gpp — omit audio/3gpp even if the WebView supports it.
  return c;
}

function createMediaRecorderPreferringMime(stream: MediaStream): MediaRecorder | null {
  if (typeof MediaRecorder === "undefined") return null;
  for (const mime of preferredMimeCandidates()) {
    try {
      return new MediaRecorder(stream, { mimeType: mime });
    } catch {
      /* try next */
    }
  }
  try {
    return new MediaRecorder(stream);
  } catch {
    return null;
  }
}

function userMessageForTranscribeError(
  error: string | undefined,
  errorCode?: string,
): string {
  if (errorCode === "unsupported_format") {
    return (
      error ??
      "This device recorded audio in an unsupported format. Update the app or try Chrome."
    );
  }
  if (errorCode === "empty_audio" || errorCode === "no_speech") {
    return error ?? "No speech captured. Try again.";
  }
  if (errorCode === "quota") {
    return error ?? "Voice quota exceeded.";
  }
  if (errorCode === "auth") {
    return error ?? "Please sign in.";
  }
  return error ?? "Transcription failed. Please try again.";
}

export function useMediaRecorderVoice({
  onTranscript,
  maxMs = VOICE_MAX_SESSION_MS,
  lang = "en-IN",
}: UseMediaRecorderVoiceOptions) {
  const [isRecording, setIsRecording] = useState(false);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isMountedRef = useRef(true);
  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<BlobPart[]>([]);
  const mimeRef = useRef<string>("audio/webm");
  const startedAtRef = useRef<number | null>(null);
  const sessionTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const ignoreNextTranscriptRef = useRef(false);
  const onTranscriptRef = useRef(onTranscript);
  const langRef = useRef(lang);
  const androidWebViewRef = useRef(false);

  useEffect(() => {
    onTranscriptRef.current = onTranscript;
    langRef.current = lang;
  }, [onTranscript, lang]);

  useEffect(() => {
    androidWebViewRef.current =
      typeof navigator !== "undefined" &&
      isAndroidWebViewUserAgent(navigator.userAgent);
  }, []);

  const clearTimer = useCallback(() => {
    if (sessionTimerRef.current !== null) {
      clearTimeout(sessionTimerRef.current);
      sessionTimerRef.current = null;
    }
  }, []);

  const clearError = useCallback(() => setError(null), []);

  const transcribeBlob = useCallback(async (blob: Blob, recordingStartMs: number) => {
    try {
      const mimeType = normalizeAudioMime(blob.type || mimeRef.current || "audio/webm");
      if (!isGroqSupportedAudioMime(mimeType)) {
        if (isMountedRef.current) {
          setError(
            "This device can't record compatible audio for cloud transcription. Use the Kalnehi app with the latest update, or try Chrome.",
          );
        }
        return;
      }
      if (isAudioBlobTooSmall(blob.size)) {
        if (isMountedRef.current) {
          setError("Recording was too short. Speak for at least a second, then try again.");
        }
        return;
      }

      const fd = new FormData();
      const ext = audioFileExtensionForMime(mimeType);
      fd.set("audio", new File([blob], `voice-command.${ext}`, { type: mimeType }));
      fd.set("lang", langRef.current);

      const res = await fetch("/api/voice-transcribe", {
        method: "POST",
        body: fd,
        credentials: "include",
      });
      const data = (await res.json()) as {
        ok: boolean;
        error?: string;
        errorCode?: string;
        transcript?: string;
        durationSeconds?: number;
      };

      if (!data.ok || !data.transcript) {
        if (isMountedRef.current) {
          setError(userMessageForTranscribeError(data.error, data.errorCode));
        }
        return;
      }

      if (ignoreNextTranscriptRef.current) {
        ignoreNextTranscriptRef.current = false;
        return;
      }

      const durationSeconds =
        typeof data.durationSeconds === "number" && data.durationSeconds > 0
          ? data.durationSeconds
          : Math.max(1, Math.round((Date.now() - recordingStartMs) / 1000));

      if (isMountedRef.current) {
        onTranscriptRef.current({
          transcript: data.transcript,
          occurredAt: new Date().toISOString(),
          durationSeconds,
        });
      }
    } catch {
      if (isMountedRef.current) {
        setError("Network error during transcription. Check your connection and try again.");
      }
    } finally {
      if (isMountedRef.current) setIsTranscribing(false);
    }
  }, []);

  const finishStop = useCallback(
    (mr: MediaRecorder, startedAt: number) => {
      mr.onstop = () => {
        mr.stream.getTracks().forEach((t) => t.stop());
        const blob = new Blob(chunksRef.current, {
          type: mimeRef.current || "audio/webm",
        });
        chunksRef.current = [];
        mediaRecorderRef.current = null;
        if (blob.size > 0) {
          void transcribeBlob(blob, startedAt);
        } else {
          setIsTranscribing(false);
          setError("No audio was recorded. Please try again.");
        }
      };
      try {
        if (mr.state === "recording") mr.requestData();
      } catch {
        /* some WebViews omit requestData */
      }
      try {
        mr.stop();
      } catch {
        mediaRecorderRef.current = null;
        setIsTranscribing(false);
      }
    },
    [transcribeBlob],
  );

  const stopRecording = useCallback(() => {
    clearTimer();
    const mr = mediaRecorderRef.current;
    if (!mr) return;
    ignoreNextTranscriptRef.current = false;
    const startedAt = startedAtRef.current ?? Date.now();
    setIsTranscribing(true);
    setIsRecording(false);
    startedAtRef.current = null;

    if (androidWebViewRef.current) {
      window.setTimeout(() => finishStop(mr, startedAt), WEBVIEW_STOP_FLUSH_MS);
    } else {
      finishStop(mr, startedAt);
    }
  }, [clearTimer, finishStop]);

  const discardRecording = useCallback(() => {
    clearTimer();
    const mr = mediaRecorderRef.current;
    if (!mr) return;

    ignoreNextTranscriptRef.current = false;
    setIsRecording(false);

    mr.onstop = () => {
      mr.stream.getTracks().forEach((t) => t.stop());
      chunksRef.current = [];
      mediaRecorderRef.current = null;
    };
    try {
      if (mr.state === "recording") mr.requestData();
    } catch {
      /* some WebViews omit requestData */
    }
    try {
      mr.stop();
    } catch {
      mediaRecorderRef.current = null;
    }
    startedAtRef.current = null;
  }, [clearTimer]);

  const cancelPendingTranscription = useCallback(() => {
    ignoreNextTranscriptRef.current = true;
    setIsTranscribing(false);
  }, []);

  const startRecording = useCallback(async () => {
    if (mediaRecorderRef.current) return;

    setError(null);
    ignoreNextTranscriptRef.current = false;
    chunksRef.current = [];

    let stream: MediaStream;
    try {
      stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    } catch (err) {
      const name = err instanceof DOMException ? err.name : "";
      if (name === "NotAllowedError" || name === "SecurityError") {
        setError("Microphone permission denied. Allow mic access in your browser settings.");
      } else if (name === "NotFoundError" || name === "DevicesNotFoundError") {
        setError("No microphone found on this device.");
      } else {
        setError("Could not start the microphone. Check permissions and try again.");
      }
      return;
    }

    const mr = createMediaRecorderPreferringMime(stream);
    if (!mr) {
      stream.getTracks().forEach((t) => t.stop());
      setError("Audio recording is not supported in this browser.");
      return;
    }

    const resolvedMime = normalizeAudioMime(
      mr.mimeType || preferredMimeCandidates()[0] || "audio/webm",
    );
    if (!isGroqSupportedAudioMime(resolvedMime)) {
      stream.getTracks().forEach((t) => t.stop());
      setError(
        "This device can't record compatible audio. Update the Kalnehi app or use Chrome.",
      );
      return;
    }

    mimeRef.current = resolvedMime;
    mediaRecorderRef.current = mr;
    startedAtRef.current = Date.now();
    mr.ondataavailable = (e) => {
      if (e.data.size > 0) chunksRef.current.push(e.data);
    };
    mr.start(250);
    setIsRecording(true);

    sessionTimerRef.current = setTimeout(() => {
      stopRecording();
    }, maxMs);
  }, [maxMs, stopRecording]);

  useEffect(() => {
    return () => {
      clearTimer();
      const mr = mediaRecorderRef.current;
      if (mr) {
        try {
          mr.stream.getTracks().forEach((t) => t.stop());
          mr.stop();
        } catch {
          // ignore
        }
        mediaRecorderRef.current = null;
      }
    };
  }, [clearTimer]);

  return {
    isRecording,
    isTranscribing,
    error,
    clearError,
    startRecording,
    stopRecording,
    discardRecording,
    cancelPendingTranscription,
    isSupported:
      typeof window !== "undefined" &&
      typeof navigator !== "undefined" &&
      !!navigator.mediaDevices?.getUserMedia &&
      typeof MediaRecorder !== "undefined",
  };
}

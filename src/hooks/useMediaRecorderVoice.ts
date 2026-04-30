"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import { VOICE_MAX_SESSION_MS } from "@/lib/voiceConstants";

type TranscriptPayload = {
  transcript: string;
  occurredAt: string;
  durationSeconds: number;
};

type UseMediaRecorderVoiceOptions = {
  onTranscript: (payload: TranscriptPayload) => void;
  maxMs?: number;
};

function preferredMimeCandidates(): string[] {
  const c: string[] = [];
  if (typeof MediaRecorder === "undefined") return c;
  if (MediaRecorder.isTypeSupported("audio/webm;codecs=opus"))
    c.push("audio/webm;codecs=opus");
  if (MediaRecorder.isTypeSupported("audio/webm")) c.push("audio/webm");
  if (MediaRecorder.isTypeSupported("audio/mp4")) c.push("audio/mp4");
  if (MediaRecorder.isTypeSupported("audio/3gpp")) c.push("audio/3gpp");
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

export function useMediaRecorderVoice({
  onTranscript,
  maxMs = VOICE_MAX_SESSION_MS,
}: UseMediaRecorderVoiceOptions) {
  const [isRecording, setIsRecording] = useState(false);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isMountedRef = useRef(true);
  useEffect(() => {
    isMountedRef.current = true;
    return () => { isMountedRef.current = false; };
  }, []);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<BlobPart[]>([]);
  const mimeRef = useRef<string>("audio/webm");
  const startedAtRef = useRef<number | null>(null);
  const sessionTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const onTranscriptRef = useRef(onTranscript);

  useEffect(() => {
    onTranscriptRef.current = onTranscript;
  }, [onTranscript]);

  const clearTimer = useCallback(() => {
    if (sessionTimerRef.current !== null) {
      clearTimeout(sessionTimerRef.current);
      sessionTimerRef.current = null;
    }
  }, []);

  const clearError = useCallback(() => setError(null), []);

  const transcribeBlob = useCallback(async (blob: Blob, recordingStartMs: number) => {
    // isTranscribing is already set to true in stopRecording before this is called.
    try {
      const fd = new FormData();
      const mimeType = blob.type || mimeRef.current || "audio/webm";
      const ext = mimeType.includes("mp4")
        ? "m4a"
        : mimeType.includes("3gp")
          ? "3gp"
          : "webm";
      fd.set("audio", new File([blob], `voice-command.${ext}`, { type: mimeType }));

      const res = await fetch("/api/voice-transcribe", {
        method: "POST",
        body: fd,
        credentials: "include",
      });
      const data = (await res.json()) as {
        ok: boolean;
        error?: string;
        transcript?: string;
        durationSeconds?: number;
      };

      if (!data.ok || !data.transcript) {
        if (isMountedRef.current) setError(data.error ?? "Transcription failed. Please try again.");
        return;
      }

      // Use server-reported duration (from Groq's verbose_json) for accurate quota billing.
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
      if (isMountedRef.current) setError("Network error during transcription. Check your connection and try again.");
    } finally {
      if (isMountedRef.current) setIsTranscribing(false);
    }
  }, []);

  const stopRecording = useCallback(() => {
    clearTimer();
    const mr = mediaRecorderRef.current;
    if (!mr) return;
    const startedAt = startedAtRef.current ?? Date.now();
    // Set transcribing immediately so the "On it…" spinner appears before the
    // MediaRecorder onstop event fires and the upload begins.
    setIsTranscribing(true);
    setIsRecording(false);
    mr.onstop = () => {
      mr.stream.getTracks().forEach((t) => t.stop());
      const blob = new Blob(chunksRef.current, { type: mimeRef.current || "audio/webm" });
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
    startedAtRef.current = null;
  }, [clearTimer, transcribeBlob]);

  const startRecording = useCallback(async () => {
    if (mediaRecorderRef.current) return;

    setError(null);
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

    mimeRef.current = mr.mimeType || preferredMimeCandidates()[0] || "audio/webm";

    mediaRecorderRef.current = mr;
    startedAtRef.current = Date.now();
    mr.ondataavailable = (e) => {
      if (e.data.size > 0) chunksRef.current.push(e.data);
    };
    // Timeslice avoids empty blobs on some Android WebViews that only flush on periodic events.
    mr.start(250);
    setIsRecording(true);

    // Auto-stop after maxMs to prevent runaway recordings.
    sessionTimerRef.current = setTimeout(() => {
      stopRecording();
    }, maxMs);
  }, [maxMs, stopRecording]);

  // Cleanup on unmount.
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
    isSupported:
      typeof window !== "undefined" &&
      typeof navigator !== "undefined" &&
      !!navigator.mediaDevices?.getUserMedia &&
      typeof MediaRecorder !== "undefined",
  };
}

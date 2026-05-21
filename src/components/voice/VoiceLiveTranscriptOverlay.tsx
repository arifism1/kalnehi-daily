"use client";

import clsx from "clsx";
import { MicOff } from "lucide-react";

type Props = {
  /** When false, nothing is rendered. */
  open: boolean;
  title: string;
  subtitle?: string;
  /** Live or final-so-far transcript (Web Speech / native partials). */
  transcript: string;
  /** True while MediaRecorder → cloud transcribe is running. */
  isTranscribing?: boolean;
  /** True on Android WebView-style path: recording without live STT until upload. */
  isWhisperRecording?: boolean;
  onStop: () => void;
  /** Disable Stop (e.g. already finishing). */
  stopDisabled?: boolean;
};

/**
 * Fixed overlay matching GlobalVoiceSheet z-index so live dictation reads as app-level chrome.
 */
export function VoiceLiveTranscriptOverlay({
  open,
  title,
  subtitle,
  transcript,
  isTranscribing = false,
  isWhisperRecording = false,
  onStop,
  stopDisabled = false,
}: Props) {
  if (!open) return null;

  const whisperHeld = isWhisperRecording && !transcript.trim();
  const statusLine = isTranscribing
    ? "Transcribing…"
    : whisperHeld
      ? "Recording… Full text appears after you tap Stop."
      : transcript.trim()
        ? "Live transcript"
        : "Listening…";

  return (
    <>
      <div
        className="kal-fade-in-fast fixed inset-0 z-[51] bg-black/35 backdrop-blur-[2px]"
        aria-hidden
      />
      <div className="pointer-events-none fixed inset-0 z-[52] flex items-center justify-center p-4">
        <div
          role="dialog"
          aria-modal="true"
          aria-label={title}
          className="pointer-events-auto w-full max-w-md rounded-2xl kal-glass-panel shadow-2xl"
        >
          <div className="border-b border-kal-border/30 px-4 pb-2.5 pt-3">
            <p className="text-xs font-semibold uppercase tracking-wider text-kal-text-secondary">
              {title}
            </p>
            {subtitle ? (
              <p className="mt-1 text-[11px] leading-snug text-kal-text-secondary">{subtitle}</p>
            ) : null}
          </div>
          <div className="space-y-3 p-4">
            <p className="text-[11px] font-medium text-kal-accent/80">{statusLine}</p>
            <div
              className={clsx(
                "min-h-[4.5rem] rounded-xl border border-kal-border/40 bg-kal-surface/50 px-3 py-2.5",
                transcript.trim() || isTranscribing ? "" : "border-dashed",
              )}
            >
              <p
                className="max-h-[40vh] overflow-y-auto text-sm leading-relaxed text-kal-text"
                aria-live="polite"
                aria-atomic="false"
              >
                {isTranscribing && !transcript.trim() ? (
                  <span className="text-kal-text-secondary">…</span>
                ) : transcript.trim() ? (
                  transcript
                ) : whisperHeld ? (
                  <span className="text-kal-text-secondary">
                    Speak clearly toward the mic. Tap Stop when you’re done.
                  </span>
                ) : (
                  <span className="text-kal-text-secondary italic">
                    Words appear here as you speak…
                  </span>
                )}
              </p>
            </div>
            <button
              type="button"
              onClick={onStop}
              disabled={stopDisabled}
              className="flex w-full min-h-[44px] items-center justify-center gap-2 rounded-xl border border-red-300/80 bg-red-500/10 px-4 py-2.5 text-sm font-semibold text-red-700 transition hover:bg-red-500/15 disabled:opacity-50 dark:border-red-500/45 dark:bg-red-950/35 dark:text-red-200"
            >
              <MicOff className="size-4 shrink-0" aria-hidden />
              Stop
            </button>
          </div>
        </div>
      </div>
    </>
  );
}

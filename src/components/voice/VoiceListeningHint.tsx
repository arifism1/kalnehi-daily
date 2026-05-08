"use client";

import clsx from "clsx";

export type VoiceListeningHintVariant = "command" | "dictation" | "whisper";

type VoiceListeningHintProps = {
  visible: boolean;
  /** "command" = short global voice; "dictation" = Web Speech long-form; "whisper" = MediaRecorder + server STT. */
  variant: VoiceListeningHintVariant;
  className?: string;
  /** When true, shows a subtle "Be loud and clear" reminder below the main hint. Defaults to false. */
  showClearVoiceHint?: boolean;
  /** Replaces "Stop" in the hint line (e.g. "Split into lines" on Backlog Tracker). */
  stopLabel?: string;
};

/**
 * Supplementary copy below the mic while listening. Global voice uses `command`
 * with a short timing line; the primary “tap mic when done” CTA lives above the mic.
 */
export function VoiceListeningHint({
  visible,
  variant,
  className,
  showClearVoiceHint = false,
  stopLabel,
}: VoiceListeningHintProps) {
  if (!visible) return null;

  const tap = stopLabel ?? "Stop";

  const line =
    variant === "command"
      ? "Up to 2 min · tap mic to stop anytime"
      : variant === "whisper"
        ? `Tap ${tap} · audio uploads · long sessions OK`
        : `Tap ${tap} when done · long pause ends phrase · sessions up to 30 min`;

  return (
    <div className={clsx("flex flex-col items-center gap-0.5", className)}>
      <p className="text-center text-[11px] text-kal-text-secondary/70 leading-snug">
        {line}
      </p>
      {showClearVoiceHint && (
        <p className="text-center text-[10px] text-kal-text-secondary/45 leading-snug">
          Be loud and clear
        </p>
      )}
    </div>
  );
}

"use client";

import clsx from "clsx";

export type VoiceListeningHintVariant = "command" | "dictation" | "whisper";

type VoiceListeningHintProps = {
  visible: boolean;
  /** "command" = short global voice; "dictation" = long-form with 30s silence; "whisper" = no app-side silence. */
  variant: VoiceListeningHintVariant;
  className?: string;
};

/**
 * One-line copy shown below the mic while listening. Hidden when not visible
 * (e.g. when showing live transcript in global voice).
 */
export function VoiceListeningHint({
  visible,
  variant,
  className,
}: VoiceListeningHintProps) {
  if (!visible) return null;

  const line =
    variant === "whisper" || variant === "command"
      ? "Tap to stop · Up to 60s"
      : "Tap to stop · 30s quiet auto-stops · Up to 60s";

  return (
    <p
      className={clsx(
        "text-center text-[11px] text-kal-text-secondary/70 leading-snug",
        className,
      )}
    >
      {line}
    </p>
  );
}

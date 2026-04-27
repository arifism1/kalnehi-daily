"use client";

import clsx from "clsx";

export type VoiceListeningHintVariant = "command" | "dictation" | "whisper";

type VoiceListeningHintProps = {
  visible: boolean;
  /** "command" = short global voice; "dictation" = long-form with 30s silence; "whisper" = no app-side silence. */
  variant: VoiceListeningHintVariant;
  className?: string;
  /** When true, shows a subtle "Be loud and clear" reminder below the main hint. Defaults to false. */
  showClearVoiceHint?: boolean;
};

/**
 * One-line copy shown below the mic while listening. Hidden when not visible
 * (e.g. when showing live transcript in global voice).
 */
export function VoiceListeningHint({
  visible,
  variant,
  className,
  showClearVoiceHint = false,
}: VoiceListeningHintProps) {
  if (!visible) return null;

  const line =
    variant === "whisper" || variant === "command"
      ? "Tap to stop · Up to 60s"
      : "Tap to stop · 30s quiet auto-stops · Up to 60s";

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

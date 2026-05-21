"use client";

import clsx from "clsx";
import { Lock, ShieldCheck } from "lucide-react";

const POINTS = [
  "Your video feed is never streamed, uploaded, or saved. It stays on your device only.",
  "Study detection and pose analysis run entirely on your phone or computer using on-device models (MediaPipe). No frames are sent to our servers.",
  "We never store images or video. When you end a session, only the subject, duration, and times are saved—never any picture or recording.",
  "This feature is private by design: your camera feed does not leave your device and is not shared online.",
] as const;

type Props = {
  open: boolean;
  onContinue: () => void;
  onDismiss?: () => void;
  /** When true, show a softer title (e.g. first time entering camera from study session). */
  variant?: "settings" | "session";
};

/**
 * One-time or first-camera-run privacy notice for study camera (on-device only).
 */
export function StudyCameraPrivacyModal({
  open,
  onContinue,
  onDismiss,
  variant = "settings",
}: Props) {
  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[100] flex items-end justify-center sm:items-center"
      role="dialog"
      aria-modal="true"
      aria-labelledby="study-cam-privacy-title"
    >
      <button
        type="button"
        aria-label="Close"
        className="absolute inset-0 bg-black/70"
        onClick={onDismiss}
      />
      <div
        className={clsx(
          "relative z-10 flex min-h-0 w-full max-w-md max-h-[min(88dvh,32rem)] flex-col overflow-hidden rounded-t-3xl border border-kal-accent/25 bg-[#0a101c] shadow-2xl sm:rounded-3xl",
        )}
      >
        <div className="flex shrink-0 items-start gap-3 border-b border-white/10 px-6 pb-4 pt-6 sm:px-7 sm:pt-7">
          <span className="flex size-12 shrink-0 items-center justify-center rounded-2xl bg-kal-accent/15 text-kal-accent">
            <ShieldCheck className="size-6" aria-hidden />
          </span>
          <div>
            <p className="text-[0.65rem] font-semibold uppercase tracking-widest text-kal-accent/90">
              Privacy
            </p>
            <h2
              id="study-cam-privacy-title"
              className="mt-1 text-lg font-semibold leading-snug text-white"
            >
              {variant === "settings"
                ? "Your video stays on this device"
                : "Before we open the camera"}
            </h2>
          </div>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto overscroll-y-contain px-6 py-4 sm:px-7 [-webkit-overflow-scrolling:touch]">
        <ul className="space-y-3 text-sm leading-relaxed text-zinc-300">
          {POINTS.map((text) => (
            <li key={text} className="flex gap-2">
              <Lock
                className="mt-0.5 size-4 shrink-0 text-kal-accent/80"
                aria-hidden
              />
              <span>{text}</span>
            </li>
          ))}
        </ul>

        <p className="mt-4 rounded-xl border border-white/[0.06] bg-slate-950/60 px-3 py-2.5 text-center text-[11px] leading-relaxed text-zinc-400">
          <span className="font-semibold text-zinc-400">🔒 On-device only</span>
          {" · "}
          Private and secure. You can turn this off anytime in Settings.
        </p>
        </div>

        <div className="flex shrink-0 flex-col gap-2 border-t border-white/10 px-6 py-4 pb-[max(1rem,env(safe-area-inset-bottom))] pt-3 sm:px-7 sm:flex-row-reverse">
          <button
            type="button"
            onClick={onContinue}
            className="min-h-[48px] flex-1 rounded-2xl bg-kal-accent py-3 text-sm font-semibold text-kal-accent-foreground"
          >
            Enable camera
          </button>
          {onDismiss ? (
            <button
              type="button"
              onClick={onDismiss}
              className="min-h-[48px] flex-1 rounded-2xl border border-slate-600 py-3 text-sm font-medium text-zinc-300"
            >
              Not now
            </button>
          ) : null}
        </div>
      </div>
    </div>
  );
}

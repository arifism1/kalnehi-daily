"use client";

import { motion } from "framer-motion";
import { Mic } from "lucide-react";

import { useRouter } from "next/navigation";

import { useTourStore } from "@/store/useTourStore";

/**
 * One-time popup shown after the product tour is completed or skipped.
 * Encourages the user to try voice scheduling for their day.
 */
export function VoiceNudgeModal() {
  const router = useRouter();
  const { setVoiceNudgeShown } = useTourStore();

  function handleTryVoice() {
    setVoiceNudgeShown();
    router.push("/dictate-day");
  }

  function handleDismiss() {
    setVoiceNudgeShown();
  }

  return (
    <div
      className="fixed inset-0 z-[80] flex items-end justify-center p-4 sm:items-center"
      role="presentation"
    >
      <button
        type="button"
        aria-label="Dismiss"
        className="absolute inset-0 bg-kal-overlay backdrop-blur-sm"
        onClick={handleDismiss}
      />

      <motion.div
        role="dialog"
        aria-modal="true"
        aria-labelledby="voice-nudge-title"
        aria-describedby="voice-nudge-desc"
        className="kal-glass-panel relative z-[81] w-full max-w-sm overflow-hidden rounded-2xl"
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
      >
        <div className="flex flex-col items-center px-6 pb-6 pt-8 text-center">
          {/* Icon */}
          <div className="mb-4 flex size-14 items-center justify-center rounded-full bg-kal-accent/12">
            <Mic className="size-7 text-kal-accent" strokeWidth={1.75} />
          </div>

          <h2
            id="voice-nudge-title"
            className="text-[18px] font-semibold leading-snug tracking-tight text-kal-text"
          >
            Schedule your day with your voice
          </h2>

          <p
            id="voice-nudge-desc"
            className="mt-2.5 text-[13px] leading-relaxed text-kal-text-secondary"
          >
            Just speak what you need — Kalnehi will plan your day for you.
          </p>
        </div>

        <div className="flex flex-col gap-2 border-t border-kal-border/50 px-6 py-4 pb-[max(1rem,env(safe-area-inset-bottom))]">
          <button
            type="button"
            onClick={handleTryVoice}
            className="flex min-h-[48px] w-full items-center justify-center gap-2 rounded-xl bg-kal-accent px-4 py-3 text-[14px] font-semibold text-white transition-opacity active:opacity-80 sm:min-h-[44px]"
          >
            <Mic className="size-4" strokeWidth={2} aria-hidden />
            Try it now
          </button>
          <button
            type="button"
            onClick={handleDismiss}
            className="kal-glass-subtle min-h-[48px] w-full rounded-xl px-4 py-3 text-[14px] font-semibold text-kal-text sm:min-h-[44px]"
          >
            Maybe later
          </button>
        </div>
      </motion.div>
    </div>
  );
}

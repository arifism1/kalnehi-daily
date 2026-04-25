"use client";

import { format } from "date-fns";
import { AnimatePresence, motion } from "framer-motion";
import { useCallback, useEffect, useId, useRef, useState } from "react";

import { MorningIllustration } from "@/components/welcome/illustrations/MorningIllustration";

const DARK = "#1A1209";

const spring = { type: "spring" as const, stiffness: 120, damping: 18, mass: 0.8 };

const block = {
  initial: { opacity: 0, y: 16 },
  animate: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { ...spring, delay: i * 0.32 },
  }),
};

export type MorningWelcomeScreenProps = {
  firstName: string;
  /** e.g. “127 days to NEET UG” or profile hint */
  examCountdownText: string;
  /** Rotating one-liner */
  dailyQuote: string;
  onDismiss: () => void;
  onCtaClick: () => void;
  /** Autos after ms if user doesn’t use CTA (default 3000) */
  autoDismissAfterMs?: number;
};

/**
 * Calm, full-bleed morning moment — first open of the day. Max width 390px on large screens.
 * Tap/click outside the CTA dismisses (same as Skip) after auto timer; Skip is instant.
 */
export function MorningWelcomeScreen({
  firstName,
  examCountdownText,
  dailyQuote,
  onDismiss,
  onCtaClick,
  autoDismissAfterMs = 3000,
}: MorningWelcomeScreenProps) {
  const labelId = useId();
  const [visible, setVisible] = useState(true);
  const dismissed = useRef(false);
  const autoTimer = useRef<number | null>(null);

  const close = useCallback(
    (after?: () => void) => {
      if (dismissed.current) return;
      dismissed.current = true;
      if (autoTimer.current) {
        clearTimeout(autoTimer.current);
        autoTimer.current = null;
      }
      setVisible(false);
      window.setTimeout(() => {
        after?.();
        onDismiss();
      }, 360);
    },
    [onDismiss],
  );

  const handleCta = useCallback(() => {
    close(() => onCtaClick());
  }, [close, onCtaClick]);

  useEffect(() => {
    autoTimer.current = window.setTimeout(() => {
      close();
    }, autoDismissAfterMs);
    return () => {
      if (autoTimer.current) clearTimeout(autoTimer.current);
    };
  }, [autoDismissAfterMs, close]);

  return (
    <AnimatePresence>
      {visible ? (
        <motion.div
          key="morn"
          role="dialog"
          aria-modal
          aria-labelledby={labelId}
          className="fixed inset-0 z-[200] flex cursor-default justify-center overflow-x-hidden overflow-y-auto bg-[#FAF6F1]"
          style={{ color: DARK }}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0, transition: { duration: 0.35, ease: [0.22, 1, 0.36, 1] } }}
          onClick={() => {
            /* tap outside CTA (cream area) = dismiss, instant */
            close();
          }}
        >
          <div className="flex min-h-dvh w-full max-w-[390px] flex-col">
            <div className="flex items-start justify-end px-4 pt-[max(0.75rem,env(safe-area-inset-top))]">
              <button
                type="button"
                onClick={() => close()}
                className="relative z-20 text-sm font-medium text-[#1A1209]/45 underline decoration-[#1A1209]/25 underline-offset-2 transition hover:text-[#1A1209]/70"
              >
                Skip
              </button>
            </div>

            <div className="relative z-10 flex min-h-0 flex-1 flex-col px-5 pb-[max(1.25rem,env(safe-area-inset-bottom))] pt-1">
              <p className="text-center text-xs font-medium tracking-[0.2em] text-[#1A1209]/40">
                Kalnehi · Win Daily
              </p>
              <MorningIllustration className="shrink-0" />

              <div className="mt-1 flex min-h-0 flex-1 flex-col justify-end gap-4 pb-2">
                <h1
                  id={labelId}
                  className="text-center text-[1.75rem] font-semibold leading-tight text-[#1A1209] font-[family-name:var(--font-kal-heading)]"
                >
                  <motion.span
                    custom={0}
                    initial="initial"
                    animate="animate"
                    variants={block}
                    className="block"
                  >
                    Good morning, {firstName} 🌅
                  </motion.span>
                </h1>
                <motion.p
                  custom={1}
                  initial="initial"
                  animate="animate"
                  variants={block}
                  className="text-center text-sm text-[#1A1209]/75"
                >
                  {format(new Date(), "EEEE, d MMMM yyyy")}
                </motion.p>
                <motion.p
                  custom={2}
                  initial="initial"
                  animate="animate"
                  variants={block}
                  className="text-center text-[0.95rem] font-medium leading-snug text-[#1A1209] font-[family-name:var(--font-kal-heading)]"
                >
                  {examCountdownText}
                </motion.p>
                <motion.p
                  custom={3}
                  initial="initial"
                  animate="animate"
                  variants={block}
                  className="px-1 text-center text-[0.95rem] leading-relaxed text-[#1A1209]/80"
                >
                  {dailyQuote}
                </motion.p>
                <motion.div
                  custom={4}
                  initial="initial"
                  animate="animate"
                  variants={block}
                  className="pt-1"
                >
                  <div className="relative z-20">
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleCta();
                      }}
                      className="flex w-full min-h-[52px] items-center justify-center gap-1 rounded-2xl bg-[#F07B1D] px-4 text-base font-semibold text-white shadow-[0_4px_24px_rgba(240,123,29,0.35)] transition-transform active:scale-[0.99]"
                    >
                      Plan My Day
                      <span aria-hidden>→</span>
                    </button>
                  </div>
                </motion.div>
              </div>
            </div>
          </div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}

export { DARK };

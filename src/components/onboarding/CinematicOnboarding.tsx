"use client";

import { motion, AnimatePresence } from "framer-motion";
import { ArrowRight } from "lucide-react";
import { useCallback, useState } from "react";

const STORAGE_KEY = "kalnehi_cinematic_onboarding_v1";

export function readCinematicOnboardingDone(): boolean {
  if (typeof window === "undefined") return false;
  try {
    return localStorage.getItem(STORAGE_KEY) === "1";
  } catch {
    return false;
  }
}

export function writeCinematicOnboardingDone(): void {
  try {
    localStorage.setItem(STORAGE_KEY, "1");
  } catch {
    /* ignore */
  }
}

const SLIDES = [
  {
    kicker: "This is not another planner.",
    title: "This is the year you don’t drift.",
    body: "Thousands of hours disappear quietly. Kalnehi makes the cost visible — and the win inevitable.",
  },
  {
    kicker: "Your mission",
    title: "One track. One straight line. No pretending.",
    body: "JEE, NEET, UPSC, GATE — your track can include more than one paper. We’re not here to motivate you for five minutes. We’re here to keep you honest until the work is done.",
  },
  {
    kicker: "What you’ll feel",
    title: "Clarity before you open the book.",
    body: "Daily execution, streaks, and a target that moves when you move — so the abstract score finally feels real.",
  },
];

type Props = {
  onComplete: () => void;
};

export function CinematicOnboarding({ onComplete }: Props) {
  const [idx, setIdx] = useState(0);

  const advance = useCallback(() => {
    if (idx < SLIDES.length - 1) {
      setIdx((i) => i + 1);
      return;
    }
    writeCinematicOnboardingDone();
    onComplete();
  }, [idx, onComplete]);

  const slide = SLIDES[idx];

  return (
    <div className="relative flex min-h-[min(100dvh,900px)] flex-col justify-end overflow-hidden bg-gradient-to-b from-zinc-950 via-zinc-900 to-black px-6 pb-10 pt-16 text-white sm:px-10 sm:pb-14">
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.12]"
        style={{
          backgroundImage:
            "radial-gradient(ellipse 80% 50% at 50% -20%, rgba(239,159,39,0.5), transparent)",
        }}
      />
      <AnimatePresence mode="wait">
        <motion.div
          key={slide.title}
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -12 }}
          transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
          className="relative max-w-lg"
        >
          <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-amber-200/90">
            {slide.kicker}
          </p>
          <h1 className="mt-4 font-serif text-[1.85rem] font-normal leading-[1.15] tracking-tight sm:text-4xl">
            {slide.title}
          </h1>
          <p className="mt-5 text-[15px] leading-relaxed text-zinc-300 sm:text-base">
            {slide.body}
          </p>
        </motion.div>
      </AnimatePresence>

      <div className="relative mt-12 flex items-center gap-3">
        <div className="flex gap-1.5">
          {SLIDES.map((_, i) => (
            <span
              key={i}
              className="h-1.5 w-1.5 rounded-full transition-colors"
              style={{
                background:
                  i === idx ? "rgba(239,159,39,0.95)" : "rgba(255,255,255,0.25)",
              }}
              aria-hidden
            />
          ))}
        </div>
        <button
          type="button"
          onClick={advance}
          className="ml-auto inline-flex min-h-[48px] items-center gap-2 rounded-full bg-amber-500 px-6 text-sm font-semibold text-zinc-950 shadow-lg transition-transform active:scale-[0.98] hover:bg-amber-400"
        >
          {idx < SLIDES.length - 1 ? (
            <>
              Continue
              <ArrowRight className="h-4 w-4" aria-hidden />
            </>
          ) : (
            "Begin setup"
          )}
        </button>
      </div>
    </div>
  );
}

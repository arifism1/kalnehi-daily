"use client";

import { AnimatePresence, motion } from "framer-motion";
import { useCallback, useId, useMemo, useState, type CSSProperties } from "react";

import { NightIllustration } from "@/components/welcome/illustrations/NightIllustration";
import { Check } from "lucide-react";

const CREAM = "#FAF6F1";
const ORANGE = "#F07B1D";

const spring = { type: "spring" as const, stiffness: 100, damping: 20, mass: 0.9 };

const section = {
  initial: { opacity: 0, y: 14 },
  animate: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { ...spring, delay: i * 0.6 },
  }),
};

const check = {
  initial: { scale: 0, opacity: 0 },
  animate: (i: number) => ({
    scale: 1,
    opacity: 1,
    transition: {
      type: "spring" as const,
      stiffness: 400,
      damping: 18,
      delay: 0.4 + i * 0.09,
    },
  }),
};

export type NightShutdownSummary = {
  tasksCompleted: number;
  tasksTotal: number;
  hoursStudied: number;
  /** 0–100 */
  syllabusPercent: number;
};

export type NightShutdownScreenProps = {
  summary: NightShutdownSummary;
  nightQuote: string;
  onClose: () => void;
};

type Star = { l: string; t: string; s: string; d: string; del: string };

/**
 * End-of-day reward flow — not skippable; must use “Close & Rest”.
 */
export function NightShutdownScreen({
  summary,
  nightQuote,
  onClose,
}: NightShutdownScreenProps) {
  const [fadeBlack, setFadeBlack] = useState(false);
  const titleId = useId();
  const stars = useStarfield(26);

  const runClose = useCallback(() => {
    setFadeBlack(true);
    window.setTimeout(() => {
      onClose();
    }, 1000);
  }, [onClose]);

  return (
    <div
      className="relative min-h-dvh w-full max-w-none overflow-x-hidden bg-[#1A1209] text-[#FAF6F1]"
      style={{ color: CREAM }}
    >
      <div className="pointer-events-none absolute inset-0 z-0 overflow-hidden" aria-hidden>
        {stars.map((st, i) => (
          <div
            key={i}
            className="kal-welcome-star absolute rounded-full bg-[#FAF6F1]"
            style={
              {
                left: st.l,
                top: st.t,
                width: st.s,
                height: st.s,
                "--twinkle-dur": st.d,
                "--twinkle-delay": st.del,
              } as CSSProperties
            }
          />
        ))}
      </div>

      <div
        className="relative z-10 flex min-h-dvh flex-col px-5 pb-[max(1.25rem,env(safe-area-inset-bottom))] pt-[max(0.5rem,env(safe-area-inset-top))]"
        role="dialog"
        aria-modal
        aria-labelledby={titleId}
      >
        <p className="text-center text-xs font-medium tracking-[0.18em] text-[#FAF6F1]/40">
          Kalnehi Daily
        </p>
        <NightIllustration className="mx-auto w-full" />

        <h1
          id={titleId}
          className="sr-only"
        >
          Night shutdown — today&apos;s summary
        </h1>

        <div className="mt-1 flex min-h-0 flex-1 flex-col gap-5 md:gap-3 lg:grid lg:grid-cols-2 lg:items-start lg:gap-x-6 lg:gap-y-4 xl:gap-x-8">
          <motion.section
            custom={0}
            initial="initial"
            animate="animate"
            variants={section}
            className="rounded-2xl border border-white/10 bg-[#231810]/80 px-4 py-3 backdrop-blur-sm lg:max-w-md xl:max-w-none"
          >
            <h2 className="text-left text-sm font-semibold text-[#FAF6F1]/80">
              Today’s summary
            </h2>
            <ul className="mt-2 space-y-2 text-sm text-[#FAF6F1]/90">
              <li className="flex items-center gap-2">
                <motion.span
                  custom={0}
                  initial="initial"
                  animate="animate"
                  variants={check}
                  className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-emerald-500/20"
                >
                  <Check className="h-3.5 w-3.5 text-emerald-400" strokeWidth={2.5} />
                </motion.span>
                <span>
                  Tasks:{" "}
                  <span className="font-semibold text-[#FAF6F1]">
                    {summary.tasksCompleted} / {summary.tasksTotal}
                  </span>
                </span>
              </li>
              <li className="flex items-center gap-2">
                <motion.span
                  custom={1}
                  initial="initial"
                  animate="animate"
                  variants={check}
                  className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-emerald-500/20"
                >
                  <Check className="h-3.5 w-3.5 text-emerald-400" strokeWidth={2.5} />
                </motion.span>
                <span>
                  Time studied:{" "}
                  <span className="font-semibold text-[#FAF6F1]">
                    {summary.hoursStudied} h
                  </span>
                </span>
              </li>
              <li className="flex items-center gap-2">
                <motion.span
                  custom={2}
                  initial="initial"
                  animate="animate"
                  variants={check}
                  className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-emerald-500/20"
                >
                  <Check className="h-3.5 w-3.5 text-emerald-400" strokeWidth={2.5} />
                </motion.span>
                <span>
                  Syllabus:{" "}
                  <span className="font-semibold text-[#FAF6F1]">
                    {summary.syllabusPercent}%
                  </span>{" "}
                  moved
                </span>
              </li>
            </ul>
          </motion.section>

          <div className="flex min-h-0 flex-1 flex-col gap-4 md:gap-3 lg:col-span-1 lg:flex-none lg:gap-4">
            <motion.section
              custom={1}
              initial="initial"
              animate="animate"
              variants={section}
              className="flex flex-1 flex-col items-center justify-center py-1 text-center lg:flex-none lg:items-start lg:justify-start lg:text-left"
            >
              <p className="text-xs font-medium uppercase tracking-[0.2em] text-[#FAF6F1]/50">
                Night motivation
              </p>
              <p className="mt-3 max-w-prose text-balance text-xl leading-relaxed text-[#FAF6F1]/90 font-serif md:mt-2 md:text-2xl lg:text-3xl">
                {nightQuote}
              </p>
            </motion.section>

            <motion.section
              custom={2}
              initial="initial"
              animate="animate"
              variants={section}
              className="text-center lg:text-left"
            >
              <p className="text-lg font-[family-name:var(--font-kal-heading)] font-semibold text-[#FAF6F1] md:text-xl">
                You showed up today. That&apos;s everything.
              </p>
              <p className="mt-2 text-sm text-[#FAF6F1]/60 md:text-base">
                Tomorrow&apos;s plan is ready when you are.
              </p>
            </motion.section>
          </div>

          <motion.section
            custom={3}
            initial="initial"
            animate="animate"
            variants={section}
            className="text-center lg:col-span-2"
          >
            <button
              type="button"
              onClick={runClose}
              className="mx-auto inline-flex w-full min-h-[52px] max-w-md items-center justify-center rounded-2xl border border-[#F07B1D]/50 bg-gradient-to-b from-[#2a1f0f] to-[#1A1209] px-4 text-base font-semibold text-[#FAF6F1] shadow-[0_0_32px_rgba(240,123,29,0.28)] transition-transform active:scale-[0.99] md:max-w-lg lg:max-w-xl"
              style={{ color: CREAM, borderColor: `${ORANGE}80` }}
            >
              Close & Rest 🌙
            </button>
          </motion.section>
        </div>
      </div>

      <AnimatePresence>
        {fadeBlack ? (
          <motion.div
            key="fade"
            className="fixed inset-0 z-[500] bg-black"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 1 }}
            transition={{ duration: 1, ease: [0.22, 0.1, 0.36, 1] }}
          />
        ) : null}
      </AnimatePresence>
    </div>
  );
}

function useStarfield(n: number): Star[] {
  return useMemo(() => {
    return Array.from({ length: n }, (_, i) => {
      const del = 0.12 + ((i * 0.19) % 0.6);
      const dur = 0.5 + ((i * 0.7) % 1.4);
      return {
        l: `${(i * 13 + 7) % 88}%`,
        t: `${(i * 19 + 3) % 70}%`,
        s: `${2 + (i % 3)}px`,
        d: `${dur}s`,
        del: `${del}s`,
      } satisfies Star;
    });
  }, [n]);
}

export { ORANGE, CREAM };

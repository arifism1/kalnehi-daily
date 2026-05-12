"use client";

import { motion } from "framer-motion";
import {
  BarChart3,
  BookOpen,
  Brain,
  Mic,
  Target,
} from "lucide-react";

type TourWelcomeModalProps = {
  onStart: () => void;
  onSkip: () => void;
};

const ICON_RING = [
  { Icon: Brain, color: "#7F77DD", label: "Mastermind AI", delay: 0.55 },
  { Icon: Target, color: "#EF9F27", label: "Target Score", delay: 0.65 },
  { Icon: BookOpen, color: "#1D9E75", label: "Syllabus", delay: 0.75 },
  { Icon: Mic, color: "#D4537E", label: "Voice", delay: 0.85 },
  { Icon: BarChart3, color: "#5BA4CF", label: "Progress", delay: 0.95 },
];

/**
 * Full-screen animated welcome overlay shown at step 0.
 * Introduces the tour with a brief pitch and two CTAs.
 */
export function TourWelcomeModal({ onStart, onSkip }: TourWelcomeModalProps) {
  return (
    <div className="fixed inset-0 z-[70] flex flex-col items-center justify-center bg-kal-page px-6">
      {/* Animated icon ring */}
      <div className="relative mb-8 flex h-40 w-40 items-center justify-center">
        {/* Central pulsing orb */}
        <motion.div
          className="absolute h-20 w-20 rounded-full bg-kal-accent/15"
          animate={{ scale: [1, 1.12, 1] }}
          transition={{ duration: 2.4, repeat: Infinity, ease: "easeInOut" }}
        />
        <motion.div
          className="absolute h-12 w-12 rounded-full bg-kal-accent/25"
          animate={{ scale: [1, 1.08, 1] }}
          transition={{
            duration: 2.4,
            repeat: Infinity,
            ease: "easeInOut",
            delay: 0.4,
          }}
        />
        <motion.div
          className="relative z-10 flex h-10 w-10 items-center justify-center rounded-full bg-kal-accent shadow-md"
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ delay: 0.2, type: "spring", stiffness: 260, damping: 20 }}
        >
          <Brain className="h-5 w-5 text-white" aria-hidden />
        </motion.div>

        {/* Orbiting feature icons */}
        {ICON_RING.map(({ Icon, color, label, delay }, idx) => {
          const angle = (idx / ICON_RING.length) * 360 - 90;
          const rad = (angle * Math.PI) / 180;
          const r = 58;
          const x = Math.cos(rad) * r;
          const y = Math.sin(rad) * r;
          return (
            <motion.div
              key={label}
              className="absolute flex h-9 w-9 items-center justify-center rounded-full border border-white/30 bg-white shadow-sm dark:bg-zinc-900"
              style={{ left: "50%", top: "50%", marginLeft: x - 18, marginTop: y - 18 }}
              initial={{ scale: 0, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{
                delay,
                type: "spring",
                stiffness: 300,
                damping: 22,
              }}
            >
              <Icon className="h-4 w-4" style={{ color }} aria-hidden />
            </motion.div>
          );
        })}
      </div>

      {/* Headline */}
      <motion.h1
        className="text-center font-serif text-[26px] font-semibold leading-tight text-kal-text"
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3, duration: 0.5, ease: "easeOut" }}
      >
        Welcome to Kalnehi Daily
      </motion.h1>

      <motion.p
        className="mt-3 max-w-[300px] text-center text-[14px] leading-relaxed text-kal-text-secondary"
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.45, duration: 0.5, ease: "easeOut" }}
      >
        Here&apos;s what makes Kalnehi different from every other study app.
        We&apos;ll walk you through 12 tools in under 2 minutes.
      </motion.p>

      {/* Feature count chips */}
      <motion.div
        className="mt-5 flex flex-wrap justify-center gap-2"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.9, duration: 0.4 }}
      >
        {[
          { label: "5 Power features", color: "#EF9F27" },
          { label: "7 Workflow tools", color: "#1D9E75" },
        ].map(({ label, color }) => (
          <span
            key={label}
            className="inline-flex items-center gap-1.5 rounded-full border border-current/15 px-3 py-1 text-[12px] font-medium"
            style={{ color, backgroundColor: `${color}14` }}
          >
            <span
              className="h-1.5 w-1.5 rounded-full"
              style={{ backgroundColor: color }}
              aria-hidden
            />
            {label}
          </span>
        ))}
      </motion.div>

      {/* CTAs */}
      <motion.div
        className="mt-8 flex w-full max-w-[320px] flex-col gap-3"
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 1.05, duration: 0.45, ease: "easeOut" }}
      >
        <button
          type="button"
          onClick={onStart}
          className="w-full rounded-xl bg-kal-accent px-4 py-3 text-[15px] font-semibold text-white transition-opacity active:opacity-80"
        >
          Show me around
        </button>
        <button
          type="button"
          onClick={onSkip}
          className="w-full rounded-xl px-4 py-2.5 text-[14px] font-medium text-kal-muted transition-colors hover:text-kal-text"
        >
          Skip tour
        </button>
      </motion.div>
    </div>
  );
}

"use client";

import { motion, useReducedMotion } from "framer-motion";

type EndOfDaySummaryProps = {
  open: boolean;
  onClose: () => void;
  tasksDone: number;
  totalTasks: number;
  minutesStudied: number;
  streak: number;
};

/**
 * Cinematic end-of-day recap (Night Debrief).
 */
export function EndOfDaySummary({
  open,
  onClose,
  tasksDone,
  totalTasks,
  minutesStudied,
  streak,
}: EndOfDaySummaryProps) {
  const reduce = useReducedMotion();
  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-label="End of day recap"
    >
      <motion.div
        initial={reduce ? false : { opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md rounded-3xl border border-violet-200/20 bg-zinc-950/95 p-6 text-violet-50 shadow-2xl"
      >
        <p className="text-center text-xs font-bold uppercase tracking-[0.2em] text-violet-300/80">
          Night Debrief
        </p>
        <h2 className="mt-1 text-center font-serif text-2xl font-bold">You showed up</h2>
        <div className="mt-6 grid grid-cols-2 gap-3 text-center text-sm">
          <div className="rounded-2xl bg-white/5 px-3 py-4">
            <p className="text-2xl font-black tabular-nums text-amber-300">{tasksDone}</p>
            <p className="text-[11px] text-zinc-400">Tasks done of {totalTasks}</p>
          </div>
          <div className="rounded-2xl bg-white/5 px-3 py-4">
            <p className="text-2xl font-black tabular-nums text-emerald-300">
              {minutesStudied}m
            </p>
            <p className="text-[11px] text-zinc-400">In flow</p>
          </div>
        </div>
        <p className="mt-4 text-center text-sm text-violet-200/90">
          Streak: <span className="font-bold text-amber-300">{streak} days</span> of execution.
        </p>
        <p className="mt-2 text-center text-xs text-zinc-500">
          What felt hardest to start — and what will you do 1% better tomorrow?
        </p>
        <button
          type="button"
          onClick={onClose}
          className="mt-6 w-full rounded-2xl bg-violet-500 py-3 text-sm font-bold text-white"
        >
          Close
        </button>
      </motion.div>
    </div>
  );
}

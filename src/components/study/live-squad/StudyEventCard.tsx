"use client";

import { motion, useReducedMotion } from "framer-motion";

import type { StudySquadEvent } from "./types";

export type StudyEventCardProps = {
  event: StudySquadEvent;
  /** Rotating pastel accent for studio feed (0 mint / 1 sky / 2 pink). */
  accentVariant?: number;
};

const pulseTransition = {
  repeat: Infinity,
  duration: 1.6,
  ease: "easeInOut" as const,
};

const ACCENT_STYLES = [
  "border-emerald-300/55 bg-emerald-50/90 dark:border-emerald-500/25 dark:bg-emerald-950/40",
  "border-sky-300/55 bg-sky-50/90 dark:border-sky-500/25 dark:bg-sky-950/35",
  "border-fuchsia-300/50 bg-fuchsia-50/85 dark:border-fuchsia-500/20 dark:bg-fuchsia-950/30",
];

const AVATAR_STYLES = [
  "bg-emerald-400/35 text-emerald-950 dark:bg-emerald-400/50 dark:text-emerald-950",
  "bg-sky-400/35 text-sky-950 dark:bg-sky-400/45 dark:text-sky-950",
  "bg-fuchsia-400/35 text-fuchsia-950 dark:bg-fuchsia-400/45 dark:text-fuchsia-950",
];

export function StudyEventCard({ event, accentVariant = 0 }: StudyEventCardProps) {
  const reduceMotion = useReducedMotion();
  const i = ((accentVariant % 3) + 3) % 3;
  const borderAccent = ACCENT_STYLES[i]!;
  const avatarAccent = AVATAR_STYLES[i]!;

  const dotClass =
    event.tone === "active"
      ? "bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.6)]"
      : "bg-rose-500 shadow-[0_0_8px_rgba(244,63,94,0.55)]";

  const initial = reduceMotion ? { opacity: 0 } : { opacity: 0, y: 16 };
  const animate = reduceMotion ? { opacity: 1 } : { opacity: 1, y: 0 };
  const exit = reduceMotion ? { opacity: 0 } : { opacity: 0, y: -12 };

  return (
    <motion.div
      layout
      initial={initial}
      animate={animate}
      exit={exit}
      transition={{
        layout: reduceMotion ? { duration: 0.15 } : { type: "spring", stiffness: 420, damping: 32 },
        opacity: { duration: reduceMotion ? 0.12 : 0.22 },
        y: { duration: reduceMotion ? 0.12 : 0.28, ease: [0.22, 1, 0.36, 1] },
      }}
      className={`flex min-h-[44px] w-full items-center gap-2.5 rounded-2xl border-2 px-3 py-2.5 shadow-sm backdrop-blur-md sm:min-h-0 ${borderAccent}`}
    >
      <div
        className={`relative flex size-9 shrink-0 items-center justify-center rounded-xl text-xs font-extrabold ${avatarAccent}`}
      >
        {event.peerName.slice(0, 1)}
        <motion.span
          className={`absolute -right-0.5 -top-0.5 size-2 rounded-full ${dotClass}`}
          aria-hidden
          animate={
            reduceMotion
              ? undefined
              : { scale: [1, 1.2, 1], opacity: [1, 0.72, 1] }
          }
          transition={reduceMotion ? undefined : pulseTransition}
        />
      </div>
      <p className="line-clamp-2 min-w-0 flex-1 text-left text-xs font-medium leading-snug text-zinc-900 dark:text-zinc-100">
        <span className="font-extrabold text-zinc-950 dark:text-white">{event.peerName}</span>
        <span className="font-semibold text-zinc-600 dark:text-zinc-400"> · {event.subject} — </span>
        <span className="text-zinc-800 dark:text-zinc-300">{event.status}</span>
      </p>
    </motion.div>
  );
}

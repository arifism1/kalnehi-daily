"use client";

import { AnimatePresence } from "framer-motion";

import { examDisplayLabel } from "@/lib/examProfile";

import { StudyEventCard } from "./StudyEventCard";
import { useSimulatedStudySquadFeed } from "./useSimulatedStudySquadFeed";

export type StudySquadFeedPanelProps = {
  /** When false, feed pauses and clears. */
  enabled?: boolean;
  /** Target exam from profile (`usePrimaryExamLabel`); scopes copy and mock score caps. */
  examLabel: string | null;
  /** Syllabus-only subject lines from the server (merged tracker rows). */
  syllabusLabels: readonly string[];
  /** Stable fingerprint for the hook when labels update. */
  syllabusLabelsKey: string;
  /** `embedded`: no outer glass card — for Study Squad studio shell. */
  variant?: "default" | "embedded";
  className?: string;
};

export function StudySquadFeedPanel({
  enabled = true,
  examLabel,
  syllabusLabels,
  syllabusLabelsKey,
  variant = "default",
  className = "",
}: StudySquadFeedPanelProps) {
  const events = useSimulatedStudySquadFeed(
    enabled,
    examLabel,
    syllabusLabels,
    syllabusLabelsKey,
  );

  const hasSyllabusLabels = syllabusLabels.length > 0;

  const header = (
    <>
      <p
        className={
          variant === "embedded"
            ? "text-[0.65rem] font-extrabold uppercase tracking-[0.2em] text-sky-700 dark:text-sky-300"
            : "text-[0.65rem] font-semibold uppercase tracking-widest text-kal-accent"
        }
      >
        Live feed
      </p>
      <p
        className={
          variant === "embedded"
            ? "mt-1.5 text-sm font-bold leading-snug text-zinc-800 dark:text-sky-100/90"
            : "mt-1 text-sm text-kal-text"
        }
      >
        {hasSyllabusLabels
          ? examLabel?.trim()
            ? "What are they doing?"
            : "Squad pulses — set your target exam in Profile."
          : examLabel?.trim()
            ? `No syllabus microtopics in your tracker yet for ${examDisplayLabel(examLabel)} — this feed won’t invent subjects. Try Syllabus Tracker.`
            : "Sign in and open Syllabus Tracker — task lines only use your real syllabus rows."}
      </p>
    </>
  );

  const list = (
    <div
      className={`flex min-h-[min(55dvh,28rem)] max-h-[min(55dvh,28rem)] flex-col justify-end gap-2.5 overflow-hidden ${
        variant === "embedded" ? "pt-1" : ""
      }`}
      aria-live="polite"
      aria-relevant="additions text"
    >
      <AnimatePresence initial={false} mode="popLayout">
        {events.map((ev, i) => (
          <StudyEventCard key={ev.id} event={ev} accentVariant={i % 3} />
        ))}
      </AnimatePresence>
    </div>
  );

  if (variant === "embedded") {
    return (
      <section
        className={`bg-transparent ${className}`}
        aria-label="Live study squad feed"
      >
        <header className="mb-4 border-b border-sky-200/70 pb-3 dark:border-sky-800/50">
          {header}
        </header>
        {list}
      </section>
    );
  }

  return (
    <section
      className={`overflow-hidden rounded-2xl border border-kal-border bg-kal-card/80 p-4 shadow-xl backdrop-blur-xl kal-shadow-card sm:p-5 ${className}`}
      aria-label="Live study squad feed"
    >
      <header className="mb-3 border-b border-kal-border/80 pb-3">{header}</header>
      {list}
    </section>
  );
}

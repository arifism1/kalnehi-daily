"use client";

import { Bell } from "lucide-react";

import { StudySquadFeedPanel } from "@/components/study/live-squad";
import { examDisplayLabel } from "@/lib/examProfile";
import { usePrimaryExamLabel } from "@/hooks/usePrimaryExamLabel";

type StudySquadPageContentProps = {
  syllabusLabels: string[];
  syllabusLabelsKey: string;
};

export default function StudySquadPageContent({
  syllabusLabels,
  syllabusLabelsKey,
}: StudySquadPageContentProps) {
  const { examLabel } = usePrimaryExamLabel();
  const examShort = examLabel?.trim() ? examDisplayLabel(examLabel) : null;

  return (
    <div className="study-squad-studio isolate mx-auto flex w-full max-w-lg flex-col px-0 pb-8 sm:max-w-xl">
      {/* z-[1]: hero stays below cohort/feed so negative margins read as “card stack,” not hidden content */}
      <div className="relative z-[1] overflow-hidden rounded-t-[1.75rem] bg-gradient-to-br from-[#bef264] via-[#86efac] to-[#4ade80] px-5 pb-8 pt-6 text-zinc-900 shadow-[0_14px_48px_-14px_rgba(34,197,94,0.55)] dark:from-lime-300 dark:via-lime-200 dark:to-emerald-400 dark:shadow-[0_14px_48px_-14px_rgba(163,230,53,0.35)]">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="text-[0.65rem] font-bold uppercase tracking-[0.22em] text-zinc-800/75 dark:text-zinc-900/80">
              Study room
            </p>
            <h1 className="mt-2 font-sans text-[1.65rem] font-extrabold leading-tight tracking-tight sm:text-3xl">
              Study Squad
            </h1>
          </div>
          <div className="flex shrink-0 flex-col items-end gap-2">
            <span
              className="inline-flex items-center gap-1.5 rounded-full bg-zinc-900/12 px-3 py-1 text-[0.65rem] font-bold uppercase tracking-wide text-zinc-900 dark:bg-zinc-900/18"
              aria-hidden
            >
              <span className="relative flex size-2">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-zinc-900/40 opacity-60" />
                <span className="relative inline-flex size-2 rounded-full bg-zinc-900" />
              </span>
              Live
            </span>
            <span
              className="flex size-10 items-center justify-center rounded-full bg-zinc-900/10 dark:bg-zinc-900/15"
              aria-hidden
            >
              <Bell className="size-5 text-zinc-900/80" strokeWidth={2.25} />
            </span>
          </div>
        </div>
        <div
          className="pointer-events-none absolute bottom-0 left-1/2 h-4 w-[42%] max-w-[200px] -translate-x-1/2 translate-y-1/2 rounded-full bg-[#99f6e4]/95 shadow-sm dark:bg-zinc-950/30"
          aria-hidden
        />
      </div>

      <div className="relative z-[2] -mt-6 mx-2 rounded-2xl rounded-t-[1.35rem] border border-teal-200/60 bg-gradient-to-r from-[#ccfbf1] to-[#5eead4]/90 px-4 py-3.5 text-zinc-900 shadow-md dark:border-teal-700/40 dark:from-teal-900/75 dark:to-emerald-900/70 dark:text-teal-50">
        <p className="text-[0.65rem] font-bold uppercase tracking-[0.18em] text-teal-900/80 dark:text-teal-200/90">
          Today&apos;s cohort
        </p>
        <p className="mt-1 text-sm font-bold leading-snug">
          {examShort ? (
            <>
              <span className="opacity-90">Prep lane · </span>
              <span className="text-zinc-900 dark:text-white">{examShort}</span>
            </>
          ) : (
            <span className="font-semibold opacity-90">
              Set your exam in Profile — we&apos;ll match subjects in the feed.
            </span>
          )}
        </p>
      </div>

      <div className="relative z-[1] -mt-3 rounded-b-[1.75rem] rounded-t-3xl border-2 border-sky-300/45 bg-gradient-to-b from-sky-100/70 via-white/90 to-white px-3 pb-5 pt-6 shadow-[0_20px_50px_-24px_rgba(14,165,233,0.45)] dark:border-sky-500/20 dark:from-sky-950/55 dark:via-zinc-900/92 dark:to-zinc-950 dark:shadow-[0_24px_60px_-20px_rgba(14,165,233,0.2)] sm:px-4">
        <StudySquadFeedPanel
          examLabel={examLabel}
          syllabusLabels={syllabusLabels}
          syllabusLabelsKey={syllabusLabelsKey}
          variant="embedded"
        />
      </div>
    </div>
  );
}

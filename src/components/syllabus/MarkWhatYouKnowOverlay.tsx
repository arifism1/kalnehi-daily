"use client";

import clsx from "clsx";
import { Check, ChevronRight } from "lucide-react";
import { useCallback, useMemo, useState } from "react";

import { completeActivationFlow } from "@/actions/activation";
import { useSyllabusTracker } from "@/hooks/useSyllabusTracker";
import {
  chapterKey,
  groupBySubjectAndChapter,
  sortSubjects,
} from "@/lib/syllabusGrouping";
import { toUserFacingMessage } from "@/lib/userFacingErrors";

type ChapterOption = {
  key: string;
  subject: string;
  chapter: string;
  microtopicIds: string[];
  alreadyComplete: boolean;
};

export function MarkWhatYouKnowOverlay({
  open,
  onDone,
}: {
  open: boolean;
  onDone: () => void;
}) {
  const { rows, rollup, setChapterCompleted } = useSyllabusTracker();
  const [selected, setSelected] = useState<Set<string>>(() => new Set());
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const chapters = useMemo((): ChapterOption[] => {
    const grouped = groupBySubjectAndChapter(rows);
    const chapterRollupMap = new Map(
      rollup.chapters.map((c) => [chapterKey(c.subject, c.chapter), c]),
    );
    const out: ChapterOption[] = [];
    for (const [subject, chMap] of grouped) {
      for (const [chapter, list] of chMap) {
        const key = chapterKey(subject, chapter);
        const rollupCh = chapterRollupMap.get(key);
        const alreadyComplete =
          rollupCh != null &&
          rollupCh.totalCount > 0 &&
          rollupCh.completedCount === rollupCh.totalCount;
        out.push({
          key,
          subject,
          chapter,
          microtopicIds: list.map((r) => r.id),
          alreadyComplete,
        });
      }
    }
    return out.toSorted((a, b) => {
      const sub = sortSubjects(a.subject, b.subject);
      if (sub !== 0) return sub;
      return a.chapter.localeCompare(b.chapter, undefined, { numeric: true });
    });
  }, [rows, rollup.chapters]);

  const subjects = useMemo(() => {
    const s = new Set(chapters.map((c) => c.subject));
    return [...s].toSorted(sortSubjects);
  }, [chapters]);

  const toggle = useCallback((key: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }, []);

  const submit = useCallback(async () => {
    setBusy(true);
    setError(null);
    try {
      const toMark = chapters.filter((c) => selected.has(c.key) && !c.alreadyComplete);
      for (const ch of toMark) {
        if (ch.microtopicIds.length === 0) continue;
        const ok = await setChapterCompleted(ch.microtopicIds, true);
        if (!ok) throw new Error("Could not save chapter progress. Try again.");
      }
      const res = await completeActivationFlow();
      if (!res.ok) throw new Error(res.error);
      onDone();
    } catch (e) {
      setError(toUserFacingMessage(e));
    } finally {
      setBusy(false);
    }
  }, [chapters, selected, setChapterCompleted, onDone]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[80] flex items-end justify-center bg-black/60 p-4 sm:items-center">
      <div
        className="kal-glass-panel flex max-h-[min(90vh,720px)] w-full max-w-lg flex-col rounded-2xl border border-kal-border shadow-2xl"
        role="dialog"
        aria-modal="true"
        aria-labelledby="mark-what-you-know-title"
      >
        <div className="border-b border-kal-border/60 p-5">
          <h2 id="mark-what-you-know-title" className="text-lg font-semibold text-kal-text">
            Mark what you&apos;ve already covered
          </h2>
          <p className="mt-1 text-sm text-kal-text-secondary">
            Select finished chapters — we&apos;ll show your real projected score right away.
            Skip anything you&apos;re still working on.
          </p>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-5">
          {subjects.map((subject) => (
            <div key={subject}>
              <p className="text-xs font-semibold uppercase tracking-wide text-kal-accent">
                {subject}
              </p>
              <ul className="mt-2 space-y-1">
                {chapters
                  .filter((c) => c.subject === subject)
                  .map((ch) => {
                    const isSelected = selected.has(ch.key) || ch.alreadyComplete;
                    return (
                      <li key={ch.key}>
                        <button
                          type="button"
                          disabled={ch.alreadyComplete || busy}
                          onClick={() => toggle(ch.key)}
                          className={clsx(
                            "flex w-full min-h-[44px] items-center gap-3 rounded-xl border px-3 py-2 text-left text-sm transition-colors",
                            isSelected
                              ? "border-kal-accent/50 bg-kal-accent/10 text-kal-text"
                              : "border-kal-border/60 bg-kal-card/40 text-kal-text-secondary hover:border-kal-accent/30",
                            ch.alreadyComplete && "opacity-60",
                          )}
                        >
                          <span
                            className={clsx(
                              "flex size-5 shrink-0 items-center justify-center rounded-md border",
                              isSelected
                                ? "border-kal-accent bg-kal-accent text-kal-accent-foreground"
                                : "border-kal-border",
                            )}
                          >
                            {isSelected ? <Check className="size-3" /> : null}
                          </span>
                          <span className="min-w-0 flex-1 truncate">{ch.chapter}</span>
                        </button>
                      </li>
                    );
                  })}
              </ul>
            </div>
          ))}
        </div>

        {error ? (
          <p className="px-5 text-sm text-kal-warn-text">{error}</p>
        ) : null}

        <div className="flex gap-2 border-t border-kal-border/60 p-4">
          <button
            type="button"
            disabled={busy}
            onClick={() => void submit()}
            className="inline-flex min-h-[48px] flex-1 items-center justify-center gap-2 rounded-xl bg-kal-accent px-4 text-sm font-semibold text-kal-accent-foreground hover:bg-kal-accent-hover disabled:opacity-50"
          >
            {busy ? "Saving…" : selected.size > 0 ? `Mark ${selected.size} chapters` : "Continue"}
            <ChevronRight className="size-4" />
          </button>
        </div>
      </div>
    </div>
  );
}

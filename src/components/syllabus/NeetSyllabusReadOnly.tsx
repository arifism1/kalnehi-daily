import { BookMarked, ChevronDown } from "lucide-react";

import {
  groupBySubjectAndChapter,
  sortSubjects,
} from "@/lib/syllabusGrouping";
import { syllabusMarksWeight } from "@/lib/syllabusConstants";
import type { SyllabusRow } from "@/lib/syllabusRollup";

function formatYearMarks(row: SyllabusRow): string {
  const parts: string[] = [];
  if (row.marks_2025 != null && row.marks_2025 > 0) {
    parts.push(`2025: ${row.marks_2025}`);
  }
  if (row.marks_2024 != null && row.marks_2024 > 0) {
    parts.push(`2024: ${row.marks_2024}`);
  }
  if (row.marks_2023 != null && row.marks_2023 > 0) {
    parts.push(`2023: ${row.marks_2023}`);
  }
  return parts.length > 0 ? parts.join(" · ") : "—";
}

export function NeetSyllabusReadOnly({ rows }: { rows: SyllabusRow[] }) {
  const grouped = groupBySubjectAndChapter(rows);
  const subjects = [...grouped.keys()].sort(sortSubjects);

  if (rows.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-slate-600 bg-slate-950/40 px-4 py-14 text-center">
        <BookMarked className="mx-auto mb-4 h-12 w-12 text-kal-accent/70" />
        <p className="text-sm leading-relaxed text-zinc-400">
          Your NEET syllabus tree will appear here as soon as it&apos;s available
          for your account.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-3 pb-4">
      <header>
        <p className="text-[0.65rem] font-semibold uppercase tracking-widest text-kal-accent/90">
          NEET UG
        </p>
        <h1 className="mt-1 text-2xl font-bold tracking-tight text-white">
          Syllabus
        </h1>
        <p className="mt-1 text-sm text-zinc-500">
          Browse subjects, chapters, and microtopics with recent-year marks
          (read-only).
        </p>
      </header>

      <div className="space-y-3">
        {subjects.map((subject) => {
          const chapters = grouped.get(subject)!;
          const chapterNames = [...chapters.keys()].sort((a, b) =>
            a.localeCompare(b),
          );
          return (
            <details
              key={subject}
              className="group overflow-hidden rounded-2xl border border-slate-700/90 bg-slate-900/40 open:shadow-md"
            >
              <summary className="flex min-h-[48px] cursor-pointer list-none items-center justify-between gap-2 px-4 py-3 text-base font-semibold text-white marker:hidden [&::-webkit-details-marker]:hidden">
                <span className="flex items-center gap-2">
                  <BookMarked
                    className="h-5 w-5 shrink-0 text-kal-accent"
                    aria-hidden
                  />
                  {subject}
                </span>
                <ChevronDown className="h-5 w-5 shrink-0 text-zinc-500 transition-transform duration-200 group-open:rotate-180" />
              </summary>
              <div className="border-t border-slate-800">
                {chapterNames.map((chapter) => {
                  const list = chapters.get(chapter)!;
                  return (
                    <details
                      key={chapter}
                      className="group/ch border-b border-slate-800 last:border-b-0"
                    >
                      <summary className="cursor-pointer list-none bg-slate-950/50 px-4 py-3 marker:hidden [&::-webkit-details-marker]:hidden">
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center justify-between gap-2">
                              <span className="text-sm font-semibold text-zinc-100">
                                {chapter}
                              </span>
                              <ChevronDown className="h-4 w-4 shrink-0 text-zinc-500 transition-transform group-open/ch:rotate-180" />
                            </div>
                            <p className="mt-1 text-[11px] text-zinc-500">
                              {list.length} microtopic
                              {list.length === 1 ? "" : "s"}
                            </p>
                          </div>
                        </div>
                      </summary>
                      <ul className="divide-y divide-slate-800/80">
                        {list.map((row) => {
                          const weight = syllabusMarksWeight(row);
                          const years = formatYearMarks(row);
                          return (
                            <li
                              key={row.id}
                              className="bg-slate-950/20 px-4 py-3 sm:px-5"
                            >
                              <p className="text-[15px] font-semibold leading-snug text-white">
                                {row.microtopic}
                              </p>
                              <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs">
                                <span className="text-zinc-300">
                                  <span className="font-medium text-kal-accent/90">
                                    {weight}
                                  </span>{" "}
                                  marks weight
                                </span>
                                <span className="text-zinc-500">
                                  Years:{" "}
                                  <span className="font-medium text-zinc-400">
                                    {years}
                                  </span>
                                </span>
                              </div>
                            </li>
                          );
                        })}
                      </ul>
                    </details>
                  );
                })}
              </div>
            </details>
          );
        })}
      </div>
    </div>
  );
}

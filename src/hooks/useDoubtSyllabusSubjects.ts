"use client";

import { useMemo } from "react";

import { DOUBT_GENERAL_SUBJECT } from "@/lib/doubtSubjects";
import { useAllExamScopes, type ExamScope } from "@/hooks/useAllExamScopes";

/**
 * Computes a disambiguated, sorted subject list from all enabled exams.
 *
 * Subjects that appear in only one exam are shown with their plain name.
 * Subjects that share a name across two or more exams get a short exam tag
 * appended, e.g. "Physics [NEET]" vs "Physics [JEE]".
 *
 * The "General" catch-all is always appended at the end.
 */
function disambiguateSubjects(scopes: ExamScope[]): {
  allSubjects: string[];
  subjectsByExam: { examLabel: string; examDisplay: string; subjects: string[] }[];
} {
  // Build a map: plainSubject → Set of examLabels that have it
  const subjectExams = new Map<string, Set<string>>();
  for (const scope of scopes) {
    for (const row of scope.rows) {
      const s = row.subject?.trim();
      if (!s) continue;
      const existing = subjectExams.get(s) ?? new Set<string>();
      existing.add(scope.examLabel);
      subjectExams.set(s, existing);
    }
  }

  // Build short label for each exam (first 8 chars of displayName or examLabel)
  function shortLabel(scope: ExamScope): string {
    const name = (scope.displayName || scope.examLabel).trim();
    // Try to extract a meaningful short form: last two words (e.g. "CSE Prelims")
    const words = name.split(/\s+/);
    if (words.length <= 2) return name;
    return words.slice(-2).join(" ");
  }

  const subjectsByExam = scopes.map((scope) => {
    const seen = new Set<string>();
    const subjects: string[] = [];
    for (const row of scope.rows) {
      const s = row.subject?.trim();
      if (!s || seen.has(s)) continue;
      seen.add(s);
      subjects.push(s);
    }
    subjects.sort((a, b) => a.localeCompare(b));
    return { examLabel: scope.examLabel, examDisplay: scope.displayName || scope.examLabel, subjects };
  });

  // Build the labeled list for all-exam display
  const allLabeled = new Set<string>();

  if (scopes.length <= 1) {
    // Single exam: plain subjects
    for (const [s] of subjectExams) {
      allLabeled.add(s);
    }
  } else {
    for (const [s, exams] of subjectExams) {
      if (exams.size === 1) {
        allLabeled.add(s);
      } else {
        // Ambiguous — add one labeled entry per exam
        for (const examLabel of exams) {
          const scope = scopes.find((sc) => sc.examLabel === examLabel);
          if (scope) {
            allLabeled.add(`${s} [${shortLabel(scope)}]`);
          }
        }
      }
    }
  }

  const allSubjects = [...allLabeled].toSorted((a, b) => a.localeCompare(b));
  if (!allSubjects.includes(DOUBT_GENERAL_SUBJECT)) {
    allSubjects.push(DOUBT_GENERAL_SUBJECT);
  }

  return { allSubjects, subjectsByExam };
}

/**
 * Provides syllabus subjects from ALL enabled exams for use in Doubt Tracker
 * and Mistake Log. Derived in-memory from `useAllExamScopes` — no extra DB calls.
 *
 * Returns:
 * - `subjects`: flat labeled list for filter chips / selects
 * - `subjectsByExam`: per-exam subject list for exam-picker flows
 */
export function useDoubtSyllabusSubjects() {
  const { examScopes, loading } = useAllExamScopes();

  const { allSubjects: subjects, subjectsByExam } = useMemo(
    () => disambiguateSubjects(examScopes),
    [examScopes],
  );

  return { subjects, subjectsByExam, loading };
}

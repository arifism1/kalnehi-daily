"use client";

import { useMemo } from "react";

import { displayNameForExamCatalog } from "@/lib/examsCatalog";
import { examScoreMax } from "@/lib/examProfile";
import {
  computeSyllabusRollup,
  computeNeetYearProjections,
  type SyllabusRollup,
  type NeetYearProjection,
} from "@/lib/syllabusRollup";
import type { MergedSyllabusRow } from "@/lib/userSyllabusMerge";
import { useExamsCatalogRows } from "@/hooks/useExamsCatalogRows";
import { useSyllabusTracker } from "@/hooks/useSyllabusTracker";

/**
 * One fully-resolved scope per enabled exam. Used by feature pages that need
 * per-exam data simultaneously (Blueprint, Mock tests, Doubts, etc.).
 *
 * For single-exam users the array has exactly one element — call-sites stay
 * the same shape and the "multi-exam" UI chrome is hidden automatically.
 */
export type ExamScope = {
  examLabel: string;
  displayName: string;
  rows: MergedSyllabusRow[];
  maxScore: number;
  rollup: SyllabusRollup;
  neetYearProjections: NeetYearProjection[];
  primaryMarksYear: number;
  catalogExamKey: string | null;
  cuetDomainSubjects: string[];
  upscOptionalSubject: string | null;
};

/**
 * Returns one `ExamScope` per enabled exam in track order.
 *
 * Derives per-exam rollups from `examRollups` (already computed in
 * `useSyllabusTracker` when > 1 exam), falling back to the single global
 * rollup for legacy / single-exam users.
 *
 * Also re-exports `loading` and `error` from the underlying tracker so
 * consumers need only one hook.
 */
export function useAllExamScopes(): {
  examScopes: ExamScope[];
  loading: boolean;
  error: string | null;
  isMultiExam: boolean;
} {
  const { rows: catalogRows } = useExamsCatalogRows();
  const {
    examResults,
    examRollups,
    rollup: globalRollup,
    neetYearProjections: globalProjections,
    statusBySyllabusMasterId,
    loading,
    error,
    targetExamLabel,
    catalogExamKey,
    maxScore: globalMaxScore,
    primaryMarksYear: globalPrimaryMarksYear,
    cuetDomainSubjects,
    upscOptionalSubject,
  } = useSyllabusTracker();

  const examScopes = useMemo<ExamScope[]>(() => {
    // Multi-exam path: examRollups exists and contains per-exam data
    if (examRollups && examRollups.length > 1 && examResults.length > 1) {
      return examRollups.map((er, idx) => {
        const result = examResults[idx];
        const display = displayNameForExamCatalog(er.examLabel, catalogRows) || er.examLabel || "";
        return {
          examLabel: er.examLabel ?? "",
          displayName: display,
          rows: result?.rows ?? [],
          maxScore: er.maxScore,
          rollup: er.rollup,
          neetYearProjections: er.projections,
          primaryMarksYear: er.primaryMarksYear,
          catalogExamKey: er.catalogExamKey,
          cuetDomainSubjects: result?.cuetDomainSubjects ?? [],
          upscOptionalSubject: result?.upscOptionalSubject ?? null,
        };
      });
    }

    // Single-exam path: return one element using global tracker values
    const label = targetExamLabel ?? examResults[0]?.examLabel ?? "";
    const display = displayNameForExamCatalog(label, catalogRows) || label;

    // Recompute rollup for this exam's rows in case examRollups is not set
    // (single exam — examRollups is null by design in useSyllabusTracker).
    const singleRows = examResults[0]?.rows ?? [];
    const singlePrimaryMarksYear = examResults[0]?.primaryMarksYear ?? globalPrimaryMarksYear;
    const singleMaxScore = examResults[0]
      ? examScoreMax(examResults[0].examLabel, examResults[0].cuetDomainSubjects.length)
      : globalMaxScore;
    const singleRollup = singleRows.length > 0
      ? computeSyllabusRollup(singleRows, statusBySyllabusMasterId, singlePrimaryMarksYear)
      : globalRollup;
    const singleProjections = singleRows.length > 0
      ? computeNeetYearProjections(singleRows, statusBySyllabusMasterId, singleMaxScore)
      : globalProjections;

    return [
      {
        examLabel: label,
        displayName: display,
        rows: singleRows.length > 0 ? singleRows : [],
        maxScore: singleMaxScore,
        rollup: singleRollup,
        neetYearProjections: singleProjections,
        primaryMarksYear: singlePrimaryMarksYear,
        catalogExamKey: examResults[0]?.catalogExamKey ?? catalogExamKey,
        cuetDomainSubjects: examResults[0]?.cuetDomainSubjects ?? cuetDomainSubjects,
        upscOptionalSubject: examResults[0]?.upscOptionalSubject ?? upscOptionalSubject,
      },
    ];
  }, [
    examResults,
    examRollups,
    catalogRows,
    targetExamLabel,
    globalRollup,
    globalProjections,
    globalMaxScore,
    globalPrimaryMarksYear,
    statusBySyllabusMasterId,
    catalogExamKey,
    cuetDomainSubjects,
    upscOptionalSubject,
  ]);

  return {
    examScopes,
    loading,
    error,
    isMultiExam: examScopes.length > 1,
  };
}

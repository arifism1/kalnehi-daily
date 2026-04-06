"use client";

import { useMemo } from "react";

import { displayNameForExamCatalog } from "@/lib/examsCatalog";

import { useExamsCatalogRows } from "./useExamsCatalogRows";
import { usePrimaryExamLabel } from "./usePrimaryExamLabel";

/**
 * Profile `target_exam` (`exam_name`) plus catalog `display_name` for UI copy.
 */
export function useTargetExamDisplay(): {
  examLabel: string | null;
  examDisplayName: string;
  catalogLoading: boolean;
  examLabelLoading: boolean;
} {
  const { examLabel, loading: examLabelLoading } = usePrimaryExamLabel();
  const { rows: catalogRows, loading: catalogLoading } = useExamsCatalogRows();

  const examDisplayName = useMemo(
    () => displayNameForExamCatalog(examLabel, catalogRows),
    [examLabel, catalogRows],
  );

  return {
    examLabel,
    examDisplayName,
    catalogLoading,
    examLabelLoading,
  };
}

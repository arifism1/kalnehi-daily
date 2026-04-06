"use client";

import { useEffect, useState } from "react";

import {
  EXAMS_CATALOG_FALLBACK,
  dedupeExamsCatalogForUi,
  fetchExamsCatalog,
  type ExamCatalogRow,
} from "@/lib/examsCatalog";
import { getSupabaseBrowserClient } from "@/lib/supabase";

const INITIAL = dedupeExamsCatalogForUi(EXAMS_CATALOG_FALLBACK);

let sharedCatalog: ExamCatalogRow[] | null = null;

/**
 * Loads `exams` once (deduped for UI). Falls back to local catalog offline / error.
 * Reuses the last successful fetch across hook instances to avoid duplicate requests.
 */
export function useExamsCatalogRows(): {
  rows: ExamCatalogRow[];
  loading: boolean;
} {
  const [rows, setRows] = useState<ExamCatalogRow[]>(
    () => sharedCatalog ?? INITIAL,
  );
  const [loading, setLoading] = useState(!sharedCatalog);

  useEffect(() => {
    if (sharedCatalog) {
      setRows(sharedCatalog);
      setLoading(false);
      return;
    }
    let cancelled = false;
    void (async () => {
      try {
        const supabase = getSupabaseBrowserClient();
        const catalog = await fetchExamsCatalog(supabase);
        sharedCatalog = catalog;
        if (!cancelled) setRows(catalog);
      } catch {
        if (!cancelled) setRows(INITIAL);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  return { rows, loading };
}

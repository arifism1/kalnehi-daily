import {
  examDisplayLabel,
  syllabusCatalogExamName,
} from "@/lib/examProfile";
import type { Tables } from "@/types/supabase";
import type { SupabaseClient } from "@supabase/supabase-js";

import type { Database } from "@/types/supabase";

export type ExamCatalogRow = Tables<"exams">;

/**
 * One row per `display_name` (e.g. single "JEE Main" option even if the DB had
 * both `JEE Main` and `JEE Main 2025`). Prefers the row whose `exam_name`
 * matches the syllabus key from `syllabusCatalogExamName(display_name)`.
 */
export function dedupeExamsCatalogForUi(rows: ExamCatalogRow[]): ExamCatalogRow[] {
  const byDisplay = new Map<string, ExamCatalogRow[]>();
  for (const r of rows) {
    const k = r.display_name.trim().toLowerCase();
    const arr = byDisplay.get(k) ?? [];
    arr.push(r);
    byDisplay.set(k, arr);
  }
  const out: ExamCatalogRow[] = [];
  for (const [, group] of byDisplay) {
    if (group.length === 1) {
      out.push(group[0]);
      continue;
    }
    const want = syllabusCatalogExamName(group[0].display_name);
    const byWant = group.find((e) => e.exam_name === want);
    if (byWant) {
      out.push(byWant);
      continue;
    }
    const sorted = [...group].sort((a, b) => {
      if (a.sort_order !== b.sort_order) return a.sort_order - b.sort_order;
      const sa = syllabusCatalogExamName(a.exam_name) ?? a.exam_name;
      const sb = syllabusCatalogExamName(b.exam_name) ?? b.exam_name;
      return sb.length - sa.length;
    });
    out.push(sorted[0]);
  }
  out.sort((a, b) => a.sort_order - b.sort_order);
  return out;
}

export async function fetchExamsCatalog(
  supabase: SupabaseClient<Database>,
): Promise<ExamCatalogRow[]> {
  const { data, error } = await supabase
    .from("exams")
    .select("*")
    .order("sort_order", { ascending: true });

  if (!error && data && data.length > 0) {
    const dbRows = data as ExamCatalogRow[];
    const dbNames = new Set(dbRows.map((r) => r.exam_name));
    // Always supplement with any fallback row not yet seeded into the DB
    // (e.g. newly added exams like IPMAT Indore / JIPMAT before migration runs).
    const extras = EXAMS_CATALOG_FALLBACK.filter((r) => !dbNames.has(r.exam_name));
    return dedupeExamsCatalogForUi([...dbRows, ...extras]);
  }

  return dedupeExamsCatalogForUi(EXAMS_CATALOG_FALLBACK);
}

/** User-facing label from `exams.display_name` when `exam_name` is in the catalog. */
export function displayNameForExamCatalog(
  examName: string | null | undefined,
  catalog: ExamCatalogRow[],
): string {
  if (!examName?.trim()) return "";
  const t = examName.trim();
  const direct = catalog.find((e) => e.exam_name === t);
  if (direct) return direct.display_name;
  const mapped = syllabusCatalogExamName(t) ?? t;
  const viaMap = catalog.find((e) => e.exam_name === mapped);
  if (viaMap) return viaMap.display_name;
  return examDisplayLabel(t);
}

/**
 * Maps stored profile value to a catalog `exam_name` for controlled inputs.
 * Handles legacy labels (e.g. "JEE Main" vs `JEE Main 2025` in `exam_name`).
 */
export function resolveInitialTargetExamName(
  storedRaw: string,
  catalog: ExamCatalogRow[],
): string {
  if (!storedRaw.trim()) return "";
  const trimmed = storedRaw.trim();
  if (catalog.some((e) => e.exam_name === trimmed)) return trimmed;
  const mapped = syllabusCatalogExamName(trimmed) ?? trimmed;
  if (catalog.some((e) => e.exam_name === mapped)) return mapped;
  const byDisplay = catalog.find(
    (e) => e.display_name.trim().toLowerCase() === trimmed.toLowerCase(),
  );
  if (byDisplay) return byDisplay.exam_name;
  return trimmed;
}

/**
 * Used when `exams` table is empty or fetch fails — keep in sync with catalog
 * migrations (e.g. `20260409120000_exams_catalog.sql`, `20260415120000_exam_catalog_expansion.sql`).
 */
export const EXAMS_CATALOG_FALLBACK: ExamCatalogRow[] = [
  {
    id: "00000000-0000-4000-8000-000000000011",
    exam_name: "JEE Main 2025",
    display_name: "JEE Main",
    sort_order: 11,
    max_score: 300,
    multi_subject: false,
    created_at: new Date().toISOString(),
  },
  {
    id: "00000000-0000-4000-8000-000000000012",
    exam_name: "JEE Advanced",
    display_name: "JEE Advanced",
    sort_order: 12,
    max_score: 360,
    multi_subject: false,
    created_at: new Date().toISOString(),
  },
  {
    id: "00000000-0000-4000-8000-000000000013",
    exam_name: "GATE",
    display_name: "GATE",
    sort_order: 13,
    max_score: 100,
    multi_subject: false,
    created_at: new Date().toISOString(),
  },
  {
    id: "00000000-0000-4000-8000-000000000021",
    exam_name: "NEET UG",
    display_name: "NEET UG",
    sort_order: 21,
    max_score: 720,
    multi_subject: false,
    created_at: new Date().toISOString(),
  },
  {
    id: "00000000-0000-4000-8000-000000000022",
    exam_name: "NEET PG",
    display_name: "NEET PG",
    sort_order: 22,
    max_score: 800,
    multi_subject: false,
    created_at: new Date().toISOString(),
  },
  {
    id: "00000000-0000-4000-8000-000000000023",
    exam_name: "INI-CET",
    display_name: "INI-CET",
    sort_order: 23,
    max_score: 800,
    multi_subject: false,
    created_at: new Date().toISOString(),
  },
  {
    id: "00000000-0000-4000-8000-000000000031",
    exam_name: "CAT",
    display_name: "CAT",
    sort_order: 31,
    max_score: 198,
    multi_subject: false,
    created_at: new Date().toISOString(),
  },
  {
    id: "00000000-0000-4000-8000-000000000032",
    exam_name: "GMAT",
    display_name: "GMAT",
    sort_order: 32,
    max_score: 805,
    multi_subject: false,
    created_at: new Date().toISOString(),
  },
  {
    id: "00000000-0000-4000-8000-000000000033",
    exam_name: "IPMAT Indore",
    display_name: "IPMAT Indore",
    sort_order: 33,
    max_score: 300,
    multi_subject: false,
    created_at: new Date().toISOString(),
  },
  {
    id: "00000000-0000-4000-8000-000000000034",
    exam_name: "IPMAT Rohtak",
    display_name: "IPMAT Rohtak",
    sort_order: 34,
    max_score: 300,
    multi_subject: false,
    created_at: new Date().toISOString(),
  },
  {
    id: "00000000-0000-4000-8000-000000000035",
    exam_name: "JIPMAT",
    display_name: "JIPMAT",
    sort_order: 35,
    max_score: 400,
    multi_subject: false,
    created_at: new Date().toISOString(),
  },
  {
    id: "00000000-0000-4000-8000-000000000041",
    exam_name: "CA Foundation",
    display_name: "CA Foundation",
    sort_order: 41,
    max_score: 400,
    multi_subject: false,
    created_at: new Date().toISOString(),
  },
  {
    id: "00000000-0000-4000-8000-000000000042",
    exam_name: "CA Intermediate",
    display_name: "CA Intermediate",
    sort_order: 42,
    max_score: 800,
    multi_subject: false,
    created_at: new Date().toISOString(),
  },
  {
    id: "00000000-0000-4000-8000-000000000043",
    exam_name: "CA Final",
    display_name: "CA Final",
    sort_order: 43,
    max_score: 800,
    multi_subject: false,
    created_at: new Date().toISOString(),
  },
  {
    id: "00000000-0000-4000-8000-000000000044",
    exam_name: "CLAT UG",
    display_name: "CLAT UG",
    sort_order: 44,
    max_score: 120,
    multi_subject: false,
    created_at: new Date().toISOString(),
  },
  {
    id: "00000000-0000-4000-8000-000000000051",
    exam_name: "UPSC CSE Prelims",
    display_name: "UPSC CSE Prelims",
    sort_order: 51,
    max_score: 400,
    multi_subject: false,
    created_at: new Date().toISOString(),
  },
  {
    id: "00000000-0000-4000-8000-000000000052",
    exam_name: "UPSC CSE Mains",
    display_name: "UPSC CSE Mains",
    sort_order: 52,
    max_score: 1750,
    multi_subject: true,
    created_at: new Date().toISOString(),
  },
  {
    id: "00000000-0000-4000-8000-000000000053",
    exam_name: "NDA",
    display_name: "NDA",
    sort_order: 53,
    max_score: 900,
    multi_subject: false,
    created_at: new Date().toISOString(),
  },
  {
    id: "00000000-0000-4000-8000-000000000061",
    exam_name: "SAT",
    display_name: "SAT",
    sort_order: 61,
    max_score: 1600,
    multi_subject: false,
    created_at: new Date().toISOString(),
  },
  {
    id: "00000000-0000-4000-8000-000000000062",
    exam_name: "GRE",
    display_name: "GRE",
    sort_order: 62,
    max_score: 340,
    multi_subject: false,
    created_at: new Date().toISOString(),
  },
  {
    id: "00000000-0000-4000-8000-000000000063",
    exam_name: "CBSE Class 12",
    display_name: "CBSE Class 12",
    sort_order: 63,
    max_score: 500,
    multi_subject: false,
    created_at: new Date().toISOString(),
  },
  {
    id: "00000000-0000-4000-8000-000000000070",
    exam_name: "CUET",
    display_name: "CUET UG",
    sort_order: 70,
    max_score: null,
    multi_subject: true,
    created_at: new Date().toISOString(),
  },
  {
    id: "00000000-0000-4000-8000-000000000099",
    exam_name: "Other",
    display_name: "Other",
    sort_order: 999,
    max_score: null,
    multi_subject: false,
    created_at: new Date().toISOString(),
  },
];

export function mergeOrphanExamOption(
  rows: ExamCatalogRow[],
  storedExamName: string | null,
): ExamCatalogRow[] {
  const raw = storedExamName?.trim();
  if (!raw) return rows;
  if (rows.some((r) => r.exam_name === raw)) return rows;
  const mapped = syllabusCatalogExamName(raw);
  if (mapped && rows.some((r) => r.exam_name === mapped)) return rows;
  const orphan: ExamCatalogRow = {
    id: "00000000-0000-4000-8000-00000000ffff",
    exam_name: raw,
    display_name: raw,
    sort_order: -1,
    max_score: null,
    multi_subject: false,
    created_at: new Date().toISOString(),
  };
  return [orphan, ...rows];
}

import type { SupabaseClient } from "@supabase/supabase-js";

import type { SyllabusRow } from "@/lib/syllabusGrouping";
import { isUpscCseMainsExam } from "@/lib/upscMainsOptionalSubjects";
import type { Database } from "@/types/supabase";

type Client = SupabaseClient<Database>;

/**
 * Syllabus reads for a single exam must use this module (or the UPSC RPC below) so we never
 * scan unrelated exams.
 *
 * **Index / planner:** `public.syllabus_master_exam_name_idx` on `(exam_name)` supports the
 * non-UPSC path (`WHERE exam_name = $1 …`). To verify locally after migration:
 *
 * ```sql
 * EXPLAIN (ANALYZE, BUFFERS)
 * SELECT * FROM public.syllabus_master
 * WHERE exam_name = 'JEE Main 2025'
 * ORDER BY subject, chapter, microtopic;
 * ```
 *
 * Expect an **Index Scan** (or Bitmap Index Scan) on `syllabus_master_exam_name_idx`, not a
 * Seq Scan on the full table.
 */

/**
 * Loads `syllabus_master` rows for one catalog exam (same rules everywhere: table + exam_name,
 * or UPSC Mains RPC to avoid PostgREST row caps and apply optional filtering server-side).
 */
export async function fetchSyllabusMasterRowsForExam(
  supabase: Client,
  examKey: string,
  upscOptionalSubject: string | null,
): Promise<SyllabusRow[]> {
  if (isUpscCseMainsExam(examKey)) {
    const { data, error } = await supabase.rpc("upsc_cse_mains_syllabus_rows", {
      p_optional: upscOptionalSubject ?? undefined,
    });
    if (error) throw error;
    return (data ?? []) as SyllabusRow[];
  }

  const { data, error } = await supabase
    .from("syllabus_master")
    .select("*")
    .eq("exam_name", examKey)
    .order("subject")
    .order("chapter")
    .order("microtopic");

  if (error) throw error;
  return (data ?? []) as SyllabusRow[];
}

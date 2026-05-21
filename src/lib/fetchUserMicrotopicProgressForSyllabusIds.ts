import type { SupabaseClient } from "@supabase/supabase-js";

import type { Database } from "@/types/supabase";

const SYLLABUS_MASTER_ID_IN_CHUNK = 120;

/**
 * Loads progress only for the given `syllabus_master_id` values.
 *
 * **Contract:** `syllabusMasterIds` must already be the user's current-exam syllabus (or a
 * subset). This helper does **not** filter by `exam_name`; callers must scope ids using
 * {@link fetchSyllabusMasterRowsForExam} / {@link resolveAllowedSyllabusMasterIdsForUser}.
 */
export async function fetchUserMicrotopicProgressForSyllabusIds(
  supabase: SupabaseClient<Database>,
  userId: string,
  syllabusMasterIds: string[],
): Promise<Array<{ syllabus_master_id: string; status: string }>> {
  const uniq = [...new Set(syllabusMasterIds.filter(Boolean))];
  if (uniq.length === 0) return [];

  const chunks: string[][] = [];
  for (let i = 0; i < uniq.length; i += SYLLABUS_MASTER_ID_IN_CHUNK) {
    chunks.push(uniq.slice(i, i + SYLLABUS_MASTER_ID_IN_CHUNK));
  }
  const chunkResults = await Promise.all(
    chunks.map(async (chunk) => {
      const { data, error } = await supabase
        .from("user_microtopic_progress")
        .select("syllabus_master_id, status")
        .eq("user_id", userId)
        .in("syllabus_master_id", chunk);
      if (error) throw error;
      return (data ?? []).flatMap((r) =>
        r.syllabus_master_id != null && typeof r.status === "string"
          ? [{ syllabus_master_id: String(r.syllabus_master_id), status: r.status }]
          : [],
      );
    }),
  );
  return chunkResults.flat();
}

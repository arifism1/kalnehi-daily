import { cache } from "react";

import { buildStudySquadLabelsFromRows } from "@/lib/studySquadSyllabusLabels";
import { loadMergedSyllabusRowsForStudySquad } from "@/lib/syllabusDataForUser";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export type StudySquadSyllabusPool = {
  labels: string[];
  examLabel: string | null;
  /** Stable fingerprint for hook dependencies (length + ends). */
  labelsKey: string;
};

/**
 * Session-scoped syllabus label pool for Study Squad (deduped within one request via `cache`).
 */
export const getStudySquadSyllabusPool = cache(
  async (): Promise<StudySquadSyllabusPool> => {
    const supabase = await createSupabaseServerClient();
    const {
      data: { user },
      error: authErr,
    } = await supabase.auth.getUser();
    if (authErr || !user) {
      return { labels: [], examLabel: null, labelsKey: "" };
    }

    const { rows, examLabel } = await loadMergedSyllabusRowsForStudySquad(
      supabase,
      user.id,
    );
    const labels = buildStudySquadLabelsFromRows(rows);
    const last = labels.length > 0 ? labels[labels.length - 1] ?? "" : "";
    const labelsKey = `${labels.length}\0${labels[0] ?? ""}\0${last}`;

    return { labels, examLabel, labelsKey };
  },
);

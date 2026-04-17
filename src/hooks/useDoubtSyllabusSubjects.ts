"use client";

import { useCallback, useEffect, useState } from "react";

import { DOUBT_GENERAL_SUBJECT } from "@/lib/doubtSubjects";
import { fetchDoubtVoiceTagSyllabusRows } from "@/lib/doubtVoiceTagSyllabus";
import { getSupabaseBrowserClient } from "@/lib/supabase";
import { toUserFacingMessage } from "@/lib/userFacingErrors";
import { useAuthStore } from "@/store/useAuthStore";

/**
 * Distinct `syllabus_master.subject` values for the signed-in user's target exam,
 * plus {@link DOUBT_GENERAL_SUBJECT} when not already present. Used for doubt tagging.
 */
export function useDoubtSyllabusSubjects() {
  const userId = useAuthStore((s) => s.user?.id);
  const [subjects, setSubjects] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!userId) {
      setSubjects([DOUBT_GENERAL_SUBJECT]);
      setLoading(false);
      setError(null);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const supabase = getSupabaseBrowserClient();
      const { rows } = await fetchDoubtVoiceTagSyllabusRows(supabase, userId);

      const uniq = [
        ...new Set(
          rows
            .map((r) => r.subject?.trim())
            .filter((s): s is string => Boolean(s)),
        ),
      ].sort((a, b) => a.localeCompare(b));

      const withGeneral = uniq.includes(DOUBT_GENERAL_SUBJECT)
        ? uniq
        : [...uniq, DOUBT_GENERAL_SUBJECT];
      setSubjects(withGeneral);
    } catch (e) {
      setError(toUserFacingMessage(e));
      setSubjects([DOUBT_GENERAL_SUBJECT]);
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    void load();
  }, [load]);

  return { subjects, loading, error, refresh: load };
}

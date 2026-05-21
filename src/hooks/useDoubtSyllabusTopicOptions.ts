"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

import {
  fetchDoubtVoiceTagSyllabusRows,
  formatDoubtTopicLine,
  type DoubtVoiceTagSyllabusRow,
} from "@/lib/doubtVoiceTagSyllabus";
import { getSupabaseBrowserClient } from "@/lib/supabase";
import { toUserFacingMessage } from "@/lib/userFacingErrors";
import { useAuthStore } from "@/store/useAuthStore";

function rowsToTopicLinesBySubject(
  rows: DoubtVoiceTagSyllabusRow[],
): Record<string, string[]> {
  const map = new Map<string, Set<string>>();
  for (const r of rows) {
    const sub = r.subject?.trim();
    if (!sub) continue;
    const line = formatDoubtTopicLine(r.chapter, r.microtopic);
    if (!line.trim() || line === " — ") continue;
    if (!map.has(sub)) map.set(sub, new Set());
    map.get(sub)!.add(line);
  }
  const out: Record<string, string[]> = {};
  for (const [sub, set] of map) {
    out[sub] = [...set].toSorted((a, b) => a.localeCompare(b));
  }
  return out;
}

/**
 * Syllabus topic lines (`chapter — microtopic`) grouped by subject for the user's exam.
 */
export function useDoubtSyllabusTopicOptions() {
  const userId = useAuthStore((s) => s.user?.id);
  const [bySubject, setBySubject] = useState<Record<string, string[]>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!userId) {
      setBySubject({});
      setLoading(false);
      setError(null);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const supabase = getSupabaseBrowserClient();
      const { rows } = await fetchDoubtVoiceTagSyllabusRows(supabase, userId);

      setBySubject(rowsToTopicLinesBySubject(rows));
    } catch (e) {
      setError(toUserFacingMessage(e));
      setBySubject({});
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    void load();
  }, [load]);

  const linesForSubject = useCallback(
    (subject: string): string[] => {
      const sub = subject.trim();
      if (!sub) return [];
      return bySubject[sub] ?? [];
    },
    [bySubject],
  );

  const allTopicLines = useMemo(() => {
    const set = new Set<string>();
    for (const lines of Object.values(bySubject)) {
      for (const l of lines) set.add(l);
    }
    return [...set].toSorted((a, b) => a.localeCompare(b));
  }, [bySubject]);

  return {
    topicLinesBySubject: bySubject,
    linesForSubject,
    allTopicLines,
    loading,
    error,
    refresh: load,
  };
}

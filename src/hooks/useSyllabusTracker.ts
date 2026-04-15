"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import {
  bulkUpdateChapterMicrotopics,
  updateMicrotopicStatus,
} from "@/actions/syllabus";
import {
  CUET_MARKS_PER_SUBJECT,
  examScoreMax,
  isCuetExam,
  primaryMarksYearFromTargetExam,
  resolveSyllabusExam,
  syllabusCatalogExamName,
} from "@/lib/examProfile";
import {
  parseCuetDomainSubjectsJson,
  syllabusSubjectInCuetDomains,
} from "@/lib/cuetDomainSubjects";
import type { MicrotopicProgressStatus } from "@/lib/syllabusConstants";
import { normalizeSyllabusMasterId } from "@/lib/syllabusIds";
import type { SyllabusRow } from "@/lib/syllabusGrouping";
import {
  applyMarksOverridesToRows,
  type SyllabusMarksOverrideRow,
} from "@/lib/applySyllabusMarksOverrides";
import {
  coalesceProgressByCanonicalIds,
  dedupeMergedSyllabusRowsByPlacement,
} from "@/lib/syllabusDedupe";
import {
  mergeSyllabusWithUserCustomizations,
  type MergedSyllabusRow,
} from "@/lib/userSyllabusMerge";
import {
  computeCuetScoringRollup,
  computeNeetYearProjections,
  computeSyllabusRollup,
  type CuetScoringRollup,
} from "@/lib/syllabusRollup";
import { getSupabaseBrowserClient } from "@/lib/supabase";
import { KALNEHI_PROFILE_UPDATED_EVENT } from "@/lib/profileEvents";
import { toUserFacingMessage } from "@/lib/userFacingErrors";
import { useAuthStore } from "@/store/useAuthStore";

function progressRowsToMap(
  rows: { syllabus_master_id: unknown; status: unknown }[] | null,
): Record<string, string> {
  const map: Record<string, string> = {};
  for (const r of rows ?? []) {
    const sid = r.syllabus_master_id;
    if (
      sid != null &&
      String(sid).length > 0 &&
      typeof r.status === "string"
    ) {
      map[normalizeSyllabusMasterId(String(sid))] = r.status;
    }
  }
  return map;
}

function filterProgressToSyllabusIds(
  fullMap: Record<string, string>,
  syllabusRows: SyllabusRow[],
): Record<string, string> {
  const allowed = new Set(
    syllabusRows.map((r) => normalizeSyllabusMasterId(r.id)),
  );
  const out: Record<string, string> = {};
  for (const id of allowed) {
    if (fullMap[id] !== undefined) out[id] = fullMap[id];
  }
  return out;
}

/** Keys are normalized `syllabus_master.id` strings. */
type SyllabusTrackerCache = {
  userId: string;
  rows: MergedSyllabusRow[];
  statusBySyllabusMasterId: Record<string, string>;
  targetExamLabel: string | null;
  cuetDomainSubjects: string[];
  catalogExamKey: string | null;
};

let trackerCache: SyllabusTrackerCache | null = null;

export function useSyllabusTracker() {
  const userId = useAuthStore((s) => s.user?.id);

  const [rows, setRows] = useState<MergedSyllabusRow[]>([]);
  const [statusBySyllabusMasterId, setStatusBySyllabusMasterId] = useState<
    Record<string, string>
  >({});
  const [targetExamLabel, setTargetExamLabel] = useState<string | null>(null);
  const [cuetDomainSubjects, setCuetDomainSubjects] = useState<string[]>([]);
  const [catalogExamKey, setCatalogExamKey] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [updateError, setUpdateError] = useState<string | null>(null);
  const [saveFeedback, setSaveFeedback] = useState<string | null>(null);
  const saveFeedbackTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const maxScore = useMemo(() => {
    if (isCuetExam(targetExamLabel)) {
      return examScoreMax(targetExamLabel, cuetDomainSubjects.length);
    }
    return examScoreMax(targetExamLabel);
  }, [targetExamLabel, cuetDomainSubjects.length]);

  const primaryMarksYear = useMemo(
    () => primaryMarksYearFromTargetExam(targetExamLabel),
    [targetExamLabel],
  );

  const load = useCallback(
    async (opts?: { silent?: boolean }) => {
      const silent = opts?.silent === true;
      if (!userId) {
        trackerCache = null;
        setRows([]);
        setStatusBySyllabusMasterId({});
        setTargetExamLabel(null);
        setCuetDomainSubjects([]);
        setCatalogExamKey(null);
        setLoading(false);
        return;
      }
      if (!silent) {
        setLoading(true);
        setError(null);
      }
      try {
        const supabase = getSupabaseBrowserClient();

        const { data: profile, error: profileErr } = await supabase
          .from("user_profiles")
          .select("primary_exam, target_exam, cuet_domain_subjects")
          .eq("user_id", userId)
          .maybeSingle();

        if (profileErr) throw profileErr;

        const examLabel = resolveSyllabusExam(profile);
        setTargetExamLabel(examLabel ?? null);

        const domains = parseCuetDomainSubjectsJson(
          profile?.cuet_domain_subjects,
        );
        setCuetDomainSubjects(domains);

        if (!examLabel?.trim()) {
          setRows([]);
          setStatusBySyllabusMasterId({});
          setCatalogExamKey(null);
          setError(null);
          return;
        }

        // Maps profile `exam_name` (from `exams` catalog) to `syllabus_master.exam_name`
        // (e.g. legacy JEE Main → JEE Main 2025). Same rules as task refresh.
        const examKey = syllabusCatalogExamName(examLabel);
        if (!examKey) {
          setRows([]);
          setStatusBySyllabusMasterId({});
          setCatalogExamKey(null);
          setError(null);
          return;
        }
        setCatalogExamKey(examKey);

        const [
          { data: syllabus, error: sErr },
          { data: prog, error: pErr },
          { data: customs, error: cuErr },
          { data: marksOverrides, error: moErr },
        ] = await Promise.all([
          supabase
            .from("syllabus_master")
            .select("*")
            .eq("exam_name", examKey)
            .order("subject")
            .order("chapter")
            .order("microtopic"),
          supabase
            .from("user_microtopic_progress")
            .select("syllabus_master_id, status")
            .eq("user_id", userId),
          supabase
            .from("user_syllabus_customizations")
            .select("*")
            .eq("user_id", userId)
            .eq("exam_name", examKey),
          supabase
            .from("user_syllabus_marks_overrides")
            .select("syllabus_master_id, marks_2025, marks_2024, marks_2023")
            .eq("user_id", userId)
            .eq("exam_name", examKey),
        ]);

        if (sErr) throw sErr;
        if (pErr) throw pErr;
        if (cuErr) throw cuErr;
        if (moErr) throw moErr;

        let merged = mergeSyllabusWithUserCustomizations(
          (syllabus ?? []) as SyllabusRow[],
          customs ?? [],
          examKey,
        );
        if (examKey === "CUET" && domains.length > 0) {
          merged = merged.filter((r) =>
            syllabusSubjectInCuetDomains(r.subject, domains),
          );
        } else if (examKey === "CUET") {
          merged = [];
        }
        const sorted = applyMarksOverridesToRows(
          merged,
          (marksOverrides ?? []) as SyllabusMarksOverrideRow[],
        );
        const { rows: deduped, droppedToCanonical } =
          dedupeMergedSyllabusRowsByPlacement(sorted);
        const fullMap = progressRowsToMap(prog ?? []);
        const fullMapCoalesced = coalesceProgressByCanonicalIds(
          fullMap,
          droppedToCanonical,
        );
        const map = filterProgressToSyllabusIds(fullMapCoalesced, deduped);

        setRows(deduped);
        setStatusBySyllabusMasterId(map);
        trackerCache = {
          userId,
          rows: deduped,
          statusBySyllabusMasterId: map,
          targetExamLabel: examLabel ?? null,
          cuetDomainSubjects: domains,
          catalogExamKey: examKey,
        };
        if (silent) setError(null);
      } catch (e) {
        const msg = toUserFacingMessage(e);
        if (silent) {
          setUpdateError(msg);
        } else {
          setError(msg);
          setRows([]);
          setStatusBySyllabusMasterId({});
          setCatalogExamKey(null);
        }
      } finally {
        if (!silent) setLoading(false);
      }
    },
    [userId],
  );

  useEffect(() => {
    if (!userId) {
      void load();
      return;
    }
    const cached = trackerCache;
    if (cached && cached.userId === userId) {
      setRows(cached.rows);
      setStatusBySyllabusMasterId(cached.statusBySyllabusMasterId);
      setTargetExamLabel(cached.targetExamLabel);
      setCuetDomainSubjects(cached.cuetDomainSubjects);
      setCatalogExamKey(cached.catalogExamKey);
      setLoading(false);
      setError(null);
      void load({ silent: true });
      return;
    }
    void load();
  }, [load, userId]);

  useEffect(() => {
    const onProfileUpdated = () => {
      void load();
    };
    window.addEventListener(KALNEHI_PROFILE_UPDATED_EVENT, onProfileUpdated);
    return () =>
      window.removeEventListener(
        KALNEHI_PROFILE_UPDATED_EVENT,
        onProfileUpdated,
      );
  }, [load]);

  const rollup = useMemo(
    () =>
      computeSyllabusRollup(
        rows,
        statusBySyllabusMasterId,
        primaryMarksYear,
      ),
    [rows, statusBySyllabusMasterId, primaryMarksYear],
  );

  const cuetScoringRollup = useMemo((): CuetScoringRollup | null => {
    if (!isCuetExam(targetExamLabel) || cuetDomainSubjects.length === 0) {
      return null;
    }
    return computeCuetScoringRollup(
      rows,
      statusBySyllabusMasterId,
      cuetDomainSubjects,
      CUET_MARKS_PER_SUBJECT,
    );
  }, [
    targetExamLabel,
    rows,
    statusBySyllabusMasterId,
    cuetDomainSubjects,
  ]);

  const cuetAwaitingDomainSelection = useMemo(
    () => isCuetExam(targetExamLabel) && cuetDomainSubjects.length === 0,
    [targetExamLabel, cuetDomainSubjects.length],
  );

  const neetYearProjections = useMemo(() => {
    return computeNeetYearProjections(
      rows,
      statusBySyllabusMasterId,
      maxScore,
    );
  }, [rows, statusBySyllabusMasterId, maxScore]);

  const setMicrotopicStatus = useCallback(
    async (
      syllabusMasterId: string,
      next: MicrotopicProgressStatus,
    ): Promise<boolean> => {
      const key = normalizeSyllabusMasterId(syllabusMasterId);
      setUpdateError(null);

      let previousSnapshot = "not_begun";
      setStatusBySyllabusMasterId((m) => {
        previousSnapshot = m[key] ?? "not_begun";
        return { ...m, [key]: next };
      });

      const res = await updateMicrotopicStatus(syllabusMasterId, next);

      if (!res.ok) {
        setStatusBySyllabusMasterId((m) => ({
          ...m,
          [key]: previousSnapshot,
        }));
        setUpdateError(res.error);
        return false;
      }

      setStatusBySyllabusMasterId((m) => ({
        ...m,
        [key]: res.row.status,
      }));

      await load({ silent: true });

      if (saveFeedbackTimer.current) clearTimeout(saveFeedbackTimer.current);
      setSaveFeedback("Saved");
      saveFeedbackTimer.current = setTimeout(() => {
        setSaveFeedback(null);
        saveFeedbackTimer.current = null;
      }, 2200);
      return true;
    },
    [load],
  );

  const undoMicrotopicToStatus = useCallback(
    async (
      syllabusMasterId: string,
      targetStatus: MicrotopicProgressStatus,
    ): Promise<boolean> => {
      const key = normalizeSyllabusMasterId(syllabusMasterId);
      setUpdateError(null);

      let snapshotBefore = "not_begun";
      setStatusBySyllabusMasterId((m) => {
        snapshotBefore = m[key] ?? "not_begun";
        return { ...m, [key]: targetStatus };
      });

      const res = await updateMicrotopicStatus(syllabusMasterId, targetStatus);

      if (!res.ok) {
        setStatusBySyllabusMasterId((m) => ({
          ...m,
          [key]: snapshotBefore,
        }));
        setUpdateError(res.error);
        return false;
      }

      setStatusBySyllabusMasterId((m) => ({
        ...m,
        [key]: res.row.status,
      }));

      await load({ silent: true });
      return true;
    },
    [load],
  );

  const setChapterCompleted = useCallback(
    async (
      microtopicIds: string[],
      completed: boolean,
    ): Promise<boolean> => {
      const nextStatus: MicrotopicProgressStatus = completed
        ? "completed"
        : "not_begun";

      setUpdateError(null);

      const keys = microtopicIds.map(normalizeSyllabusMasterId);

      let previousSnapshot: Record<string, string> = {};
      setStatusBySyllabusMasterId((prev) => {
        previousSnapshot = { ...prev };
        const next = { ...prev };
        for (const k of keys) next[k] = nextStatus;
        return next;
      });

      const res = await bulkUpdateChapterMicrotopics(microtopicIds, nextStatus);

      if (!res.ok) {
        setStatusBySyllabusMasterId(previousSnapshot);
        setUpdateError(res.error);
        return false;
      }

      await load({ silent: true });

      if (saveFeedbackTimer.current) clearTimeout(saveFeedbackTimer.current);
      setSaveFeedback(
        completed ? "Chapter marked complete" : "Chapter status reset",
      );
      saveFeedbackTimer.current = setTimeout(() => {
        setSaveFeedback(null);
        saveFeedbackTimer.current = null;
      }, 2200);
      return true;
    },
    [load],
  );

  useEffect(() => {
    return () => {
      if (saveFeedbackTimer.current) clearTimeout(saveFeedbackTimer.current);
    };
  }, []);

  const clearUpdateError = useCallback(() => {
    setUpdateError(null);
  }, []);

  return {
    rows,
    catalogExamKey,
    statusBySyllabusMasterId,
    targetExamLabel,
    cuetDomainSubjects,
    cuetAwaitingDomainSelection,
    cuetScoringRollup,
    maxScore,
    primaryMarksYear,
    loading,
    error,
    updateError,
    clearUpdateError,
    saveFeedback,
    rollup,
    neetYearProjections,
    refetch: load,
    setMicrotopicStatus,
    undoMicrotopicToStatus,
    setChapterCompleted,
  };
}

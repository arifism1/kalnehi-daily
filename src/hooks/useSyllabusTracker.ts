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
  isNeetUgExam,
  primaryMarksYearFromTargetExam,
} from "@/lib/examProfile";
import type { ExamTrack } from "@/lib/examTracks";
import {
  loadMultiExamSyllabusDataForUser,
  type SyllabusDataForUserResult,
} from "@/lib/syllabusDataForUser";
import type { MergedSyllabusRow } from "@/lib/userSyllabusMerge";
import type { MicrotopicProgressStatus } from "@/lib/syllabusConstants";
import { normalizeSyllabusMasterId } from "@/lib/syllabusIds";
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

const NEET_UG_HIDDEN_MARKS_YEARS = [2026] as const;

type SyllabusTrackerCache = {
  userId: string;
  rows: MergedSyllabusRow[];
  statusBySyllabusMasterId: Record<string, string>;
  targetExamLabel: string | null;
  cuetDomainSubjects: string[];
  upscOptionalSubject: string | null;
  catalogExamKey: string | null;
  selectedTrack: ExamTrack | null;
  examResults: SyllabusDataForUserResult[];
  /** Epoch ms when the cache was last written. Used for TTL-gated silent refreshes. */
  loadedAt: number;
};

/**
 * Silent refreshes are throttled to at most once per TTL window.
 * Multiple components mounting the same route (e.g. ProgressOverview +
 * MarksEngineClient) would each fire 4 parallel Supabase queries without this.
 */
const TRACKER_CACHE_TTL_MS = 30_000;

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
  const [upscOptionalSubject, setUpscOptionalSubject] = useState<string | null>(null);
  const [selectedTrack, setSelectedTrack] = useState<ExamTrack | null>(null);
  const [examResults, setExamResults] = useState<SyllabusDataForUserResult[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [updateError, setUpdateError] = useState<string | null>(null);
  const [saveFeedback, setSaveFeedback] = useState<string | null>(null);
  const saveFeedbackTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const loadSeqRef = useRef(0);
  const pendingStatusRef = useRef<Record<string, string>>({});

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
      const myId = ++loadSeqRef.current;
      const silent = opts?.silent === true;
      if (!userId) {
        trackerCache = null;
        setRows([]);
        setStatusBySyllabusMasterId({});
        setTargetExamLabel(null);
        setCuetDomainSubjects([]);
        setUpscOptionalSubject(null);
        setCatalogExamKey(null);
        setSelectedTrack(null);
        setExamResults([]);
        setLoading(false);
        return;
      }
      if (!silent) {
        setLoading(true);
        setError(null);
      }
      try {
        const supabase = getSupabaseBrowserClient();
        const { track, examResults: loaded } =
          await loadMultiExamSyllabusDataForUser(supabase, userId);

        if (myId !== loadSeqRef.current) return;

        // Primary exam = first result (for backward compat consumers)
        const primary = loaded[0] ?? null;
        setTargetExamLabel(primary?.examLabel ?? null);
        setCuetDomainSubjects(primary?.cuetDomainSubjects ?? []);
        setUpscOptionalSubject(primary?.upscOptionalSubject ?? null);
        setCatalogExamKey(primary?.catalogExamKey ?? null);
        setSelectedTrack(track);
        setExamResults(loaded);

        // Merge rows + status maps across all enabled exams
        const allRows = loaded.flatMap((r) => r.rows);
        const mergedStatus = loaded.reduce<Record<string, string>>(
          (acc, r) => ({ ...acc, ...r.statusBySyllabusMasterId }),
          {},
        );

        if (allRows.length === 0) {
          setRows([]);
          setStatusBySyllabusMasterId({});
          setError(null);
          return;
        }

        const pending = pendingStatusRef.current;
        const finalMap =
          Object.keys(pending).length > 0
            ? { ...mergedStatus, ...pending }
            : mergedStatus;
        setRows(allRows);
        setStatusBySyllabusMasterId(finalMap);
        trackerCache = {
          userId,
          rows: allRows,
          statusBySyllabusMasterId: finalMap,
          targetExamLabel: primary?.examLabel ?? null,
          cuetDomainSubjects: primary?.cuetDomainSubjects ?? [],
          upscOptionalSubject: primary?.upscOptionalSubject ?? null,
          catalogExamKey: primary?.catalogExamKey ?? null,
          selectedTrack: track,
          examResults: loaded,
          loadedAt: Date.now(),
        };
        if (silent) setError(null);
      } catch (e) {
        if (myId !== loadSeqRef.current) return;
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
        if (myId === loadSeqRef.current) setLoading(false);
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
      setUpscOptionalSubject(cached.upscOptionalSubject);
      setCatalogExamKey(cached.catalogExamKey);
      setSelectedTrack(cached.selectedTrack);
      setExamResults(cached.examResults);
      setLoading(false);
      setError(null);
      // Only trigger a background refresh when the cache is actually stale.
      // Without this guard, every component mount fires 4 parallel Supabase
      // queries even though the data hasn't changed.
      if (Date.now() - cached.loadedAt > TRACKER_CACHE_TTL_MS) {
        void load({ silent: true });
      }
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
        isNeetUgExam(targetExamLabel)
          ? { legacyMarksSkipYears: NEET_UG_HIDDEN_MARKS_YEARS }
          : undefined,
      ),
    [rows, statusBySyllabusMasterId, primaryMarksYear, targetExamLabel],
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
      {
        collapseDuplicateScores: false,
        omitYears: isNeetUgExam(targetExamLabel)
          ? [...NEET_UG_HIDDEN_MARKS_YEARS]
          : undefined,
      },
    );
  }, [rows, statusBySyllabusMasterId, maxScore, targetExamLabel]);

  /**
   * Per-exam rollups for multi-exam tracks. When the user has more than one
   * exam enabled, each exam gets its own rollup + year projections so the UI
   * can render a separate progress card per exam. Returns null for single-exam
   * users to avoid any behavioural change on the existing code path.
   */
  const examRollups = useMemo(() => {
    if (examResults.length <= 1) return null;
    return examResults.map((er) => {
      const erMaxScore = examScoreMax(er.examLabel);
      // Use the shared statusBySyllabusMasterId (kept live with optimistic updates)
      // rather than er.statusBySyllabusMasterId (a stale server snapshot).
      // The shared map is the merge of all per-exam maps, so it contains every
      // key; passing it with er.rows (already scoped to this exam) gives the
      // correct per-exam rollup.
      const erRollup = computeSyllabusRollup(
        er.rows,
        statusBySyllabusMasterId,
        er.primaryMarksYear,
        isNeetUgExam(er.examLabel)
          ? { legacyMarksSkipYears: NEET_UG_HIDDEN_MARKS_YEARS }
          : undefined,
      );
      const erProjections = computeNeetYearProjections(
        er.rows,
        statusBySyllabusMasterId,
        erMaxScore,
        {
          collapseDuplicateScores: false,
          omitYears: isNeetUgExam(er.examLabel)
            ? [...NEET_UG_HIDDEN_MARKS_YEARS]
            : undefined,
        },
      );
      return {
        examLabel: er.examLabel,
        catalogExamKey: er.catalogExamKey,
        rollup: erRollup,
        projections: erProjections,
        maxScore: erMaxScore,
        primaryMarksYear: er.primaryMarksYear,
      };
    });
  }, [examResults, statusBySyllabusMasterId]);

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
      pendingStatusRef.current[key] = next;

      const res = await updateMicrotopicStatus(syllabusMasterId, next);

      if (!res.ok) {
        delete pendingStatusRef.current[key];
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
      delete pendingStatusRef.current[key];

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
      pendingStatusRef.current[key] = targetStatus;

      const res = await updateMicrotopicStatus(syllabusMasterId, targetStatus);

      if (!res.ok) {
        delete pendingStatusRef.current[key];
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
      delete pendingStatusRef.current[key];
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
      for (const k of keys) pendingStatusRef.current[k] = nextStatus;

      const res = await bulkUpdateChapterMicrotopics(microtopicIds, nextStatus);

      if (!res.ok) {
        for (const k of keys) delete pendingStatusRef.current[k];
        setStatusBySyllabusMasterId(previousSnapshot);
        setUpdateError(res.error);
        return false;
      }

      await load({ silent: true });
      for (const k of keys) delete pendingStatusRef.current[k];

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
    upscOptionalSubject,
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
    /** All enabled exams in track order, each with their own rows + status map. */
    examResults,
    /** The user's selected exam track, or null for legacy users. */
    selectedTrack,
    /** Per-exam rollups for multi-exam tracks; null when only one exam is active. */
    examRollups,
  };
}

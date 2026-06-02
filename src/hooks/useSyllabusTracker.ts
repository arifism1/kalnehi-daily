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
import {
  getSyllabusTrackerCacheTtlMs,
  shouldSyncWithServer,
} from "@/lib/nativeSyncPolicy";
import {
  enqueueSyllabusOutbox,
  getSyllabusSnapshot,
  patchSyllabusSnapshotStatus,
  saveSyllabusSnapshot,
  type SyllabusSnapshot,
} from "@/lib/syllabusIdb";
import { useSyncStore } from "@/store/useSyncStore";
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
let trackerCache: SyllabusTrackerCache | null = null;

function snapshotToTrackerCache(snap: SyllabusSnapshot): SyllabusTrackerCache {
  return {
    userId: snap.userId,
    rows: snap.rows,
    statusBySyllabusMasterId: snap.statusBySyllabusMasterId,
    targetExamLabel: snap.targetExamLabel,
    cuetDomainSubjects: snap.cuetDomainSubjects,
    upscOptionalSubject: snap.upscOptionalSubject,
    catalogExamKey: snap.catalogExamKey,
    selectedTrack: snap.selectedTrack,
    examResults: snap.examResults,
    loadedAt: snap.cachedAt,
  };
}

function applyTrackerCacheToState(
  cached: SyllabusTrackerCache,
  setters: {
    setRows: (r: MergedSyllabusRow[]) => void;
    setStatusBySyllabusMasterId: (m: Record<string, string>) => void;
    setTargetExamLabel: (v: string | null) => void;
    setCuetDomainSubjects: (v: string[]) => void;
    setUpscOptionalSubject: (v: string | null) => void;
    setCatalogExamKey: (v: string | null) => void;
    setSelectedTrack: (v: ExamTrack | null) => void;
    setExamResults: (v: SyllabusDataForUserResult[]) => void;
  },
): void {
  setters.setRows(cached.rows);
  setters.setStatusBySyllabusMasterId(cached.statusBySyllabusMasterId);
  setters.setTargetExamLabel(cached.targetExamLabel);
  setters.setCuetDomainSubjects(cached.cuetDomainSubjects);
  setters.setUpscOptionalSubject(cached.upscOptionalSubject);
  setters.setCatalogExamKey(cached.catalogExamKey);
  setters.setSelectedTrack(cached.selectedTrack);
  setters.setExamResults(cached.examResults);
}

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
      if (!shouldSyncWithServer()) {
        const idbSnap = await getSyllabusSnapshot(userId);
        const mem =
          trackerCache && trackerCache.userId === userId
            ? trackerCache
            : idbSnap
              ? snapshotToTrackerCache(idbSnap)
              : null;
        if (mem) {
          trackerCache = mem;
          applyTrackerCacheToState(mem, {
            setRows,
            setStatusBySyllabusMasterId,
            setTargetExamLabel,
            setCuetDomainSubjects,
            setUpscOptionalSubject,
            setCatalogExamKey,
            setSelectedTrack,
            setExamResults,
          });
          if (myId === loadSeqRef.current) setLoading(false);
          return;
        }
        if (myId === loadSeqRef.current) setLoading(false);
        return;
      }
      try {
        if (myId !== loadSeqRef.current) return;
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
        const cached: SyllabusTrackerCache = {
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
        trackerCache = cached;
        void saveSyllabusSnapshot({
          userId,
          rows: allRows,
          statusBySyllabusMasterId: finalMap,
          targetExamLabel: cached.targetExamLabel,
          cuetDomainSubjects: cached.cuetDomainSubjects,
          upscOptionalSubject: cached.upscOptionalSubject,
          catalogExamKey: cached.catalogExamKey,
          selectedTrack: track,
          examResults: loaded,
          cachedAt: cached.loadedAt,
        }).catch(() => {});
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
    let cancelled = false;
    void (async () => {
      const idbSnap = await getSyllabusSnapshot(userId);
      if (cancelled) return;
      const cached =
        trackerCache && trackerCache.userId === userId
          ? trackerCache
          : idbSnap
            ? snapshotToTrackerCache(idbSnap)
            : null;
      if (cached) {
        trackerCache = cached;
        applyTrackerCacheToState(cached, {
          setRows,
          setStatusBySyllabusMasterId,
          setTargetExamLabel,
          setCuetDomainSubjects,
          setUpscOptionalSubject,
          setCatalogExamKey,
          setSelectedTrack,
          setExamResults,
        });
        setLoading(false);
        setError(null);
        const ttl = getSyllabusTrackerCacheTtlMs();
        if (
          shouldSyncWithServer() &&
          Date.now() - cached.loadedAt > ttl
        ) {
          void load({ silent: true });
        }
        return;
      }
      void load();
    })();
    return () => {
      cancelled = true;
    };
  }, [load, userId]);

  useEffect(() => {
    const onProfileUpdated = () => {
      if (!shouldSyncWithServer()) return;
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

  const persistSyllabusStatus = useCallback(
    async (
      keys: string[],
      ids: string[],
      nextStatus: MicrotopicProgressStatus,
      mode: "single" | "bulk",
    ): Promise<{ ok: true; serverStatus?: string } | { ok: false; error?: string }> => {
      if (!userId) return { ok: false };
      const patch: Record<string, string> = {};
      for (const k of keys) patch[k] = nextStatus;
      await patchSyllabusSnapshotStatus(userId, patch).catch(() => {});

      const tryServer =
        useSyncStore.getState().isOnline && shouldSyncWithServer();
      if (tryServer) {
        if (mode === "single" && ids[0]) {
          const res = await updateMicrotopicStatus(ids[0], nextStatus);
          if (res.ok) return { ok: true, serverStatus: res.row.status };
          return { ok: false, error: res.error };
        }
        const res = await bulkUpdateChapterMicrotopics(ids, nextStatus);
        if (res.ok) return { ok: true };
        return { ok: false, error: res.error };
      }

      if (mode === "single" && ids[0]) {
        await enqueueSyllabusOutbox(userId, {
          type: "status",
          syllabusMasterId: ids[0],
          status: nextStatus,
        });
      } else {
        await enqueueSyllabusOutbox(userId, {
          type: "bulk",
          syllabusMasterIds: ids,
          status: nextStatus,
        });
      }
      const { flushAllOutboxes } = await import("@/lib/sync");
      void flushAllOutboxes(userId);
      return { ok: true, serverStatus: nextStatus };
    },
    [userId],
  );

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

      const res = await persistSyllabusStatus([key], [syllabusMasterId], next, "single");

      if (!res.ok) {
        delete pendingStatusRef.current[key];
        setStatusBySyllabusMasterId((m) => ({
          ...m,
          [key]: previousSnapshot,
        }));
        setUpdateError(res.error ?? "Could not save. Try again when online.");
        return false;
      }

      setStatusBySyllabusMasterId((m) => ({
        ...m,
        [key]: res.serverStatus ?? next,
      }));

      if (shouldSyncWithServer()) {
        await load({ silent: true });
      }
      delete pendingStatusRef.current[key];

      if (saveFeedbackTimer.current) clearTimeout(saveFeedbackTimer.current);
      setSaveFeedback(
        shouldSyncWithServer()
          ? "Saved"
          : "Saved on this device — will sync when you're online.",
      );
      saveFeedbackTimer.current = setTimeout(() => {
        setSaveFeedback(null);
        saveFeedbackTimer.current = null;
      }, 2200);
      return true;
    },
    [load, persistSyllabusStatus],
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

      const res = await persistSyllabusStatus(
        [key],
        [syllabusMasterId],
        targetStatus,
        "single",
      );

      if (!res.ok) {
        delete pendingStatusRef.current[key];
        setStatusBySyllabusMasterId((m) => ({
          ...m,
          [key]: snapshotBefore,
        }));
        setUpdateError(res.error ?? "Could not save. Try again when online.");
        return false;
      }

      setStatusBySyllabusMasterId((m) => ({
        ...m,
        [key]: res.serverStatus ?? targetStatus,
      }));

      if (shouldSyncWithServer()) {
        await load({ silent: true });
      }
      delete pendingStatusRef.current[key];
      return true;
    },
    [load, persistSyllabusStatus],
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

      const res = await persistSyllabusStatus(
        keys,
        microtopicIds,
        nextStatus,
        "bulk",
      );

      if (!res.ok) {
        for (const k of keys) delete pendingStatusRef.current[k];
        setStatusBySyllabusMasterId(previousSnapshot);
        setUpdateError(res.error ?? "Could not save. Try again when online.");
        return false;
      }

      if (shouldSyncWithServer()) {
        await load({ silent: true });
      }
      for (const k of keys) delete pendingStatusRef.current[k];

      if (saveFeedbackTimer.current) clearTimeout(saveFeedbackTimer.current);
      setSaveFeedback(
        shouldSyncWithServer()
          ? completed
            ? "Chapter marked complete"
            : "Chapter status reset"
          : "Saved on this device — will sync when you're online.",
      );
      saveFeedbackTimer.current = setTimeout(() => {
        setSaveFeedback(null);
        saveFeedbackTimer.current = null;
      }, 2200);
      return true;
    },
    [load, persistSyllabusStatus],
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

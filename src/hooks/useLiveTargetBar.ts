"use client";

import { useEffect, useMemo, useState } from "react";

import { useCalendarDate } from "@/hooks/useCalendarDate";
import { useSyllabusTracker } from "@/hooks/useSyllabusTracker";
import {
  computeGapClosurePercentTowardTarget,
  updateLiveTargetBaseline,
} from "@/lib/liveTargetBarBaseline";
import { averageProjectedOutOfMax } from "@/lib/syllabusRollup";
import {
  isUpscCseMainsExam,
  UPSC_CSE_MAINS_UI_TOTAL_MARKS,
} from "@/lib/upscMainsOptionalSubjects";
import {
  computeWeightedMarksTotals,
  filterTasksThroughDate,
} from "@/lib/progressEngine";
import { getSupabaseBrowserClient } from "@/lib/supabase";
import { useAuthStore } from "@/store/useAuthStore";
import { useTaskStore } from "@/store/useTaskStore";

export type LiveTargetBarModel =
  | { visible: false; reason: "loading" | "no_blueprint" | "unsupported_exam" }
  | {
      visible: true;
      percentToday: number;
      targetScore: number;
      /** Rounded display of projected marks (same scale as home hero). */
      currentMastered: number;
    };

export function useLiveTargetBar(): LiveTargetBarModel {
  const userId = useAuthStore((s) => s.user?.id);
  const today = useCalendarDate();
  const tasksRecord = useTaskStore((s) => s.tasks);
  const microtopicById = useTaskStore((s) => s.microtopics);

  const {
    rows: syllabusRows,
    catalogExamKey,
    cuetScoringRollup,
    neetYearProjections,
    rollup: syllabusRollup,
    loading: syllabusLoading,
    maxScore: syllabusScoreMax,
  } = useSyllabusTracker();

  const isUpscMainsUi = isUpscCseMainsExam(catalogExamKey);

  const [blueprint, setBlueprint] = useState<{
    target_clamped: number;
    max_score: number;
  } | null>(null);
  const [blueprintLoading, setBlueprintLoading] = useState(true);

  useEffect(() => {
    if (!userId) {
      setBlueprint(null);
      setBlueprintLoading(false);
      return;
    }
    let cancelled = false;
    void (async () => {
      setBlueprintLoading(true);
      try {
        if (cancelled) return;
        const supabase = getSupabaseBrowserClient();
        const { data, error } = await supabase
          .from("user_target_blueprints")
          .select("target_clamped, max_score")
          .eq("user_id", userId)
          .order("created_at", { ascending: false })
          .limit(1)
          .maybeSingle();
        if (cancelled) return;
        if (error || !data) {
          setBlueprint(null);
          return;
        }
        setBlueprint({
          target_clamped: data.target_clamped,
          max_score: data.max_score,
        });
      } catch {
        if (!cancelled) setBlueprint(null);
      } finally {
        if (!cancelled) setBlueprintLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [userId]);

  const mastered = useMemo(() => {
    const taskList = Object.values(tasksRecord);
    const realityTasks = filterTasksThroughDate(taskList, today);

    if (cuetScoringRollup) {
      return cuetScoringRollup.totalProjected;
    }
    if (syllabusRows.length > 0 && neetYearProjections.length > 0) {
      const avg = averageProjectedOutOfMax(neetYearProjections);
      if (avg != null) return avg;
    }
    if (syllabusRows.length > 0) {
      return syllabusRollup.totalMarksMastered;
    }
    if (syllabusLoading) return 0;
    return computeWeightedMarksTotals(realityTasks, microtopicById).mastered;
  }, [
    tasksRecord,
    today,
    microtopicById,
    cuetScoringRollup,
    syllabusRows.length,
    neetYearProjections,
    syllabusRollup.totalMarksMastered,
    syllabusLoading,
  ]);

  const [startOfDay, setStartOfDay] = useState<number | null>(null);

  useEffect(() => {
    if (syllabusLoading) return;
    if (cuetScoringRollup != null) {
      setStartOfDay(null);
      return;
    }
    if (isUpscMainsUi && syllabusRows.length > 0) {
      setStartOfDay(null);
      return;
    }
    let cancelled = false;
    void updateLiveTargetBaseline(today, mastered).then(({ startOfDayMastered }) => {
      if (!cancelled) setStartOfDay(startOfDayMastered);
    });
    return () => { cancelled = true; };
  }, [
    today,
    mastered,
    cuetScoringRollup,
    isUpscMainsUi,
    syllabusRows.length,
    syllabusLoading,
  ]);

  return useMemo((): LiveTargetBarModel => {
    if (!userId || blueprintLoading || syllabusLoading) {
      return { visible: false, reason: "loading" };
    }
    if (!blueprint || blueprint.target_clamped <= 0) {
      return { visible: false, reason: "no_blueprint" };
    }
    if (cuetScoringRollup != null) {
      return { visible: false, reason: "unsupported_exam" };
    }
    if (isUpscMainsUi && syllabusRows.length > 0) {
      return { visible: false, reason: "unsupported_exam" };
    }
    if (startOfDay == null) {
      return { visible: false, reason: "loading" };
    }

    const maxFromBlueprint =
      blueprint.max_score > 0 ? blueprint.max_score : syllabusScoreMax;
    const targetScore = Math.min(blueprint.target_clamped, maxFromBlueprint);

    const percentToday = computeGapClosurePercentTowardTarget({
      target: targetScore,
      startOfDayMastered: startOfDay,
      currentMastered: mastered,
    });

    return {
      visible: true,
      percentToday: Math.round(percentToday * 10) / 10,
      targetScore,
      currentMastered: Math.round(mastered * 10) / 10,
    };
  }, [
    userId,
    blueprintLoading,
    syllabusLoading,
    blueprint,
    cuetScoringRollup,
    isUpscMainsUi,
    mastered,
    syllabusRows.length,
    startOfDay,
    syllabusScoreMax,
  ]);
}

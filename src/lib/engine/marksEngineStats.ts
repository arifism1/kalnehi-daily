import {
  computeWeightedMarksTotals,
  filterTasksForDate,
  findMissedIncompleteTasks,
  resolveTaskMarksWeight,
} from "@/lib/progressEngine";
import type {
  CuetScoringRollup,
  NeetYearProjection,
  SyllabusRollup,
} from "@/lib/syllabusRollup";
import { upscMainsSyllabusUiPercent } from "@/lib/upscMainsOptionalSubjects";
import type { Microtopic, Task } from "@/store/useTaskStore";

export type MarksEngineSnapshot = {
  /** Chapter-based syllabus when available */
  syllabusMastered: number;
  syllabusPool: number;
  syllabusPercent: number;
  /** Per-year chapter-weight projections (scaled to scoreMax, e.g. 720 or 300). */
  neetByYear: {
    year: number;
    mastered720: number;
    pool: number;
    scoreMax: number;
  }[];
  /** Plan / task-weight view */
  taskMastered: number;
  taskTotalWeight: number;
  remainingPlanWeight: number;
  /** At risk: missed past tasks not completed */
  marksAtRisk: number;
  missedTaskCount: number;
  /** Completed today (weighted) */
  gainedToday: number;
  /** Missed backlog weight */
  lostToMissed: number;
};

export function buildMarksEngineSnapshot(
  today: string,
  allTasks: Task[],
  microtopicById: Record<string, Microtopic>,
  syllabusRollup: SyllabusRollup | null,
  neetProjections: NeetYearProjection[],
  scoreMax: number = 720,
  cuetScoring?: CuetScoringRollup | null,
  /** UPSC CSE Mains: force syllabus card "pool" denominator (2350) and matching %. */
  syllabusMarksUiPoolDenominator?: number | null,
): MarksEngineSnapshot {
  const { mastered: taskMastered, total: taskTotalWeight } =
    computeWeightedMarksTotals(allTasks, microtopicById);
  const remainingPlanWeight = Math.max(0, taskTotalWeight - taskMastered);

  const missed = findMissedIncompleteTasks(allTasks, today);
  let marksAtRisk = 0;
  for (const t of missed) {
    marksAtRisk += resolveTaskMarksWeight(t, microtopicById);
  }

  const todayTasks = filterTasksForDate(allTasks, today);
  let gainedToday = 0;
  for (const t of todayTasks) {
    if (t.status === "completed") {
      gainedToday += resolveTaskMarksWeight(t, microtopicById);
    }
  }

  const neetByYear = cuetScoring
    ? []
    : neetProjections.map((p) => ({
        year: p.year,
        mastered720: p.projectedOutOf720,
        pool: p.totalMarksPool,
        scoreMax,
      }));

  let syllabusMastered = 0;
  let syllabusPool = 0;
  let syllabusPercent = 0;
  if (cuetScoring) {
    syllabusMastered = cuetScoring.totalProjected;
    syllabusPool = cuetScoring.totalMax;
    syllabusPercent = cuetScoring.overallPercent;
  } else if (syllabusRollup) {
    syllabusMastered = syllabusRollup.totalMarksMastered;
    if (
      syllabusMarksUiPoolDenominator != null &&
      syllabusMarksUiPoolDenominator > 0
    ) {
      syllabusPool = syllabusMarksUiPoolDenominator;
      syllabusPercent = upscMainsSyllabusUiPercent(syllabusMastered);
    } else {
      syllabusPool = syllabusRollup.totalMarksPool;
      syllabusPercent = syllabusRollup.overallPercent;
    }
  }

  return {
    syllabusMastered,
    syllabusPool,
    syllabusPercent,
    neetByYear,
    taskMastered,
    taskTotalWeight,
    remainingPlanWeight,
    marksAtRisk,
    missedTaskCount: missed.length,
    gainedToday,
    lostToMissed: marksAtRisk,
  };
}

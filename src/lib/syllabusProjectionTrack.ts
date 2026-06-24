import type { SyllabusRollup } from "@/lib/syllabusRollup";
import { estimateExamMarksLinear } from "@/lib/targetScoreBlueprint";

/** Linear projected marks for live syllabus header (each tick can move this). */
export function projectedMarksFromRollup(
  rollup: SyllabusRollup | null | undefined,
  maxScore: number,
): number {
  if (!rollup || maxScore <= 0) return 0;
  return estimateExamMarksLinear(rollup, maxScore).estimatedExamMarks;
}

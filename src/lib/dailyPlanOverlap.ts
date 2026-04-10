import { timeDbToInput } from "@/lib/dailyPlanTime";
import { normalizeVoiceHHMM } from "@/lib/voiceIst";

export type DailyTaskTimeBounds = {
  id: string;
  startMin: number | null;
  endMin: number | null;
};

function parseHHMMToMinutes(h: string): number | null {
  const n = normalizeVoiceHHMM(h);
  if (!n || !/^\d{2}:\d{2}$/.test(n)) return null;
  const [hh, mm] = n.split(":").map(Number);
  if (!Number.isFinite(hh) || !Number.isFinite(mm)) return null;
  return hh * 60 + mm;
}

/** Minutes from midnight; end exclusive for overlap (half-open [start,end)). */
export function taskTimeBounds(row: {
  id: string;
  time_start: string | null;
  time_end: string | null;
}): DailyTaskTimeBounds {
  const s = row.time_start ? timeDbToInput(row.time_start) : "";
  const e = row.time_end ? timeDbToInput(row.time_end) : "";
  const startMin = s ? parseHHMMToMinutes(s) : null;
  const endMin = e ? parseHHMMToMinutes(e) : null;
  return { id: row.id, startMin, endMin };
}

function intervalsOverlap(
  a: DailyTaskTimeBounds,
  b: DailyTaskTimeBounds,
): boolean {
  if (
    a.startMin == null ||
    a.endMin == null ||
    b.startMin == null ||
    b.endMin == null
  ) {
    return false;
  }
  return a.startMin < b.endMin && b.startMin < a.endMin;
}

/** Pairs of task ids that have overlapping time ranges (both ends known). */
export function findOverlappingTaskPairs(
  rows: Array<{ id: string; time_start: string | null; time_end: string | null }>,
): Set<string> {
  const bounds = rows.map(taskTimeBounds);
  const overlapIds = new Set<string>();
  for (let i = 0; i < bounds.length; i++) {
    for (let j = i + 1; j < bounds.length; j++) {
      if (intervalsOverlap(bounds[i], bounds[j])) {
        overlapIds.add(bounds[i].id);
        overlapIds.add(bounds[j].id);
      }
    }
  }
  return overlapIds;
}

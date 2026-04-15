import { normalizeSyllabusMasterId } from "@/lib/syllabusIds";
import { sortSyllabusRows } from "@/lib/syllabusGrouping";
import type { MergedSyllabusRow } from "@/lib/userSyllabusMerge";

function normPart(s: string | null | undefined): string {
  return (s ?? "").trim().toLowerCase().replace(/\s+/g, " ");
}

/** Stable key for “same microtopic slot” when catalog has duplicate UUID rows. */
export function microtopicPlacementKey(row: {
  subject: string;
  chapter: string;
  microtopic: string;
}): string {
  return `${normPart(row.subject)}\u0001${normPart(row.chapter)}\u0001${normPart(row.microtopic)}`;
}

function pickCanonicalRow(group: MergedSyllabusRow[]): MergedSyllabusRow {
  const sorted = [...group].sort((a, b) => {
    const ua = a.userSyllabus?.isUserAdded ? 1 : 0;
    const ub = b.userSyllabus?.isUserAdded ? 1 : 0;
    if (ua !== ub) return ua - ub;
    return normalizeSyllabusMasterId(a.id).localeCompare(
      normalizeSyllabusMasterId(b.id),
    );
  });
  return sorted[0]!;
}

function mergeMarksAcrossDuplicates(
  canonical: MergedSyllabusRow,
  others: MergedSyllabusRow[],
): MergedSyllabusRow {
  if (others.length === 0) return canonical;
  const mergeNum = (a: number | null, b: number | null): number | null => {
    if (a == null && b == null) return null;
    if (a == null) return b;
    if (b == null) return a;
    return Math.max(a, b);
  };
  let next: MergedSyllabusRow = { ...canonical };
  for (const o of others) {
    next = {
      ...next,
      marks_2023: mergeNum(next.marks_2023, o.marks_2023),
      marks_2024: mergeNum(next.marks_2024, o.marks_2024),
      marks_2025: mergeNum(next.marks_2025, o.marks_2025),
    };
  }
  return next;
}

/**
 * Collapse duplicate catalog rows that share the same subject/chapter/microtopic label
 * (different `id`s). Prefers catalog rows over user-added, then lowest UUID.
 * Merges marks columns across duplicates so chapter pools stay fair.
 */
export function dedupeMergedSyllabusRowsByPlacement(rows: MergedSyllabusRow[]): {
  rows: MergedSyllabusRow[];
  droppedToCanonical: Map<string, string>;
} {
  const byKey = new Map<string, MergedSyllabusRow[]>();
  for (const r of rows) {
    const k = microtopicPlacementKey(r);
    const arr = byKey.get(k) ?? [];
    arr.push(r);
    byKey.set(k, arr);
  }

  const droppedToCanonical = new Map<string, string>();
  const out: MergedSyllabusRow[] = [];

  for (const [, group] of byKey) {
    if (group.length === 1) {
      out.push(group[0]!);
      continue;
    }
    const canon = pickCanonicalRow(group);
    const canonId = normalizeSyllabusMasterId(canon.id);
    for (const r of group) {
      const rid = normalizeSyllabusMasterId(r.id);
      if (rid !== canonId) droppedToCanonical.set(rid, canonId);
    }
    const others = group.filter(
      (r) => normalizeSyllabusMasterId(r.id) !== canonId,
    );
    out.push(mergeMarksAcrossDuplicates(canon, others));
  }

  return {
    rows: sortSyllabusRows(out) as MergedSyllabusRow[],
    droppedToCanonical,
  };
}

function statusRank(s: string): number {
  if (s === "completed") return 4;
  if (s === "need_revision") return 3;
  if (s === "in_progress") return 2;
  return 1;
}

function strongerStatus(a: string | undefined, b: string | undefined): string {
  if (!a) return b ?? "not_begun";
  if (!b) return a;
  return statusRank(b) > statusRank(a) ? b : a;
}

/** Fold progress for dropped duplicate ids onto the canonical syllabus_master id. */
export function coalesceProgressByCanonicalIds(
  map: Record<string, string>,
  droppedToCanonical: Map<string, string>,
): Record<string, string> {
  const next: Record<string, string> = { ...map };
  for (const [dropped, canonical] of droppedToCanonical) {
    const dVal = next[dropped];
    delete next[dropped];
    if (!dVal) continue;
    next[canonical] = strongerStatus(next[canonical], dVal);
  }
  return next;
}

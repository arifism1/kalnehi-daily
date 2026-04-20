import { addDays, format, parseISO } from "date-fns";

import { normalizeSyllabusMasterId } from "@/lib/syllabusIds";
import type { MergedSyllabusRow } from "@/lib/userSyllabusMerge";

export type PlannedItem = {
  syllabusId: string;
  /** As stored in `user_revision_topic_state` — required for rescheduling if syllabus row is missing. */
  topicTitle: string;
  display: string;
  nextDate: string;
  row: MergedSyllabusRow | null;
};

export type PlannedSection = {
  id: string;
  heading: string;
  dateKey: string;
  items: PlannedItem[];
};

function displayFor(
  r: MergedSyllabusRow | null,
  topicTitle: string,
): string {
  if (r) {
    const name =
      (r.microtopic ?? "").trim() ||
      (r.chapter ?? "").trim() ||
      "Topic";
    return `${name} · ${(r.subject ?? "").trim() || "Subject"}`;
  }
  return topicTitle.trim() || "Topic";
}

/** Title stored in topic state / sent to server actions — not the display line with subject. */
function storedTopicTitle(
  topicTitle: string | null | undefined,
  r: MergedSyllabusRow | null,
): string {
  const raw = (topicTitle ?? "").trim();
  if (raw) return raw;
  if (r) {
    return (r.microtopic ?? "").trim() || (r.chapter ?? "").trim() || "Topic";
  }
  return "Topic";
}

/**
 * Groups topic state rows by `next_review_effective_date` for date-wise UI.
 * Sorted ascending by date; each section is one calendar day.
 */
export function buildPlannedRevisionSections(
  topicStates: {
    syllabus_master_id: string;
    topic_title: string;
    next_review_effective_date: string | null;
  }[],
  rowById: Map<string, MergedSyllabusRow>,
  todayYyyyMmDd: string,
): PlannedSection[] {
  const byDate = new Map<string, PlannedItem[]>();
  for (const t of topicStates) {
    const d = t.next_review_effective_date;
    if (!d) continue;
    const id = normalizeSyllabusMasterId(t.syllabus_master_id);
    const r = rowById.get(id) ?? null;
    const item: PlannedItem = {
      syllabusId: id,
      topicTitle: storedTopicTitle(t.topic_title, r),
      display: displayFor(r, t.topic_title),
      nextDate: d,
      row: r,
    };
    if (!byDate.has(d)) byDate.set(d, []);
    byDate.get(d)!.push(item);
  }
  for (const list of byDate.values()) {
    list.sort((a, b) => a.display.localeCompare(b.display));
  }
  const today = parseISO(todayYyyyMmDd);
  const tomorrowKey = format(addDays(today, 1), "yyyy-MM-dd");
  const dates = Array.from(byDate.keys()).sort();
  const sections: PlannedSection[] = [];
  for (const dateKey of dates) {
    const list = byDate.get(dateKey)!;
    let heading: string;
    if (dateKey < todayYyyyMmDd) {
      heading = `${format(parseISO(dateKey), "EEEE, MMM d, yyyy")} — overdue`;
    } else if (dateKey === todayYyyyMmDd) {
      heading = "Today";
    } else if (dateKey === tomorrowKey) {
      heading = "Tomorrow";
    } else {
      heading = format(parseISO(dateKey), "EEEE, MMM d, yyyy");
    }
    sections.push({ id: `plan-${dateKey}`, heading, dateKey, items: list });
  }
  return sections;
}

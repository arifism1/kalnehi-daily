import { differenceInCalendarDays, parseISO } from "date-fns";

import { normalizeSyllabusMasterId } from "@/lib/syllabusIds";
import type { MergedSyllabusRow } from "@/lib/userSyllabusMerge";
import type { RevisionTopicStateLite } from "@/lib/revision/smartSuggestions";

export type DangerTopic = {
  id: string;
  label: string;
  subject: string;
  chapter: string;
  reason: string;
  urgency: number;
};

/**
 * Topics most at risk: overdue next review, or no schedule but stale recall.
 */
export function buildDangerZoneTopics(
  rows: MergedSyllabusRow[],
  topicStateById: Record<string, RevisionTopicStateLite | undefined>,
  todayYyyyMmDd: string,
  cap = 8,
): DangerTopic[] {
  const today = parseISO(todayYyyyMmDd);
  const out: DangerTopic[] = [];

  for (const r of rows) {
    const id = normalizeSyllabusMasterId(String(r.id));
    const st = topicStateById[id];
    const next = st?.next_review_effective_date
      ? parseISO(st.next_review_effective_date)
      : null;
    const last = st?.last_recalled_at ? parseISO(st.last_recalled_at) : null;
    const label =
      (r.microtopic ?? "").trim() || (r.chapter ?? "").trim() || "Topic";

    let urgency = 0;
    let reason = "";

    if (next) {
      const daysOver = differenceInCalendarDays(today, next);
      if (daysOver > 0) {
        urgency = 50 + Math.min(40, daysOver * 3);
        reason = `Review was due ${daysOver} day${daysOver === 1 ? "" : "s"} ago`;
        out.push({
          id,
          label,
          subject: r.subject ?? "",
          chapter: r.chapter ?? "",
          reason,
          urgency,
        });
        continue;
      }
      if (daysOver === 0) {
        urgency = 35;
        reason = "Due today—easy to forget if you skip";
        out.push({ id, label, subject: r.subject ?? "", chapter: r.chapter ?? "", reason, urgency });
        continue;
      }
    }

    if (last) {
      const since = differenceInCalendarDays(today, last);
      if (since >= 21) {
        urgency = 20 + Math.min(25, since - 20);
        reason = `No recall logged for ${since} days`;
        out.push({ id, label, subject: r.subject ?? "", chapter: r.chapter ?? "", reason, urgency });
      }
    }
  }

  out.sort((a, b) => b.urgency - a.urgency);
  return out.slice(0, cap);
}

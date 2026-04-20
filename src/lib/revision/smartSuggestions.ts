import { differenceInCalendarDays, parseISO } from "date-fns";

import { normalizeSyllabusMasterId } from "@/lib/syllabusIds";
import {
  isMicrotopicProgressStatus,
  type MicrotopicProgressStatus,
} from "@/lib/syllabusConstants";
import { syllabusMarksWeight } from "@/lib/syllabusConstants";
import type { MergedSyllabusRow } from "@/lib/userSyllabusMerge";

export type RevisionTopicStateLite = {
  next_review_effective_date: string | null;
  last_recalled_at: string | null;
};

export type SuggestedTopic = {
  id: string;
  label: string;
  subject: string;
  chapter: string;
  status: MicrotopicProgressStatus;
  marksWeight: number;
  score: number;
  reason: string;
};

function statusOrder(s: MicrotopicProgressStatus): number {
  switch (s) {
    case "need_revision":
      return 4;
    case "in_progress":
      return 3;
    case "completed":
      return 2;
    default:
      return 1;
  }
}

function resolveStatus(
  id: string,
  map: Record<string, string>,
): MicrotopicProgressStatus {
  const s = map[normalizeSyllabusMasterId(id)];
  if (isMicrotopicProgressStatus(s)) return s;
  return "not_begun";
}

/**
 * Picks 4–8 high-value microtopics for today's revision (deterministic, explainable).
 */
export function buildSmartRevisionSuggestions(
  rows: MergedSyllabusRow[],
  statusBySyllabusMasterId: Record<string, string>,
  topicStateById: Record<string, RevisionTopicStateLite | undefined>,
  todayYyyyMmDd: string,
  opts?: { minCount?: number; maxCount?: number },
): SuggestedTopic[] {
  const minC = opts?.minCount ?? 4;
  const maxC = opts?.maxCount ?? 8;
  const today = parseISO(todayYyyyMmDd);

  const scored: SuggestedTopic[] = [];

  for (const r of rows) {
    const id = normalizeSyllabusMasterId(String(r.id));
    const status = resolveStatus(id, statusBySyllabusMasterId);
    const marksWeight = syllabusMarksWeight(r);
    const st = topicStateById[id];
    const nextDue = st?.next_review_effective_date;
    const lastRecall = st?.last_recalled_at
      ? parseISO(st.last_recalled_at)
      : null;

    const so = statusOrder(status);
    let score = so * 12 + Math.log1p(marksWeight) * 3;
    const reasons: string[] = [];

    if (status === "need_revision") {
      score += 25;
      reasons.push("Marked for revision in your tracker");
    } else if (status === "in_progress") {
      score += 10;
      reasons.push("In progress—good time to consolidate");
    }

    if (marksWeight >= 8) {
      score += 8;
      reasons.push("High exam weightage");
    } else if (marksWeight >= 4) {
      score += 4;
    }

    if (nextDue) {
      const nd = parseISO(nextDue);
      const days = differenceInCalendarDays(today, nd);
      if (days >= 0) {
        score += 20 + Math.min(30, days * 2);
        reasons.push(
          days === 0
            ? "Due for review today"
            : `Overdue for review by ${days} day${days === 1 ? "" : "s"}`,
        );
      } else {
        const until = -days;
        if (until <= 2) {
          score += 5;
          reasons.push("Review window is soon");
        }
      }
    } else if (status === "completed" && lastRecall) {
      const daysSince = differenceInCalendarDays(today, lastRecall);
      if (daysSince >= 14) {
        score += 15;
        reasons.push("Not revisited recently—retention risk");
      }
    } else if (status === "completed" && !lastRecall) {
      score += 12;
      reasons.push("Mastered once—spaced review would lock it in");
    }

    if (reasons.length === 0) {
      reasons.push("Balances your weak spots and exam weightage");
    }

    const label =
      (r.microtopic ?? "").trim() || (r.chapter ?? "").trim() || "Topic";

    scored.push({
      id,
      label,
      subject: r.subject ?? "",
      chapter: r.chapter ?? "",
      status,
      marksWeight,
      score,
      reason: reasons.slice(0, 2).join(" · "),
    });
  }

  scored.sort((a, b) => b.score - a.score);
  if (scored.length === 0) return [];
  const count =
    scored.length < minC
      ? scored.length
      : Math.min(maxC, Math.max(minC, scored.length));
  return scored.slice(0, count);
}

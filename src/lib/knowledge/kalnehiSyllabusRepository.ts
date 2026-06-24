/**
 * Kalnehi adapter for the engine's KnowledgeTreeRepository.
 *
 * Maps the exam syllabus model (syllabus_master rows + microtopic status) onto the
 * engine's generic KnowledgeTree: Subject -> group, Chapter -> branch, Microtopic -> leaf,
 * chapter marks pool -> branch weight.
 */
import type {
  KnowledgeBranch,
  KnowledgeTree,
  KnowledgeTreeRepository,
} from "@engine/models/knowledgeTree";
import { normalizeMasteryStatus } from "@engine/models/knowledgeTree";

import type { SyllabusRow } from "@/lib/syllabusGrouping";
import {
  chapterMarksPoolForYearRows,
  NEET_PRIMARY_YEAR,
} from "@/lib/syllabusRollup";

export interface KalnehiSyllabusScope {
  rows: SyllabusRow[];
  statusBySyllabusMasterId: Record<string, string>;
  primaryMarksYear?: number;
}

const GROUP_SEP = "\u0000";

/** Pure mapping from syllabus rows to a generic KnowledgeTree. */
export function buildKalnehiKnowledgeTree(scope: KalnehiSyllabusScope): KnowledgeTree {
  const year = scope.primaryMarksYear ?? NEET_PRIMARY_YEAR;
  const buckets = new Map<string, SyllabusRow[]>();
  for (const row of scope.rows) {
    const subject = row.subject ?? "";
    const chapter = row.chapter ?? "";
    const key = `${subject}${GROUP_SEP}${chapter}`;
    const list = buckets.get(key);
    if (list) list.push(row);
    else buckets.set(key, [row]);
  }

  const branches: KnowledgeBranch[] = [];
  for (const [key, list] of buckets) {
    const [group, label] = key.split(GROUP_SEP);
    branches.push({
      key,
      group: group ?? "",
      label: label ?? "",
      weight: chapterMarksPoolForYearRows(list, year),
      leaves: list.map((r) => ({
        id: r.id,
        label: r.microtopic ?? r.id,
        status: normalizeMasteryStatus(
          scope.statusBySyllabusMasterId[r.id],
        ),
      })),
    });
  }
  return { branches };
}

export class KalnehiSyllabusRepository
  implements KnowledgeTreeRepository<KalnehiSyllabusScope>
{
  async getTree(scope: KalnehiSyllabusScope): Promise<KnowledgeTree> {
    return buildKalnehiKnowledgeTree(scope);
  }
}

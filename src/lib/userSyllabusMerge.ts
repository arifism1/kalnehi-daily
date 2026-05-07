import type { Tables } from "@/types/supabase";
import { normalizeSyllabusMasterId } from "@/lib/syllabusIds";
import type { SyllabusRow } from "@/lib/syllabusGrouping";
import { sortSyllabusRows } from "@/lib/syllabusGrouping";

export type UserSyllabusCustomizationRow = Tables<"user_syllabus_customizations">;

export type MergedSyllabusRow = SyllabusRow & {
  /** Original `syllabus_master` subject/chapter (before user renames). Used for chapter-level deletes. */
  originSubject?: string;
  originChapter?: string;
  userSyllabus?: {
    customizationId: string | null;
    isUserAdded: boolean;
    isDisplayEdited: boolean;
  };
};

function normKey(subject: string, chapter: string): string {
  return `${subject.trim()}\u0000${chapter.trim()}`;
}

/**
 * Merge global `syllabus_master` rows with per-user overlays. Never mutates globals.
 */
export function mergeSyllabusWithUserCustomizations(
  globalRows: SyllabusRow[],
  customs: UserSyllabusCustomizationRow[],
  examNameKey: string,
): MergedSyllabusRow[] {
  const relevant = customs.filter((c) => c.exam_name === examNameKey);

  const deletedMicro = new Set<string>();
  const deletedChapter = new Set<string>();
  const chapterRenames = new Map<string, { newChapter: string; customizationId: string }>();
  const microEdits = new Map<
    string,
    {
      customizationId: string;
      subject?: string;
      chapter?: string;
      microtopic?: string;
    }
  >();
  const adds: UserSyllabusCustomizationRow[] = [];

  for (const c of relevant) {
    if (c.action_type === "delete" && c.target_type === "microtopic" && c.syllabus_master_id) {
      deletedMicro.add(normalizeSyllabusMasterId(c.syllabus_master_id));
    } else if (
      c.action_type === "delete" &&
      c.target_type === "chapter" &&
      c.subject &&
      c.chapter
    ) {
      deletedChapter.add(normKey(c.subject, c.chapter));
    } else if (
      c.action_type === "edit" &&
      c.target_type === "chapter" &&
      c.subject &&
      c.chapter &&
      c.custom_chapter
    ) {
      chapterRenames.set(normKey(c.subject, c.chapter), {
        newChapter: c.custom_chapter.trim(),
        customizationId: c.id,
      });
    } else if (
      c.action_type === "edit" &&
      c.target_type === "microtopic" &&
      c.syllabus_master_id
    ) {
      const id = normalizeSyllabusMasterId(c.syllabus_master_id);
      microEdits.set(id, {
        customizationId: c.id,
        subject: c.custom_subject?.trim() || undefined,
        chapter: c.custom_chapter?.trim() || undefined,
        microtopic: c.custom_microtopic?.trim() || undefined,
      });
    } else if (
      c.action_type === "add" &&
      c.target_type === "microtopic" &&
      c.subject &&
      c.chapter &&
      c.custom_microtopic
    ) {
      adds.push(c);
    }
  }

  const base = globalRows.filter((r) => {
    const id = normalizeSyllabusMasterId(r.id);
    if (deletedMicro.has(id)) return false;
    if (deletedChapter.has(normKey(r.subject, r.chapter))) return false;
    return true;
  });

  const merged: MergedSyllabusRow[] = base.map((r) => {
    const originSubject = r.subject;
    const originChapter = r.chapter;
    const nk = normKey(r.subject, r.chapter);
    const ch = chapterRenames.get(nk);
    let next: SyllabusRow = { ...r };
    let displayEdited = false;
    let editCustomizationId: string | null = null;

    if (ch) {
      next = { ...next, chapter: ch.newChapter };
      displayEdited = true;
      editCustomizationId = ch.customizationId;
    }

    const mid = normalizeSyllabusMasterId(r.id);
    const me = microEdits.get(mid);
    if (me) {
      next = {
        ...next,
        subject: me.subject ?? next.subject,
        chapter: me.chapter ?? next.chapter,
        microtopic: me.microtopic ?? next.microtopic,
      };
      displayEdited = true;
      editCustomizationId = me.customizationId;
    }

    return {
      ...next,
      originSubject,
      originChapter,
      userSyllabus: {
        customizationId: editCustomizationId,
        isUserAdded: false,
        isDisplayEdited: displayEdited,
      },
    };
  });

  for (const c of adds) {
    const sub = c.subject!.trim();
    const ch = c.chapter!.trim();
    merged.push({
      id: c.id,
      exam_name: examNameKey,
      subject: sub,
      chapter: ch,
      microtopic: c.custom_microtopic!.trim(),
      marks_2023: null,
      marks_2024: null,
      marks_2025: 1,
      marks_2026: 1,
      relative_effort_score: null,
      section: null,
      weightage_tag: null,
      created_at: c.created_at,
      originSubject: sub,
      originChapter: ch,
      userSyllabus: {
        customizationId: c.id,
        isUserAdded: true,
        isDisplayEdited: false,
      },
    } as MergedSyllabusRow);
  }

  return sortSyllabusRows(merged) as MergedSyllabusRow[];
}

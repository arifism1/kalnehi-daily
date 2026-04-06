import {
  isCuetExam,
  resolveSyllabusExam,
  syllabusCatalogExamName,
} from "@/lib/examProfile";
import type { SyllabusRow } from "@/lib/syllabusGrouping";
import {
  parseCuetDomainSubjectsJson,
  syllabusSubjectInCuetDomains,
} from "@/lib/cuetDomainSubjects";
import {
  applyMarksOverridesToRows,
  type SyllabusMarksOverrideRow,
} from "@/lib/applySyllabusMarksOverrides";
import {
  mergeSyllabusWithUserCustomizations,
  type MergedSyllabusRow,
  type UserSyllabusCustomizationRow,
} from "@/lib/userSyllabusMerge";
import { getSupabaseBrowserClient } from "@/lib/supabase";
import { getAllOutboxMutations } from "@/lib/taskIdb";
import type { Microtopic, Task } from "@/store/useTaskStore";
import { useTaskStore } from "@/store/useTaskStore";

const STATUS_FROM_DB: Record<string, string> = {
  not_started: "pending",
};

function normalizeTaskRow(row: Record<string, unknown>): Task {
  const status =
    typeof row.status === "string" && STATUS_FROM_DB[row.status]
      ? STATUS_FROM_DB[row.status]
      : row.status;

  return {
    ...row,
    status,
    name: (row as { name?: string | null }).name ?? null,
    estimated_minutes:
      (row as { estimated_minutes?: number | null }).estimated_minutes ??
      (row as { estimated_time_minutes?: number | null })
        .estimated_time_minutes ??
      null,
    marks_weight:
      (row as { marks_weight?: number | null }).marks_weight ?? null,
  } as Task;
}

/**
 * Pull tasks + syllabus (for the user’s target exam only) from Supabase into Zustand and IndexedDB.
 */
export async function refreshTasksFromSupabase(userId: string): Promise<void> {
  const supabase = getSupabaseBrowserClient();

  const { data: profile, error: pProf } = await supabase
    .from("user_profiles")
    .select("primary_exam, target_exam, cuet_domain_subjects")
    .eq("user_id", userId)
    .maybeSingle();

  if (pProf) throw pProf;

  const examLabel = resolveSyllabusExam(profile);
  /** Aligns profile `target_exam` (`exams.exam_name`) with `syllabus_master.exam_name`. */
  const examKey = examLabel?.trim()
    ? syllabusCatalogExamName(examLabel)
    : null;

  const cuetDomains =
    examLabel && isCuetExam(examLabel)
      ? parseCuetDomainSubjectsJson(profile?.cuet_domain_subjects)
      : [];

  const [tasksRes, microRes, customRes, marksRes] = await Promise.all([
    supabase.from("tasks").select("*").eq("user_id", userId),
    examKey
      ? supabase.from("syllabus_master").select("*").eq("exam_name", examKey)
      : Promise.resolve({ data: [] as Record<string, unknown>[], error: null }),
    examKey
      ? supabase
          .from("user_syllabus_customizations")
          .select("*")
          .eq("user_id", userId)
          .eq("exam_name", examKey)
      : Promise.resolve({ data: [] as Record<string, unknown>[], error: null }),
    examKey
      ? supabase
          .from("user_syllabus_marks_overrides")
          .select("syllabus_master_id, marks_2025, marks_2024, marks_2023")
          .eq("user_id", userId)
          .eq("exam_name", examKey)
      : Promise.resolve({ data: [] as Record<string, unknown>[], error: null }),
  ]);

  const { data: taskRows, error: tErr } = tasksRes;
  const { data: microRows, error: mErr } = microRes;
  const { data: customsRows, error: cuErr } = customRes;
  const { data: marksRows, error: moErr } = marksRes;

  if (tErr) throw tErr;
  if (mErr) throw mErr;
  if (cuErr) throw cuErr;
  if (moErr) throw moErr;

  const tasks = (taskRows ?? []).map((r) =>
    normalizeTaskRow(r as Record<string, unknown>),
  );

  let merged: MergedSyllabusRow[] = [];
  if (examKey) {
    merged = mergeSyllabusWithUserCustomizations(
      (microRows ?? []) as SyllabusRow[],
      (customsRows ?? []) as UserSyllabusCustomizationRow[],
      examKey,
    );
    if (examKey === "CUET" && cuetDomains.length > 0) {
      merged = merged.filter((row) =>
        syllabusSubjectInCuetDomains(row.subject, cuetDomains),
      );
    } else if (examKey === "CUET") {
      merged = [];
    }
    merged = applyMarksOverridesToRows(
      merged,
      (marksRows ?? []) as SyllabusMarksOverrideRow[],
    );
  }

  let microtopics = merged.map((row) => {
    const { userSyllabus: _u, originSubject: _os, originChapter: _oc, ...rest } =
      row;
    return rest as Microtopic;
  });

  const queue = await getAllOutboxMutations();
  const pendingDeleteIds = new Set(
    queue.filter((m) => m.op === "task_delete").map((m) => m.taskId),
  );
  const pendingLocalMutationIds = new Set(
    queue
      .filter((m) => m.op === "task_create" || m.op === "task_update")
      .map((m) => m.taskId),
  );

  useTaskStore.getState().mergeServerTasks(tasks, {
    pendingDeleteIds,
    pendingLocalMutationIds,
  });
  useTaskStore.getState().setMicrotopics(microtopics as Microtopic[]);

  const { persistTasks, persistMicrotopics } = await import("@/lib/taskIdb");
  await persistTasks(Object.values(useTaskStore.getState().tasks));
  await persistMicrotopics(microtopics as Microtopic[]);
}

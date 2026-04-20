"use client";

import type { TablesInsert } from "@/types/supabase";
import { chapterKey, type SyllabusRow } from "@/lib/syllabusGrouping";
import { applyOptimisticTaskCreate } from "@/lib/taskMutations";
import { toUserFacingLocalError } from "@/lib/userFacingErrors";
import { useTaskStore, type Task } from "@/store/useTaskStore";

/**
 * Instantly creates a minimal pending task (offline-first: Zustand + IndexedDB + outbox).
 * Does not block on the server — sync runs in the background.
 */
export async function quickCreateEmptyTask(
  userId: string,
  assignedDate: string,
): Promise<{ ok: true; id: string } | { ok: false; error: string }> {
  try {
    const id = crypto.randomUUID();
    const now = new Date().toISOString();

    const fullTask: Task = {
      id,
      user_id: userId,
      assigned_date: assignedDate,
      status: "pending",
      name: null,
      microtopic_id: null,
      created_at: now,
      updated_at: now,
      estimated_minutes: null,
      estimated_time_minutes: null,
      end_time: null,
      start_time: null,
      marks_value: null,
      marks_weight: null,
      time_spent_seconds: null,
    };

    const row: Omit<TablesInsert<"tasks">, "user_id" | "id"> & { id?: string } =
      {
        assigned_date: assignedDate,
        status: "pending",
        name: null,
        microtopic_id: null,
        id,
      };

    await applyOptimisticTaskCreate(row, userId, fullTask);
    return { ok: true, id };
  } catch (e) {
    return { ok: false, error: toUserFacingLocalError(e) };
  }
}

/**
 * Create a task with optional display name and optional scheduled start time (same-day).
 */
export async function quickCreatePlannedTask(
  userId: string,
  assignedDate: string,
  options: {
    name: string | null;
    start_time: string | null;
    end_time?: string | null;
  },
): Promise<{ ok: true; id: string } | { ok: false; error: string }> {
  try {
    const id = crypto.randomUUID();
    const now = new Date().toISOString();
    const name =
      options.name != null && options.name.trim().length > 0
        ? options.name.trim()
        : null;
    const end_time =
      options.end_time !== undefined ? options.end_time : null;

    const fullTask: Task = {
      id,
      user_id: userId,
      assigned_date: assignedDate,
      status: "pending",
      name,
      microtopic_id: null,
      created_at: now,
      updated_at: now,
      estimated_minutes: null,
      estimated_time_minutes: null,
      end_time,
      start_time: options.start_time,
      marks_value: null,
      marks_weight: null,
      time_spent_seconds: null,
    };

    const row: Omit<TablesInsert<"tasks">, "user_id" | "id"> & { id?: string } =
      {
        assigned_date: assignedDate,
        status: "pending",
        name,
        microtopic_id: null,
        id,
        start_time: options.start_time,
        end_time,
      };

    await applyOptimisticTaskCreate(row, userId, fullTask);
    return { ok: true, id };
  } catch (e) {
    return { ok: false, error: toUserFacingLocalError(e) };
  }
}

/**
 * One pending task per microtopic in the given chapters for `assignedDate`.
 * Skips microtopics that already have a task on that date.
 */
export async function bulkAddSyllabusMicrotopicsToDailyPlan(
  userId: string,
  assignedDate: string,
  syllabusRows: SyllabusRow[],
  chapterKeys: Set<string>,
): Promise<
  { ok: true; created: number; skipped: number } | { ok: false; error: string }
> {
  try {
    const existing = new Set<string>();
    for (const t of Object.values(useTaskStore.getState().tasks)) {
      if (t.assigned_date !== assignedDate) continue;
      if (t.microtopic_id && String(t.microtopic_id).length > 0) {
        existing.add(String(t.microtopic_id));
      }
    }

    let created = 0;
    let skipped = 0;
    for (const row of syllabusRows) {
      const key = chapterKey(row.subject || "Other", row.chapter || "General");
      if (!chapterKeys.has(key)) continue;
      const mid = String(row.id);
      if (existing.has(mid)) {
        skipped++;
        continue;
      }
      const id = crypto.randomUUID();
      const now = new Date().toISOString();
      const label = (row.microtopic ?? "").trim() || row.chapter || "Syllabus";
      const fullTask: Task = {
        id,
        user_id: userId,
        assigned_date: assignedDate,
        status: "pending",
        name: label,
        microtopic_id: mid,
        created_at: now,
        updated_at: now,
        estimated_minutes: row.estimated_minutes ?? null,
        estimated_time_minutes: null,
        end_time: null,
        start_time: null,
        marks_value: null,
        marks_weight: null,
        time_spent_seconds: null,
      };
      const insertRow: Omit<TablesInsert<"tasks">, "user_id" | "id"> & {
        id?: string;
      } = {
        assigned_date: assignedDate,
        status: "pending",
        name: label,
        microtopic_id: mid,
        id,
        estimated_minutes: row.estimated_minutes ?? null,
      };
      const r = await applyOptimisticTaskCreate(insertRow, userId, fullTask);
      if (!r.ok) return r;
      existing.add(mid);
      created++;
    }
    return { ok: true, created, skipped };
  } catch (e) {
    return { ok: false, error: toUserFacingLocalError(e) };
  }
}

/**
 * One pending task per selected syllabus row for `assignedDate`. Skips duplicates on that date.
 */
export async function addSelectedSyllabusRowsToDailyPlan(
  userId: string,
  assignedDate: string,
  rows: SyllabusRow[],
): Promise<
  { ok: true; created: number; skipped: number } | { ok: false; error: string }
> {
  try {
    const existing = new Set<string>();
    for (const t of Object.values(useTaskStore.getState().tasks)) {
      if (t.assigned_date !== assignedDate) continue;
      if (t.microtopic_id && String(t.microtopic_id).length > 0) {
        existing.add(String(t.microtopic_id));
      }
    }

    let created = 0;
    let skipped = 0;
    for (const row of rows) {
      const mid = String(row.id);
      if (existing.has(mid)) {
        skipped++;
        continue;
      }
      const id = crypto.randomUUID();
      const now = new Date().toISOString();
      const label = (row.microtopic ?? "").trim() || row.chapter || "Syllabus";
      const fullTask: Task = {
        id,
        user_id: userId,
        assigned_date: assignedDate,
        status: "pending",
        name: label,
        microtopic_id: mid,
        created_at: now,
        updated_at: now,
        estimated_minutes: row.estimated_minutes ?? null,
        estimated_time_minutes: null,
        end_time: null,
        start_time: null,
        marks_value: null,
        marks_weight: null,
        time_spent_seconds: null,
      };
      const insertRow: Omit<TablesInsert<"tasks">, "user_id" | "id"> & {
        id?: string;
      } = {
        assigned_date: assignedDate,
        status: "pending",
        name: label,
        microtopic_id: mid,
        id,
        estimated_minutes: row.estimated_minutes ?? null,
      };
      const r = await applyOptimisticTaskCreate(insertRow, userId, fullTask);
      if (!r.ok) return r;
      existing.add(mid);
      created++;
    }
    return { ok: true, created, skipped };
  } catch (e) {
    return { ok: false, error: toUserFacingLocalError(e) };
  }
}

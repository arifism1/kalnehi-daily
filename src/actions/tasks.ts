"use server";

import { revalidatePath } from "next/cache";

import { formatSupabaseError } from "@/lib/supabase";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { TablesInsert, TablesUpdate } from "@/types/supabase";

/**
 * Reconcile app-side field names / values with the live Postgres schema.
 *
 * `estimated_minutes` is the app-side alias; the DB column is `estimated_time_minutes`.
 * We map it here so callers can use either name.
 */
const COLS_MISSING_FROM_DB: readonly string[] = [];

const STATUS_TO_DB: Record<string, string> = {
  pending: "not_started",
};

function sanitizeTaskPayload<T extends TablesInsert<"tasks"> | TablesUpdate<"tasks">>(
  row: T,
): T {
  const o = { ...row } as Record<string, unknown>;

  for (const col of COLS_MISSING_FROM_DB) delete o[col];

  if (o.start_time == null) delete o.start_time;
  if (o.end_time == null) delete o.end_time;
  if (o.microtopic_id == null) delete o.microtopic_id;

  if (
    "estimated_minutes" in o &&
    o.estimated_minutes != null &&
    !("estimated_time_minutes" in o)
  ) {
    o.estimated_time_minutes = o.estimated_minutes;
  }
  delete o.estimated_minutes;

  if (typeof o.status === "string" && STATUS_TO_DB[o.status]) {
    o.status = STATUS_TO_DB[o.status];
  }

  return o as T;
}

async function requireUser() {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();
  if (error || !user) throw new Error("Unauthorized");
  return { supabase, userId: user.id };
}

export async function createTask(
  row: Omit<TablesInsert<"tasks">, "user_id">,
): Promise<{ ok: true; id: string } | { ok: false; error: string }> {
  try {
    const { supabase, userId } = await requireUser();
    const insert: TablesInsert<"tasks"> = sanitizeTaskPayload({
      ...row,
      user_id: userId,
    });
    const { data, error } = await supabase
      .from("tasks")
      .insert(insert)
      .select("id")
      .single();
    if (error) throw error;
    revalidatePath("/");
    revalidatePath("/daily-plan");
    return { ok: true, id: data.id };
  } catch (e) {
    return { ok: false, error: formatSupabaseError(e) };
  }
}

export async function createTasksBulk(
  rows: Array<Omit<TablesInsert<"tasks">, "user_id">>,
): Promise<{ ok: true; ids: string[] } | { ok: false; error: string }> {
  try {
    if (rows.length === 0) return { ok: true, ids: [] };
    const { supabase, userId } = await requireUser();
    const payload = rows.map((row) => {
      // Strip client-supplied `id` so the DB always generates a new UUID.
      // Accepting caller-provided IDs risks overwriting another user's task
      // if a row with that UUID already exists and RLS ever has a regression.
      const { id: _stripped, ...rest } = row as TablesInsert<"tasks">;
      return sanitizeTaskPayload({
        ...rest,
        user_id: userId,
      } as TablesInsert<"tasks">);
    });
    const { data, error } = await supabase
      .from("tasks")
      .insert(payload)
      .select("id");
    if (error) throw error;
    revalidatePath("/");
    revalidatePath("/daily-plan");
    return { ok: true, ids: (data ?? []).map((r) => r.id) };
  } catch (e) {
    return { ok: false, error: formatSupabaseError(e) };
  }
}

export async function updateTask(
  id: string,
  patch: TablesUpdate<"tasks">,
): Promise<{ ok: true } | { ok: false; error: string }> {
  try {
    const { supabase, userId } = await requireUser();
    const { error } = await supabase
      .from("tasks")
      .update(sanitizeTaskPayload(patch))
      .eq("id", id)
      .eq("user_id", userId);
    if (error) throw error;
    revalidatePath("/");
    revalidatePath("/daily-plan");
    return { ok: true };
  } catch (e) {
    return { ok: false, error: formatSupabaseError(e) };
  }
}

export async function deleteTask(
  id: string,
): Promise<{ ok: true } | { ok: false; error: string }> {
  try {
    const { supabase, userId } = await requireUser();
    const { error } = await supabase
      .from("tasks")
      .delete()
      .eq("id", id)
      .eq("user_id", userId);
    if (error) throw error;
    revalidatePath("/");
    revalidatePath("/daily-plan");
    return { ok: true };
  } catch (e) {
    return { ok: false, error: formatSupabaseError(e) };
  }
}

export async function reallocateTask(
  id: string,
  newAssignedDate: string,
): Promise<{ ok: true } | { ok: false; error: string }> {
  return updateTask(id, { assigned_date: newAssignedDate });
}

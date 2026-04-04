"use server";

import { revalidatePath } from "next/cache";

import { formatSupabaseError } from "@/lib/supabase";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { TablesInsert, TablesUpdate } from "@/types/supabase";

/** Drop null time fields so PostgREST does not reference missing DB columns (optional `time` cols). */
function omitNullTaskTimes<T extends TablesInsert<"tasks"> | TablesUpdate<"tasks">>(
  row: T,
): T {
  const o = { ...row } as Record<string, unknown>;
  if (o.start_time == null) delete o.start_time;
  if (o.end_time == null) delete o.end_time;
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
    const insert: TablesInsert<"tasks"> = omitNullTaskTimes({
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
    revalidatePath("/plan");
    return { ok: true, id: data.id };
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
      .update(patch)
      .eq("id", id)
      .eq("user_id", userId);
    if (error) throw error;
    revalidatePath("/");
    revalidatePath("/plan");
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
    revalidatePath("/plan");
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

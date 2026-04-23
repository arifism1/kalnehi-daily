"use server";

import { revalidatePath } from "next/cache";

import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { Tables, TablesInsert } from "@/types/supabase";

export type DailyReflectionRow = Tables<"daily_reflections">;

export type UpsertReflectionInput = {
  reflectionDate: string;
  finishedToday?: string;
  skippedToday?: string;
  tomorrowPriority?: string;
};

export async function upsertDailyReflection(
  input: UpsertReflectionInput,
): Promise<{ ok: true; data: DailyReflectionRow } | { ok: false; error: string }> {
  try {
    const supabase = await createSupabaseServerClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return { ok: false, error: "Not authenticated." };

    const payload: TablesInsert<"daily_reflections"> = {
      user_id: user.id,
      reflection_date: input.reflectionDate,
      finished_today: input.finishedToday ?? null,
      skipped_today: input.skippedToday ?? null,
      tomorrow_priority: input.tomorrowPriority ?? null,
      updated_at: new Date().toISOString(),
    };

    const { data, error } = await supabase
      .from("daily_reflections")
      .upsert(payload, { onConflict: "user_id,reflection_date" })
      .select()
      .single();

    if (error) return { ok: false, error: error.message };

    revalidatePath("/daily-log");
    return { ok: true, data: data as DailyReflectionRow };
  } catch (err) {
    return { ok: false, error: String(err) };
  }
}

export async function getRecentReflections(
  limit = 7,
): Promise<{ ok: true; data: DailyReflectionRow[] } | { ok: false; error: string }> {
  try {
    const supabase = await createSupabaseServerClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return { ok: false, error: "Not authenticated." };

    const { data, error } = await supabase
      .from("daily_reflections")
      .select("*")
      .eq("user_id", user.id)
      .order("reflection_date", { ascending: false })
      .limit(limit);

    if (error) return { ok: false, error: error.message };
    return { ok: true, data: (data ?? []) as DailyReflectionRow[] };
  } catch (err) {
    return { ok: false, error: String(err) };
  }
}

export async function getTodayReflection(
  today: string,
): Promise<{ ok: true; data: DailyReflectionRow | null } | { ok: false; error: string }> {
  try {
    const supabase = await createSupabaseServerClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return { ok: false, error: "Not authenticated." };

    const { data, error } = await supabase
      .from("daily_reflections")
      .select("*")
      .eq("user_id", user.id)
      .eq("reflection_date", today)
      .maybeSingle();

    if (error) return { ok: false, error: error.message };
    return { ok: true, data: data as DailyReflectionRow | null };
  } catch (err) {
    return { ok: false, error: String(err) };
  }
}

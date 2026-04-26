"use server";

import { revalidatePath } from "next/cache";

import { formatSupabaseError } from "@/lib/supabase";
import { USER_ERROR } from "@/lib/userFacingErrors";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { Tables, TablesUpdate } from "@/types/supabase";

export type VoiceTimelineRow = Tables<"voice_timeline_entries">;

export async function listVoiceTimelineForDate(
  logDate: string,
): Promise<
  { ok: true; entries: VoiceTimelineRow[] } | { ok: false; error: string; entries: [] }
> {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(logDate)) {
    return { ok: false, error: "Invalid date.", entries: [] };
  }
  try {
    const supabase = await createSupabaseServerClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return { ok: false, error: USER_ERROR.session, entries: [] };
    }
    const { data, error } = await supabase
      .from("voice_timeline_entries")
      .select("*")
      .eq("user_id", user.id)
      .eq("log_date", logDate)
      .order("occurred_at", { ascending: false });
    if (error) throw error;
    return { ok: true, entries: (data ?? []) as VoiceTimelineRow[] };
  } catch (e) {
    return { ok: false, error: formatSupabaseError(e), entries: [] };
  }
}

export async function updateVoiceTimelineEntry(
  id: string,
  patch: Pick<
    TablesUpdate<"voice_timeline_entries">,
    | "title"
    | "description"
    | "category"
    | "subject"
    | "chapter"
    | "estimated_minutes"
  >,
): Promise<{ ok: true } | { ok: false; error: string }> {
  try {
    const supabase = await createSupabaseServerClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return { ok: false, error: USER_ERROR.session };
    const { error } = await supabase
      .from("voice_timeline_entries")
      .update({
        ...patch,
        updated_at: new Date().toISOString(),
      })
      .eq("id", id)
      .eq("user_id", user.id);
    if (error) throw error;
    revalidatePath("/dictate-day");
    revalidatePath("/daily-debrief");
    revalidatePath("/daily-log");
    return { ok: true };
  } catch (e) {
    return { ok: false, error: formatSupabaseError(e) };
  }
}

export async function deleteVoiceTimelineEntry(
  id: string,
): Promise<{ ok: true } | { ok: false; error: string }> {
  try {
    const supabase = await createSupabaseServerClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return { ok: false, error: USER_ERROR.session };
    const { error } = await supabase
      .from("voice_timeline_entries")
      .delete()
      .eq("id", id)
      .eq("user_id", user.id);
    if (error) throw error;
    revalidatePath("/dictate-day");
    revalidatePath("/daily-debrief");
    revalidatePath("/daily-log");
    return { ok: true };
  } catch (e) {
    return { ok: false, error: formatSupabaseError(e) };
  }
}

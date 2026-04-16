"use server";

import { revalidatePath } from "next/cache";

import { incrementPhotoScanUsage } from "@/actions/subscription";
import { formatSupabaseError } from "@/lib/supabase";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { TablesInsert } from "@/types/supabase";

async function requireUser() {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();
  if (error || !user) throw new Error("Unauthorized");
  return { supabase, userId: user.id };
}

/** Persists session metadata only—never video or image data. */
export async function createStudySession(
  row: Omit<TablesInsert<"study_sessions">, "user_id"> & { id: string },
): Promise<{ ok: true } | { ok: false; error: string }> {
  try {
    const { supabase, userId } = await requireUser();

    const { data: existing, error: exErr } = await supabase
      .from("study_sessions")
      .select("id")
      .eq("id", row.id)
      .eq("user_id", userId)
      .maybeSingle();
    if (exErr) throw exErr;
    if (existing) {
      return { ok: true };
    }

    if (row.is_camera_proven) {
      const usage = await incrementPhotoScanUsage();
      if (!usage.ok) {
        return { ok: false, error: usage.error };
      }
    }

    const { error } = await supabase.from("study_sessions").insert({
      id: row.id,
      user_id: userId,
      subject: row.subject,
      duration_seconds: row.duration_seconds,
      is_camera_proven: row.is_camera_proven,
      started_at: row.started_at,
      ended_at: row.ended_at,
    });
    if (error) {
      if (error.code === "23505") {
        return { ok: true };
      }
      throw error;
    }
    revalidatePath("/study-sessions");
    revalidatePath("/daily-log");
    revalidatePath("/progress");
    revalidatePath("/daily-plan");
    return { ok: true };
  } catch (e) {
    return { ok: false, error: formatSupabaseError(e) };
  }
}

export type StudySessionRemoteRow = {
  id: string;
  user_id: string;
  subject: string;
  duration_seconds: number;
  is_camera_proven: boolean;
  started_at: string;
  ended_at: string;
};

/**
 * Pull study_sessions for merge into IndexedDB (offline log parity).
 */
export async function fetchStudySessionsForLog(
  sinceIso: string,
  limit = 4000,
): Promise<
  { ok: true; rows: StudySessionRemoteRow[] } | { ok: false; error: string }
> {
  try {
    const { supabase, userId } = await requireUser();
    const { data, error } = await supabase
      .from("study_sessions")
      .select(
        "id,user_id,subject,duration_seconds,is_camera_proven,started_at,ended_at",
      )
      .eq("user_id", userId)
      .gte("ended_at", sinceIso)
      .order("ended_at", { ascending: false })
      .limit(limit);
    if (error) throw error;
    return { ok: true, rows: (data ?? []) as StudySessionRemoteRow[] };
  } catch (e) {
    return { ok: false, error: formatSupabaseError(e) };
  }
}

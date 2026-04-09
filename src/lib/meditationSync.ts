"use client";

import {
  bumpMeditationOutboxFail,
  deleteMeditationOutbox,
  getMeditationOutbox,
  getMeditationSessions,
  saveMeditationSessions,
} from "@/lib/meditationLocal";
import type { MeditationSessionRow } from "@/lib/meditationTypes";
import { getSupabaseBrowserClient } from "@/lib/supabase";

let flushing = false;
const MAX_FAILS = 12;

export async function refreshMeditationFromServer(userId: string): Promise<void> {
  const supabase = getSupabaseBrowserClient();
  const { data, error } = await supabase
    .from("user_meditation_sessions")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(3000);
  if (error) return;
  await saveMeditationSessions(userId, (data ?? []) as MeditationSessionRow[]);
}

export async function flushMeditationOutbox(userId: string | undefined): Promise<void> {
  if (!userId || flushing || typeof window === "undefined") return;
  flushing = true;
  try {
    const supabase = getSupabaseBrowserClient();
    const queue = await getMeditationOutbox(userId);
    for (const entry of queue) {
      if ((entry.failCount ?? 0) >= MAX_FAILS) {
        await deleteMeditationOutbox(entry.id);
        continue;
      }
      const row = entry.op.row;
      const { error } = await supabase.from("user_meditation_sessions").insert({
        id: row.id,
        user_id: row.user_id,
        session_date: row.session_date,
        meditation_type: row.meditation_type,
        duration_seconds: row.duration_seconds,
        note: row.note,
        soundscape: row.soundscape,
        guided: row.guided,
        created_at: row.created_at,
        updated_at: row.updated_at,
      });
      if (!error || error.code === "23505") {
        await deleteMeditationOutbox(entry.id);
      } else {
        await bumpMeditationOutboxFail(entry.id);
      }
    }
    const remaining = await getMeditationOutbox(userId);
    if (remaining.length === 0) {
      await refreshMeditationFromServer(userId);
    } else {
      const local = await getMeditationSessions(userId);
      await saveMeditationSessions(userId, local);
    }
  } finally {
    flushing = false;
  }
}

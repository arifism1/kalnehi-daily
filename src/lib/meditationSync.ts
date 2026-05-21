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
    .from("meditation_sessions")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(3000);
  if (error) return;
  const local = await getMeditationSessions(userId);
  const merged = new Map<string, MeditationSessionRow>();
  for (const row of local) {
    merged.set(row.id, row);
  }
  for (const row of (data ?? []) as MeditationSessionRow[]) {
    const prev = merged.get(row.id);
    if (!prev) {
      merged.set(row.id, row);
      continue;
    }
    // Prefer whichever copy looks newer; keep local-safe fallback.
    if (String(row.created_at) >= String(prev.created_at)) {
      merged.set(row.id, { ...prev, ...row });
    }
  }
  await saveMeditationSessions(
    userId,
    Array.from(merged.values()).sort((a, b) => b.created_at.localeCompare(a.created_at)),
  );
}

export async function flushMeditationOutbox(userId: string | undefined): Promise<void> {
  if (!userId || flushing || typeof window === "undefined") return;
  flushing = true;
  try {
    const supabase = getSupabaseBrowserClient();
    const queue = await getMeditationOutbox(userId);
    for (const entry of queue) {
      if ((entry.failCount ?? 0) >= MAX_FAILS) {
        // react-doctor-disable-next-line react-doctor/async-await-in-loop -- outbox must be processed sequentially to preserve mutation order
        await deleteMeditationOutbox(entry.id);
        continue;
      }
      let error: { code?: string } | null = null;
      if (entry.op.kind === "session_create") {
        const row = entry.op.row;
        // react-doctor-disable-next-line react-doctor/async-await-in-loop -- outbox must be processed sequentially to preserve mutation order
        const res = await supabase.from("meditation_sessions").insert({
          id: row.id,
          user_id: row.user_id,
          date: row.date,
          duration_minutes: row.duration_minutes,
          session_type: row.session_type,
          notes: row.notes,
          guided: row.guided,
          soundscape: row.soundscape,
          created_at: row.created_at,
        });
        error = res.error;
      } else if (entry.op.kind === "session_note_update") {
        // react-doctor-disable-next-line react-doctor/async-await-in-loop -- outbox must be processed sequentially to preserve mutation order
        const res = await supabase
          .from("meditation_sessions")
          .update({
            notes: entry.op.note,
          })
          .eq("id", entry.op.sessionId)
          .eq("user_id", userId);
        error = res.error;
      }
      if (!error || error.code === "23505") {
        // react-doctor-disable-next-line react-doctor/async-await-in-loop -- outbox must be processed sequentially to preserve mutation order
        await deleteMeditationOutbox(entry.id);
      } else {
        // react-doctor-disable-next-line react-doctor/async-await-in-loop -- outbox must be processed sequentially to preserve mutation order
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

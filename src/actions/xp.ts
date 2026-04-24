"use server";

import { createSupabaseServerClient } from "@/lib/supabase/server";
import { levelFromTotalXp, type XpEventType, XP_REWARDS } from "@/lib/xpMath";
import { revalidatePath } from "next/cache";

export type RecordXpResult =
  | { ok: true; awarded: number; newTotalXp: number; newLevel: number; duplicate?: boolean }
  | { ok: false; error: string };

/**
 * Idempotent XP award: same (event_type, ref_id) only counts once.
 */
export async function recordXpEvent(
  eventType: XpEventType,
  refId: string,
  pathsToRevalidate: string[] = ["/home", "/profile"],
): Promise<RecordXpResult> {
  const xpAwarded = XP_REWARDS[eventType];
  if (xpAwarded == null) {
    return { ok: false, error: "Unknown event type." };
  }

  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Not signed in." };

  const safeRef = refId.replace(/\s+/g, "").slice(0, 200) || "default";

  const { data: insertRow, error: insertError } = await supabase
    .from("xp_events")
    .insert({
      user_id: user.id,
      event_type: eventType,
      ref_id: safeRef,
      xp_awarded: xpAwarded,
    })
    .select("id")
    .maybeSingle();

  if (insertError) {
    const code = (insertError as { code?: string }).code;
    if (code === "23505") {
      return fetchCurrentXp(supabase, user.id, true);
    }
    return { ok: false, error: insertError.message };
  }
  if (!insertRow) {
    return fetchCurrentXp(supabase, user.id, true);
  }

  const { data: prof, error: profErr } = await supabase
    .from("user_profiles")
    .select("id, xp")
    .eq("user_id", user.id)
    .maybeSingle();

  if (profErr || !prof?.id) {
    return { ok: false, error: profErr?.message ?? "Profile not found." };
  }

  const currentXp = typeof prof.xp === "number" ? prof.xp : 0;
  const newTotalXp = currentXp + xpAwarded;
  const newLevel = levelFromTotalXp(newTotalXp);

  const { error: upErr } = await supabase
    .from("user_profiles")
    .update({
      xp: newTotalXp,
      level: newLevel,
      updated_at: new Date().toISOString(),
    })
    .eq("id", prof.id);

  if (upErr) {
    return { ok: false, error: upErr.message };
  }

  for (const p of pathsToRevalidate) {
    revalidatePath(p);
  }

  return { ok: true, awarded: xpAwarded, newTotalXp, newLevel };
}

async function fetchCurrentXp(
  supabase: Awaited<ReturnType<typeof createSupabaseServerClient>>,
  userId: string,
  duplicate: boolean,
): Promise<RecordXpResult> {
  const { data: prof, error: profErr } = await supabase
    .from("user_profiles")
    .select("xp, level")
    .eq("user_id", userId)
    .maybeSingle();
  if (profErr) return { ok: false, error: profErr.message };
  const xp = typeof prof?.xp === "number" ? prof.xp : 0;
  const lv = typeof prof?.level === "number" ? prof.level : levelFromTotalXp(xp);
  return { ok: true, awarded: 0, newTotalXp: xp, newLevel: lv, duplicate };
}

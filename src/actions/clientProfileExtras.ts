"use server";

import type { Json } from "@/types/supabase";
import { formatSupabaseError } from "@/lib/supabase";
import { USER_ERROR } from "@/lib/userFacingErrors";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export type ClientExtrasResult = { ok: true } | { ok: false; error: string };

export async function updateUserUiPrefs(prefs: Json): Promise<ClientExtrasResult> {
  try {
    const supabase = await createSupabaseServerClient();
    const {
      data: { user },
      error: authErr,
    } = await supabase.auth.getUser();
    if (authErr || !user) return { ok: false, error: USER_ERROR.session };

    const { error } = await supabase
      .from("user_profiles")
      .update({
        ui_prefs: prefs,
        updated_at: new Date().toISOString(),
      })
      .eq("user_id", user.id);
    if (error) return { ok: false, error: formatSupabaseError(error) };
    return { ok: true };
  } catch (e) {
    return { ok: false, error: formatSupabaseError(e) };
  }
}

/** Stores first-touch payload once per account (null/empty safe). */
export async function saveSignupAttributionOnce(
  payload: Json,
): Promise<ClientExtrasResult> {
  try {
    const supabase = await createSupabaseServerClient();
    const {
      data: { user },
      error: authErr,
    } = await supabase.auth.getUser();
    if (authErr || !user) return { ok: false, error: USER_ERROR.session };

    const { data: row, error: selErr } = await supabase
      .from("user_profiles")
      .select("signup_attribution")
      .eq("user_id", user.id)
      .maybeSingle();
    if (selErr) return { ok: false, error: formatSupabaseError(selErr) };
    if (row?.signup_attribution != null) return { ok: true };

    const { error } = await supabase
      .from("user_profiles")
      .update({
        signup_attribution: payload,
        updated_at: new Date().toISOString(),
      })
      .eq("user_id", user.id);
    if (error) return { ok: false, error: formatSupabaseError(error) };
    return { ok: true };
  } catch (e) {
    return { ok: false, error: formatSupabaseError(e) };
  }
}

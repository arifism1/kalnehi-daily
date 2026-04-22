"use server";

import { createSupabaseServerClient } from "@/lib/supabase/server";

async function requireUser() {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();
  if (error || !user) throw new Error("Unauthorized");
  return { supabase, userId: user.id };
}

/** Returns the number of AI Study Partner seconds remaining for the current user. */
export async function getAiStudyPartnerBalance(): Promise<number> {
  const { supabase, userId } = await requireUser();

  const { data, error } = await supabase
    .from("user_profiles")
    .select("ai_study_partner_seconds_remaining")
    .eq("user_id", userId)
    .maybeSingle();

  if (error || !data) return 0;
  return data.ai_study_partner_seconds_remaining ?? 0;
}

/**
 * Deducts `seconds` from the current user's AI Study Partner balance.
 * Uses the `deduct_ai_study_partner_seconds` RPC (SECURITY DEFINER, floor 0).
 */
export async function deductAiStudyPartnerTime(
  seconds: number,
): Promise<{ ok: true } | { ok: false; error: string }> {
  if (seconds <= 0) return { ok: true };

  const { supabase, userId } = await requireUser();

  const { error } = await supabase.rpc("deduct_ai_study_partner_seconds", {
    p_user_id: userId,
    p_seconds: Math.round(seconds),
  });

  if (error) {
    console.error("[aiStudyPartner] deductAiStudyPartnerTime error", error);
    return { ok: false, error: "Unable to deduct AI Study Partner credits." };
  }

  return { ok: true };
}

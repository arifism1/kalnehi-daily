"use server";

import { createClient } from "@supabase/supabase-js";

import type { Database } from "@/types/supabase";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import {
  createReferralCode,
  getReferralSnapshot,
  toggleReferralCodeActive,
} from "@/lib/admin/queries/referralQueries";
import { isAdminUser } from "@/lib/waitlist/batchEngine";

// ── Helpers ───────────────────────────────────────────────────────────────

function getAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();
  if (!url || !key) return null;
  return createClient<Database>(url, key, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

async function getAuthedUserId() {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();
  if (error || !user) return null;
  return user.id;
}

// ── Public actions (called from auth page after signup) ───────────────────

export type AttachReferralResult =
  | { ok: true; validCode: boolean }
  | { ok: false; error: string };

/**
 * Attaches a referral code to the signed-in user's profile.
 * Called client-side immediately after a successful signup.
 * Silently succeeds even if the code is invalid — we always store the source.
 */
export async function attachReferralToUser(params: {
  ref: string;
  utmSource?: string | null;
  utmMedium?: string | null;
  utmCampaign?: string | null;
  refUrl?: string | null;
}): Promise<AttachReferralResult> {
  const userId = await getAuthedUserId();
  if (!userId) return { ok: false, error: "Not signed in." };

  const admin = getAdminClient();
  if (!admin) return { ok: false, error: "Service unavailable." };

  const { data, error } = await admin.rpc("attach_referral_to_user" as never, {
    p_user_id: userId,
    p_code: params.ref,
    p_utm_source: params.utmSource ?? null,
    p_utm_medium: params.utmMedium ?? null,
    p_utm_campaign: params.utmCampaign ?? null,
    p_ref_url: params.refUrl ?? null,
  } as never);

  if (error) {
    console.warn("[attachReferralToUser] RPC error:", error.message);
    return { ok: false, error: "Could not save referral." };
  }

  const result = data as { ok: boolean; valid_code?: boolean } | null;
  return { ok: true, validCode: result?.valid_code ?? false };
}

/**
 * Non-blocking helper: logs a trial_started referral event if the user has
 * a referral_source set. Called from ensureFreeTrialStarted — never awaited.
 */
export async function logReferralTrialStarted(userId: string): Promise<void> {
  const admin = getAdminClient();
  if (!admin) return;

  const { data: profile } = await admin
    .from("user_profiles")
    .select("referral_source" as "user_id")
    .eq("user_id", userId)
    .maybeSingle();

  const code = (profile as { referral_source?: string | null } | null)?.referral_source;
  if (!code) return;

  await admin
    .from("referral_events" as never)
    .insert({
      code,
      user_id: userId,
      session_id: null,
      event_type: "trial_started",
      metadata: {},
    } as never)
    .then(({ error }: { error: { message: string } | null }) => {
      if (error) console.warn("[logReferralTrialStarted] insert error:", error.message);
    });
}

// ── Admin actions ─────────────────────────────────────────────────────────

async function assertAdmin(): Promise<boolean> {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return false;
  return isAdminUser(user.id, user.email ?? undefined);
}

export async function getAdminReferralStats() {
  if (!(await assertAdmin())) return null;
  return getReferralSnapshot();
}

export async function adminToggleReferralCode(
  id: string,
  isActive: boolean,
): Promise<{ ok: boolean }> {
  if (!(await assertAdmin())) return { ok: false };
  return toggleReferralCodeActive(id, isActive);
}

export async function adminCreateReferralCode(params: {
  code: string;
  description: string;
  campaign: string;
}): Promise<{ ok: boolean; error?: string }> {
  if (!(await assertAdmin())) return { ok: false, error: "Unauthorized." };
  return createReferralCode(params);
}

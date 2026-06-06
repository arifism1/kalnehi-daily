import crypto from "node:crypto";

import {
  DPDP_PURPOSE_VERSION,
  DPDP_SIGNUP_PROCESSORS,
  DPDP_SIGNUP_PURPOSES,
} from "@/lib/dpdp/constants";
import { getSupabaseServiceRoleClient } from "@/lib/supabase/serviceRoleClient";

export type DpdpConsentMethod = "email_otp" | "google_oauth";

function hashIp(ip: string | null | undefined): string | null {
  const trimmed = ip?.trim();
  if (!trimmed || trimmed === "unknown") return null;
  return crypto.createHash("sha256").update(trimmed).digest("hex");
}

export async function recordDpdpSignupConsent(opts: {
  userId: string;
  method: DpdpConsentMethod;
  ip?: string | null;
}): Promise<{ ok: true } | { ok: false; error: string }> {
  const svc = getSupabaseServiceRoleClient();
  if (!svc) {
    return { ok: false, error: "Service unavailable." };
  }

  const { data: existing, error: selErr } = await svc
    .from("dpdp_consent_records")
    .select("id")
    .eq("user_id", opts.userId)
    .is("withdrawn_at", null)
    .maybeSingle();

  if (selErr) {
    console.error("[recordDpdpSignupConsent] select failed:", selErr.message);
    return { ok: false, error: "Could not record consent." };
  }
  if (existing) {
    return { ok: true };
  }

  const { error: insErr } = await svc.from("dpdp_consent_records").insert({
    user_id: opts.userId,
    purpose_version: DPDP_PURPOSE_VERSION,
    method: opts.method,
    ip_hash: hashIp(opts.ip),
    raw_purposes: {
      purposes: [...DPDP_SIGNUP_PURPOSES],
      processors: [...DPDP_SIGNUP_PROCESSORS],
    },
  });

  if (insErr) {
    console.error("[recordDpdpSignupConsent] insert failed:", insErr.message);
    return { ok: false, error: "Could not record consent." };
  }

  return { ok: true };
}

export async function withdrawDpdpConsent(userId: string): Promise<
  { ok: true } | { ok: false; error: string }
> {
  const svc = getSupabaseServiceRoleClient();
  if (!svc) {
    return { ok: false, error: "Service unavailable." };
  }

  const now = new Date().toISOString();

  const { data, error } = await svc
    .from("dpdp_consent_records")
    .update({ withdrawn_at: now })
    .eq("user_id", userId)
    .is("withdrawn_at", null)
    .select("id")
    .maybeSingle();

  if (error) {
    console.error("[withdrawDpdpConsent] update failed:", error.message);
    return { ok: false, error: "Could not withdraw consent." };
  }
  if (!data) {
    return { ok: false, error: "No active consent record found." };
  }

  return { ok: true };
}

function clientIpFromHeaders(headers: Headers): string {
  const xf = headers.get("x-forwarded-for");
  if (xf) {
    const first = xf.split(",")[0]?.trim();
    if (first) return first;
  }
  return headers.get("x-real-ip")?.trim() || "unknown";
}

export function clientIpFromRequest(req: Request): string {
  return clientIpFromHeaders(req.headers);
}

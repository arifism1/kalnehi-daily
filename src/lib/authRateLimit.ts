import { createHash } from "node:crypto";

import type { SupabaseClient } from "@supabase/supabase-js";

import type { Database } from "@/types/supabase";

export type AuthRateLimitStepResult = {
  allowed?: boolean;
  retry_after_minutes?: number;
  blocked?: boolean;
  ok?: boolean;
  error?: string;
};

/**
 * Extracts the client IP from request headers.
 *
 * Trusts `x-forwarded-for` / `x-real-ip` as set by the platform (Vercel).
 * On Vercel these headers are injected by the infrastructure and attacker-supplied
 * values are stripped, so spoofing is not possible in production. In self-hosted or
 * local-dev environments this assumption does NOT hold — but the Postgres
 * `auth_rate_limit_step` RPC is the authoritative gate regardless, using the IP only
 * as a bucket key. Even a spoofed IP merely targets a different (or attacker-chosen)
 * bucket; it cannot escalate privileges or bypass the actual auth check.
 */
export function getClientIpFromRequest(request: Request): string {
  const xf = request.headers.get("x-forwarded-for");
  if (xf) {
    const first = xf.split(",")[0]?.trim();
    if (first) return first.slice(0, 128);
  }
  const real = request.headers.get("x-real-ip")?.trim();
  if (real) return real.slice(0, 128);
  return "0.0.0.0";
}

export function loginBucketKey(ip: string): string {
  return `ip:${ip.trim()}`;
}

export function signupBucketKey(ip: string): string {
  return `ip:${ip.trim()}`;
}

/** Deterministic bucket for OTP / magic-link verify attempts (email + IP). */
export function otpVerifyBucketKey(ip: string, email: string): string {
  const n = email.trim().toLowerCase();
  const h = createHash("sha256").update(`${n}|${ip.trim()}`, "utf8").digest("hex");
  return `otp:sha256:${h}`;
}

export function formatTooManyAttemptsMessage(retryAfterMinutes: number): string {
  const m = Math.max(1, Math.ceil(retryAfterMinutes));
  return `Too many attempts. Please try again after ${m} minute${m === 1 ? "" : "s"}.`;
}

function asResult(data: unknown): AuthRateLimitStepResult {
  return data && typeof data === "object" ? (data as AuthRateLimitStepResult) : {};
}

export async function authRateLimitStep(
  svc: SupabaseClient<Database>,
  args: {
    p_action_type:
      | "login"
      | "signup"
      | "password_reset_email"
      | "password_reset_ip"
      | "otp_verify";
    p_bucket_key: string;
    p_step: "check" | "record_failure" | "record_success" | "record_attempt";
  },
): Promise<AuthRateLimitStepResult> {
  const { data, error } = await svc.rpc("auth_rate_limit_step", {
    p_action_type: args.p_action_type,
    p_bucket_key: args.p_bucket_key,
    p_step: args.p_step,
  });
  if (error) {
    return { allowed: false, error: error.message };
  }
  return asResult(data);
}

export async function authRateLimitPasswordReset(
  svc: SupabaseClient<Database>,
  args: { p_step: "check" | "record_attempt"; p_ip: string; p_email: string },
): Promise<AuthRateLimitStepResult> {
  const { data, error } = await svc.rpc("auth_rate_limit_password_reset", {
    p_step: args.p_step,
    p_ip: args.p_ip,
    p_email: args.p_email,
  });
  if (error) {
    return { allowed: false, error: error.message };
  }
  return asResult(data);
}

export function isRateLimited(r: AuthRateLimitStepResult): boolean {
  if (r.error && r.allowed !== true) return true;
  return r.allowed === false;
}

export function retryMinutesFromResult(r: AuthRateLimitStepResult): number {
  const m = r.retry_after_minutes;
  if (typeof m === "number" && Number.isFinite(m)) return m;
  return 15;
}

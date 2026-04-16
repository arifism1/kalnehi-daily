import { type NextRequest, NextResponse } from "next/server";

import {
  authRateLimitStep,
  formatTooManyAttemptsMessage,
  getClientIpFromRequest,
  otpVerifyBucketKey,
  retryMinutesFromResult,
} from "@/lib/authRateLimit";
import { formatSupabaseError } from "@/lib/supabase";
import { createSupabaseRouteHandlerClient } from "@/lib/supabase/routeHandler";
import { getSupabaseServiceRoleClient } from "@/lib/supabase/serviceRoleClient";

type EmailOtpType =
  | "signup"
  | "invite"
  | "magiclink"
  | "recovery"
  | "email_change"
  | "email";

const OTP_TYPES = new Set<EmailOtpType>([
  "signup",
  "invite",
  "magiclink",
  "recovery",
  "email_change",
  "email",
]);

export async function POST(request: NextRequest) {
  const svc = getSupabaseServiceRoleClient();
  if (!svc) {
    return NextResponse.json(
      {
        error: "Authentication is temporarily unavailable.",
        code: "misconfigured",
      },
      { status: 503 },
    );
  }

  const ip = getClientIpFromRequest(request);
  let body: { email?: string; token?: string; type?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request.", code: "bad_request" }, { status: 400 });
  }

  const email = typeof body.email === "string" ? body.email.trim() : "";
  const token = typeof body.token === "string" ? body.token.trim() : "";
  const rawType = typeof body.type === "string" ? body.type.trim() : "";
  if (!email || !token || !rawType) {
    return NextResponse.json(
      { error: "Email, token, and type are required.", code: "validation" },
      { status: 400 },
    );
  }

  if (!OTP_TYPES.has(rawType as EmailOtpType)) {
    return NextResponse.json({ error: "Unsupported OTP type.", code: "validation" }, { status: 400 });
  }
  const type = rawType as EmailOtpType;

  const bucket = otpVerifyBucketKey(ip, email);
  const check = await authRateLimitStep(svc, {
    p_action_type: "otp_verify",
    p_bucket_key: bucket,
    p_step: "check",
  });
  if (check.error) {
    return NextResponse.json(
      { error: "Could not verify OTP limits. Try again shortly.", code: "rate_limit_error" },
      { status: 503 },
    );
  }
  if (check.allowed === false) {
    const m = retryMinutesFromResult(check);
    return NextResponse.json(
      {
        error: formatTooManyAttemptsMessage(m),
        code: "rate_limited",
        retryAfterMinutes: m,
      },
      { status: 429 },
    );
  }

  const res = NextResponse.json({ ok: true });
  const supabase = createSupabaseRouteHandlerClient(request, res);
  const { error: verifyErr } = await supabase.auth.verifyOtp({
    email,
    token,
    type,
  });

  if (!verifyErr) {
    await authRateLimitStep(svc, {
      p_action_type: "otp_verify",
      p_bucket_key: bucket,
      p_step: "record_success",
    });
    return res;
  }

  const afterFail = await authRateLimitStep(svc, {
    p_action_type: "otp_verify",
    p_bucket_key: bucket,
    p_step: "record_failure",
  });
  if (afterFail.allowed === false && afterFail.retry_after_minutes != null) {
    const m = retryMinutesFromResult(afterFail);
    return NextResponse.json(
      {
        error: formatTooManyAttemptsMessage(m),
        code: "rate_limited",
        retryAfterMinutes: m,
      },
      { status: 429 },
    );
  }

  return NextResponse.json(
    { error: formatSupabaseError(verifyErr), code: "auth_error" },
    { status: 401 },
  );
}

import { type NextRequest, NextResponse } from "next/server";

import {
  authRateLimitPasswordReset,
  formatTooManyAttemptsMessage,
  getClientIpFromRequest,
  retryMinutesFromResult,
} from "@/lib/authRateLimit";
import { assertSameOrigin } from "@/lib/assertSameOrigin";
import { formatSupabaseError } from "@/lib/supabase";
import { createSupabaseRouteHandlerClient } from "@/lib/supabase/routeHandler";
import { getSupabaseServiceRoleClient } from "@/lib/supabase/serviceRoleClient";

export async function POST(request: NextRequest) {
  const denied = assertSameOrigin(request);
  if (denied) return denied;
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
  let body: { email?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request.", code: "bad_request" }, { status: 400 });
  }

  const email = typeof body.email === "string" ? body.email.trim() : "";
  if (!email) {
    return NextResponse.json(
      { error: "Enter your email address.", code: "validation" },
      { status: 400 },
    );
  }

  const check = await authRateLimitPasswordReset(svc, {
    p_step: "check",
    p_ip: ip,
    p_email: email,
  });
  if (check.error && check.error !== "invalid email" && check.error !== "invalid ip") {
    return NextResponse.json(
      { error: "Could not verify sign-in limits. Try again shortly.", code: "rate_limit_error" },
      { status: 503 },
    );
  }
  if (check.allowed === false) {
    if (check.error === "invalid email" || check.error === "invalid ip") {
      return NextResponse.json(
        { error: "Invalid request.", code: "invalid_input" },
        { status: 400 },
      );
    }
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

  const consume = await authRateLimitPasswordReset(svc, {
    p_step: "record_attempt",
    p_ip: ip,
    p_email: email,
  });
  if (consume.error) {
    return NextResponse.json(
      { error: "Could not verify sign-in limits. Try again shortly.", code: "rate_limit_error" },
      { status: 503 },
    );
  }
  if (consume.allowed === false) {
    const m = retryMinutesFromResult(consume);
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
  const { error: otpErr } = await supabase.auth.signInWithOtp({
    email,
    options: { shouldCreateUser: true },
  });

  if (!otpErr) {
    return res;
  }

  return NextResponse.json(
    { error: formatSupabaseError(otpErr), code: "auth_error" },
    { status: 400 },
  );
}

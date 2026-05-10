import { type NextRequest, NextResponse } from "next/server";

import {
  authRateLimitStep,
  formatTooManyAttemptsMessage,
  getClientIpFromRequest,
  isRateLimited,
  loginBucketKey,
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
  let body: { email?: string; password?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request.", code: "bad_request" }, { status: 400 });
  }

  const email = typeof body.email === "string" ? body.email.trim() : "";
  const password = typeof body.password === "string" ? body.password : "";
  if (!email || !password) {
    return NextResponse.json(
      { error: "Enter email and password.", code: "validation" },
      { status: 400 },
    );
  }
  if (password.length < 6) {
    return NextResponse.json(
      { error: "Password must be at least 6 characters.", code: "validation" },
      { status: 400 },
    );
  }

  const bucket = loginBucketKey(ip);
  const check = await authRateLimitStep(svc, {
    p_action_type: "login",
    p_bucket_key: bucket,
    p_step: "check",
  });
  if (check.error) {
    return NextResponse.json(
      { error: "Could not verify sign-in limits. Try again shortly.", code: "rate_limit_error" },
      { status: 503 },
    );
  }
  if (isRateLimited(check)) {
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
  const { error: authErr } = await supabase.auth.signInWithPassword({ email, password });

  if (!authErr) {
    await authRateLimitStep(svc, {
      p_action_type: "login",
      p_bucket_key: bucket,
      p_step: "record_success",
    });
    return res;
  }

  const afterFail = await authRateLimitStep(svc, {
    p_action_type: "login",
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
    { error: formatSupabaseError(authErr), code: "auth_error" },
    { status: 401 },
  );
}

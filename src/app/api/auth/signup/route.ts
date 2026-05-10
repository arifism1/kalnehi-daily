import { type NextRequest, NextResponse } from "next/server";

import {
  authRateLimitStep,
  formatTooManyAttemptsMessage,
  getClientIpFromRequest,
  retryMinutesFromResult,
  signupBucketKey,
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

  const bucket = signupBucketKey(ip);
  const consume = await authRateLimitStep(svc, {
    p_action_type: "signup",
    p_bucket_key: bucket,
    p_step: "record_attempt",
  });
  if (consume.error) {
    return NextResponse.json(
      { error: "Could not verify sign-up limits. Try again shortly.", code: "rate_limit_error" },
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
  const { error: signErr } = await supabase.auth.signUp({ email, password });

  if (!signErr) {
    return res;
  }

  return NextResponse.json(
    { error: formatSupabaseError(signErr), code: "auth_error" },
    { status: 400 },
  );
}

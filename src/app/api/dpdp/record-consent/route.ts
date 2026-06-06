import { NextResponse } from "next/server";

import { clientIpFromRequest, recordDpdpSignupConsent } from "@/lib/dpdp/consent";
import { verifySignupAttestation } from "@/lib/dpdp/signupConsentAttestation";
import { assertSameOrigin } from "@/lib/assertSameOrigin";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

type Body = { method?: string };

export async function POST(req: Request) {
  const denied = assertSameOrigin(req);
  if (denied) return denied;

  let body: Body;
  try {
    body = (await req.json()) as Body;
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid JSON." }, { status: 400 });
  }

  const method = (body.method ?? "").trim();
  if (method !== "email_otp" && method !== "google_oauth") {
    return NextResponse.json({ ok: false, error: "Invalid consent method." }, { status: 400 });
  }

  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ ok: false, error: "Unauthorized." }, { status: 401 });
  }

  if (
    !verifySignupAttestation(req, {
      method,
      email: method === "email_otp" ? (user.email ?? undefined) : undefined,
    })
  ) {
    return NextResponse.json(
      { ok: false, error: "Signup consent attestation missing or expired." },
      { status: 403 },
    );
  }

  const result = await recordDpdpSignupConsent({
    userId: user.id,
    method,
    ip: clientIpFromRequest(req),
  });

  if (!result.ok) {
    return NextResponse.json(result, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}

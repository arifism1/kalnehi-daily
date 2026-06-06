import { type NextRequest, NextResponse } from "next/server";

import {
  createSignupAttestationValue,
  setSignupAttestationCookie,
} from "@/lib/dpdp/signupConsentAttestation";
import { assertSameOrigin } from "@/lib/assertSameOrigin";

export const runtime = "nodejs";

type Body = {
  ageConfirmed?: boolean;
  dpdpAgreed?: boolean;
  method?: string;
  email?: string;
};

export async function POST(req: NextRequest) {
  const denied = assertSameOrigin(req);
  if (denied) return denied;

  let body: Body;
  try {
    body = (await req.json()) as Body;
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid JSON." }, { status: 400 });
  }

  if (body.ageConfirmed !== true || body.dpdpAgreed !== true) {
    return NextResponse.json(
      { ok: false, error: "Age confirmation and DPDP consent are required." },
      { status: 400 },
    );
  }

  const method = (body.method ?? "").trim();
  if (method !== "email_otp" && method !== "google_oauth") {
    return NextResponse.json({ ok: false, error: "Invalid consent method." }, { status: 400 });
  }

  const email = typeof body.email === "string" ? body.email.trim() : "";
  if (method === "email_otp" && !email) {
    return NextResponse.json({ ok: false, error: "Email is required." }, { status: 400 });
  }

  const value = createSignupAttestationValue({
    method,
    email: method === "email_otp" ? email : null,
  });
  if (!value) {
    return NextResponse.json({ ok: false, error: "Service unavailable." }, { status: 503 });
  }

  const res = NextResponse.json({ ok: true });
  setSignupAttestationCookie(res, value);
  return res;
}

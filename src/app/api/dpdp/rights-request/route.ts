import { NextResponse } from "next/server";

import { assertSameOrigin } from "@/lib/assertSameOrigin";
import {
  DPDP_RIGHTS_REQUEST_TYPES,
  type DpdpRightsRequestType,
} from "@/lib/dpdp/constants";
import { createRightsRequest } from "@/lib/dpdp/rightsRequest";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/u;
const MAX_NOTES = 4000;
const MAX_NAME = 120;

type Body = {
  type?: string;
  correctionDetails?: string;
  nomineeName?: string;
  nomineeEmail?: string;
  notes?: string;
};

export async function POST(req: Request) {
  const denied = assertSameOrigin(req);
  if (denied) return denied;

  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user?.email) {
    return NextResponse.json({ ok: false, error: "Sign in required." }, { status: 401 });
  }

  let body: Body;
  try {
    body = (await req.json()) as Body;
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid JSON." }, { status: 400 });
  }

  const typeRaw = (body.type ?? "").trim() as DpdpRightsRequestType;
  if (!DPDP_RIGHTS_REQUEST_TYPES.includes(typeRaw)) {
    return NextResponse.json({ ok: false, error: "Invalid request type." }, { status: 400 });
  }

  const requestDetails: Record<string, unknown> = {};
  const notes = (body.notes ?? "").trim().slice(0, MAX_NOTES);
  if (notes) requestDetails.notes = notes;

  if (typeRaw === "correction") {
    const correctionDetails = (body.correctionDetails ?? "").trim().slice(0, MAX_NOTES);
    if (correctionDetails.length < 10) {
      return NextResponse.json(
        { ok: false, error: "Describe what data needs correction (at least 10 characters)." },
        { status: 400 },
      );
    }
    requestDetails.correctionDetails = correctionDetails;
  }

  if (typeRaw === "nomination") {
    const nomineeName = (body.nomineeName ?? "").trim().slice(0, MAX_NAME);
    const nomineeEmail = (body.nomineeEmail ?? "").trim().toLowerCase().slice(0, 320);
    if (!nomineeName) {
      return NextResponse.json({ ok: false, error: "Nominee name is required." }, { status: 400 });
    }
    if (!nomineeEmail || !EMAIL_RE.test(nomineeEmail)) {
      return NextResponse.json(
        { ok: false, error: "A valid nominee email is required." },
        { status: 400 },
      );
    }
    requestDetails.nomineeName = nomineeName;
    requestDetails.nomineeEmail = nomineeEmail;
  }

  const result = await createRightsRequest({
    userId: user.id,
    userEmail: user.email,
    type: typeRaw,
    requestDetails,
  });

  if (!result.ok) {
    return NextResponse.json(result, { status: 500 });
  }

  return NextResponse.json({
    ok: true,
    referenceId: result.referenceId,
    dueAt: result.dueAt,
  });
}

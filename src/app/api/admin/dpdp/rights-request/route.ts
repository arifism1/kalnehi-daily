import { type NextRequest, NextResponse } from "next/server";

import { assertSameOrigin } from "@/lib/assertSameOrigin";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getSupabaseServiceRoleClient } from "@/lib/supabase/serviceRoleClient";
import { isAdminUser } from "@/lib/waitlist/batchEngine";

export const runtime = "nodejs";

type PatchBody = {
  id?: string;
  status?: string;
  notes?: string;
};

const VALID_STATUSES = new Set(["in_progress", "resolved", "rejected"]);

export async function PATCH(req: NextRequest) {
  const denied = assertSameOrigin(req);
  if (denied) return denied;

  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ ok: false, error: "Unauthorized." }, { status: 401 });
  }
  if (!(await isAdminUser(user.id, user.email ?? undefined))) {
    return NextResponse.json({ ok: false, error: "Forbidden." }, { status: 403 });
  }

  const admin = getSupabaseServiceRoleClient();
  if (!admin) {
    return NextResponse.json({ ok: false, error: "Service unavailable." }, { status: 503 });
  }

  let body: PatchBody;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid JSON." }, { status: 400 });
  }

  const id = (body.id ?? "").trim();
  const status = (body.status ?? "").trim();
  if (!id || !VALID_STATUSES.has(status)) {
    return NextResponse.json({ ok: false, error: "Invalid id or status." }, { status: 400 });
  }

  const now = new Date().toISOString();
  const patch: Record<string, unknown> = {
    status,
    updated_at: now,
  };
  if (status === "resolved" || status === "rejected") {
    patch.resolved_at = now;
  }
  if (typeof body.notes === "string" && body.notes.trim()) {
    patch.notes = body.notes.trim().slice(0, 4000);
  }

  const { error } = await admin.from("dpdp_rights_requests").update(patch).eq("id", id);
  if (error) {
    console.error("[admin/dpdp/rights-request] update failed:", error.message);
    return NextResponse.json({ ok: false, error: "Update failed." }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}

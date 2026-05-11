/**
 * POST /api/admin/batch-notes — update batch notes (editable comparison field).
 */
import { type NextRequest, NextResponse } from "next/server";

import { assertSameOrigin } from "@/lib/assertSameOrigin";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getSupabaseServiceRoleClient } from "@/lib/supabase/serviceRoleClient";
import { isAdminUser } from "@/lib/waitlist/batchEngine";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  const denied = assertSameOrigin(req);
  if (denied) return denied;

  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ ok: false, error: "Unauthorized." }, { status: 401 });
  }

  const adminOk = await isAdminUser(user.id, user.email ?? undefined);
  if (!adminOk) {
    return NextResponse.json({ ok: false, error: "Forbidden." }, { status: 403 });
  }

  const admin = getSupabaseServiceRoleClient();
  if (!admin) {
    return NextResponse.json({ ok: false, error: "Service unavailable." }, { status: 503 });
  }

  let body: { batchId?: string; notes?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid JSON." }, { status: 400 });
  }

  const batchId = (body.batchId ?? "").trim();
  const notes = (body.notes ?? "").trim();
  if (!batchId) {
    return NextResponse.json({ ok: false, error: "batchId required." }, { status: 400 });
  }
  if (notes.length > 2000) {
    return NextResponse.json({ ok: false, error: "notes too long." }, { status: 400 });
  }

  const { error } = await admin.from("batches").update({ notes: notes || null }).eq("id", batchId);
  if (error) {
    console.error("[admin/batch-notes]", error);
    return NextResponse.json({ ok: false, error: "Update failed." }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}

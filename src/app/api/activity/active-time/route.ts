/**
 * POST /api/activity/active-time
 * Accumulates foreground-visible seconds for the authenticated user (IST calendar day).
 */
import { type NextRequest, NextResponse } from "next/server";

import { assertSameOrigin } from "@/lib/assertSameOrigin";
import { todayISTKey } from "@/lib/admin/istDates";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getSupabaseServiceRoleClient } from "@/lib/supabase/serviceRoleClient";

export const runtime = "nodejs";

const MAX_DELTA = 120;

export async function POST(req: NextRequest) {
  const denied = assertSameOrigin(req);
  if (denied) return denied;

  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }

  let body: { delta_seconds?: unknown };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid JSON" }, { status: 400 });
  }

  const raw = body?.delta_seconds;
  const delta =
    typeof raw === "number" && Number.isFinite(raw) ? Math.floor(raw) : NaN;
  if (!Number.isFinite(delta) || delta < 1 || delta > MAX_DELTA) {
    return NextResponse.json({ ok: false, error: "Invalid delta_seconds" }, { status: 400 });
  }

  const admin = getSupabaseServiceRoleClient();
  if (!admin) {
    return NextResponse.json({ ok: false, error: "Service unavailable" }, { status: 503 });
  }

  const dateIst = todayISTKey();

  const { error } = await admin.rpc("increment_user_app_active_seconds", {
    p_user_id: user.id,
    p_date_ist: dateIst,
    p_delta: delta,
  });

  if (error) {
    console.warn("[activity/active-time] rpc:", error.message);
    return NextResponse.json({ ok: false, error: "Update failed" }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}

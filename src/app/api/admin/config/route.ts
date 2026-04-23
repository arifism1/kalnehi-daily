/**
 * POST /api/admin/config
 * Writes a single admin_config value. Only accessible to admin users.
 */
import { type NextRequest, NextResponse } from "next/server";

import { createSupabaseServerClient } from "@/lib/supabase/server";
import { isAdminUser, setAdminConfig } from "@/lib/waitlist/batchEngine";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ ok: false, error: "Unauthorized." }, { status: 401 });
  }

  const admin = await isAdminUser(user.id);
  if (!admin) {
    return NextResponse.json({ ok: false, error: "Forbidden." }, { status: 403 });
  }

  let body: { key?: string; value?: string };
  try { body = await req.json(); } catch {
    return NextResponse.json({ ok: false, error: "Invalid request body." }, { status: 400 });
  }

  const key = (body.key ?? "").trim();
  const value = (body.value ?? "").trim();

  if (!key || key.length > 100) {
    return NextResponse.json({ ok: false, error: "Invalid key." }, { status: 400 });
  }
  if (value.length > 1000) {
    return NextResponse.json({ ok: false, error: "Value too long." }, { status: 400 });
  }

  try {
    await setAdminConfig(key, value, user.id);
    return NextResponse.json({ ok: true, key, value });
  } catch (e) {
    console.error("[admin/config] save failed", e instanceof Error ? e.message : e);
    return NextResponse.json({ ok: false, error: "Save failed." }, { status: 500 });
  }
}

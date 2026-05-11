/**
 * POST /api/admin/batches — create a new scheduled batch.
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
  const { data: { user } } = await supabase.auth.getUser();
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

  let body: { opensAt?: string; size?: number; notes?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid JSON." }, { status: 400 });
  }

  const opensAt = (body.opensAt ?? "").trim();
  if (!opensAt || isNaN(Date.parse(opensAt))) {
    return NextResponse.json({ ok: false, error: "A valid opensAt (ISO datetime) is required." }, { status: 400 });
  }

  const size = body.size ?? 10000;
  if (!Number.isInteger(size) || size < 1 || size > 1_000_000) {
    return NextResponse.json({ ok: false, error: "size must be an integer between 1 and 1,000,000." }, { status: 400 });
  }

  const notes = (body.notes ?? "").trim().slice(0, 2000) || null;

  // Determine next batch_number.
  const { data: maxRow } = await admin
    .from("batches")
    .select("batch_number")
    .order("batch_number", { ascending: false })
    .limit(1)
    .maybeSingle();

  const nextBatchNumber = ((maxRow as { batch_number: number } | null)?.batch_number ?? 0) + 1;

  const { data, error } = await admin
    .from("batches")
    .insert({ batch_number: nextBatchNumber, opens_at: opensAt, status: "scheduled", size, notes })
    .select("*")
    .single();

  if (error) {
    console.error("[admin/batches POST]", error.message);
    return NextResponse.json({ ok: false, error: "Failed to create batch." }, { status: 500 });
  }

  return NextResponse.json({ ok: true, batch: data });
}

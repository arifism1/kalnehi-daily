/**
 * PATCH /api/admin/batches/[id] — edit a batch's opens_at, size, notes, or status.
 *
 * Status safety rules:
 *  - Only allow transitions: scheduled → scheduled (edit only), scheduled → active (triggers openBatch logic).
 *  - Do NOT allow demoting an active/complete batch back to scheduled.
 *  - Transitioning to "active" calls openBatch() to activate waiters and set trial_started_at.
 */
import { type NextRequest, NextResponse } from "next/server";

import { assertSameOrigin } from "@/lib/assertSameOrigin";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getSupabaseServiceRoleClient } from "@/lib/supabase/serviceRoleClient";
import { isAdminUser, openBatch } from "@/lib/waitlist/batchEngine";

export const runtime = "nodejs";

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const denied = assertSameOrigin(req);
  if (denied) return denied;

  const { id } = await params;

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

  let body: { opensAt?: string; size?: number; notes?: string; status?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid JSON." }, { status: 400 });
  }

  // Fetch the current batch.
  const { data: current, error: fetchErr } = await admin
    .from("batches")
    .select("id, status, batch_number")
    .eq("id", id)
    .maybeSingle();

  if (fetchErr || !current) {
    return NextResponse.json({ ok: false, error: "Batch not found." }, { status: 404 });
  }

  const currentBatch = current as { id: string; status: string; batch_number: number };

  // Validate status transition.
  if (body.status !== undefined) {
    const allowed = ["scheduled", "active", "analyzing", "complete"];
    if (!allowed.includes(body.status)) {
      return NextResponse.json(
        { ok: false, error: `Invalid status. Allowed: ${allowed.join(", ")}.` },
        { status: 400 },
      );
    }
    // Prevent demoting from active/analyzing/complete back to scheduled.
    if (
      body.status === "scheduled" &&
      ["active", "analyzing", "complete"].includes(currentBatch.status)
    ) {
      return NextResponse.json(
        { ok: false, error: "Cannot demote a batch back to scheduled once it is active or complete." },
        { status: 400 },
      );
    }
  }

  // If transitioning to "active", run openBatch to activate waiters and set trials.
  if (body.status === "active" && currentBatch.status === "scheduled") {
    try {
      await openBatch(id);
    } catch (e) {
      console.error("[admin/batches PATCH] openBatch error", e instanceof Error ? e.message : e);
      return NextResponse.json({ ok: false, error: "Failed to open batch." }, { status: 500 });
    }
    // openBatch already sets status to "active"; return early.
    const { data: updated } = await admin.from("batches").select("*").eq("id", id).maybeSingle();
    return NextResponse.json({ ok: true, batch: updated });
  }

  // Build partial update for field-level edits.
  const patch: Record<string, unknown> = {};

  if (body.opensAt !== undefined) {
    const opensAt = body.opensAt.trim();
    if (!opensAt || isNaN(Date.parse(opensAt))) {
      return NextResponse.json({ ok: false, error: "Invalid opensAt value." }, { status: 400 });
    }
    patch.opens_at = opensAt;
  }

  if (body.size !== undefined) {
    const size = body.size;
    if (!Number.isInteger(size) || size < 1 || size > 1_000_000) {
      return NextResponse.json(
        { ok: false, error: "size must be an integer between 1 and 1,000,000." },
        { status: 400 },
      );
    }
    patch.size = size;
  }

  if (body.notes !== undefined) {
    const notes = (body.notes ?? "").trim().slice(0, 2000) || null;
    patch.notes = notes;
  }

  if (body.status !== undefined) {
    patch.status = body.status;
  }

  if (Object.keys(patch).length === 0) {
    return NextResponse.json({ ok: false, error: "No fields to update." }, { status: 400 });
  }

  const { data: updated, error: updateErr } = await admin
    .from("batches")
    .update(patch)
    .eq("id", id)
    .select("*")
    .single();

  if (updateErr) {
    console.error("[admin/batches PATCH]", updateErr.message);
    return NextResponse.json({ ok: false, error: "Update failed." }, { status: 500 });
  }

  return NextResponse.json({ ok: true, batch: updated });
}

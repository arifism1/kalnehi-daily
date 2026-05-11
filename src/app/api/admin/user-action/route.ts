/**
 * POST /api/admin/user-action — support actions (extend trial, reset AI tokens, log refund, add note).
 */
import { type NextRequest, NextResponse } from "next/server";

import { assertSameOrigin } from "@/lib/assertSameOrigin";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getSupabaseServiceRoleClient } from "@/lib/supabase/serviceRoleClient";
import { isAdminUser } from "@/lib/waitlist/batchEngine";

export const runtime = "nodejs";

type Body = {
  action?: string;
  userId?: string;
  extendTrialDays?: number;
  note?: string;
  refundInr?: number;
  targetEmail?: string;
};

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

  let body: Body;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid JSON." }, { status: 400 });
  }

  const action = (body.action ?? "").trim();
  const userId = (body.userId ?? "").trim();
  const targetEmail = (body.targetEmail ?? "").trim().toLowerCase();
  if (!userId || !action) {
    return NextResponse.json({ ok: false, error: "userId and action required." }, { status: 400 });
  }

  // Validate userId is a well-formed UUID to prevent unexpected DB queries.
  const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  if (!UUID_RE.test(userId)) {
    return NextResponse.json({ ok: false, error: "Invalid userId format." }, { status: 400 });
  }

  try {
    if (action === "extend_trial") {
      const days = Math.min(30, Math.max(1, Math.floor(body.extendTrialDays ?? 1)));
      const { data: prof, error: selErr } = await admin
        .from("user_profiles")
        .select("trial_started_at")
        .eq("user_id", userId)
        .maybeSingle();
      if (selErr) throw selErr;
      const row = prof as { trial_started_at: string | null } | null;
      const base = row?.trial_started_at ? new Date(row.trial_started_at) : new Date();
      base.setUTCDate(base.getUTCDate() - days);
      const { error } = await admin
        .from("user_profiles")
        .update({ trial_started_at: base.toISOString(), updated_at: new Date().toISOString() })
        .eq("user_id", userId);
      if (error) throw error;
      return NextResponse.json({ ok: true, trial_started_at: base.toISOString() });
    }

    if (action === "reset_ai_tokens") {
      const { error } = await admin
        .from("user_profiles")
        .update({
          ai_tokens_used: 0,
          welcome_ai_tokens_used: 0,
          paid_trial_ai_tokens_used: 0,
          updated_at: new Date().toISOString(),
        })
        .eq("user_id", userId);
      if (error) throw error;
      return NextResponse.json({ ok: true });
    }

    if (action === "add_note") {
      const note = (body.note ?? "").trim();
      if (!note || note.length > 4000) {
        return NextResponse.json({ ok: false, error: "note required (max 4000 chars)." }, { status: 400 });
      }
      const { error } = await admin.from("admin_user_support_notes").insert({
        user_id: userId,
        note,
        created_by: user.id,
      });
      if (error) throw error;
      return NextResponse.json({ ok: true });
    }

    if (action === "log_refund") {
      const amt = body.refundInr ?? 0;
      const note = `[REFUND LOGGED] ₹${amt} — ${(body.note ?? "").trim() || "no detail"} — by admin ${user.email ?? user.id}`;
      const { error } = await admin.from("admin_user_support_notes").insert({
        user_id: userId,
        note,
        created_by: user.id,
      });
      if (error) throw error;
      return NextResponse.json({ ok: true });
    }

    if (action === "delete_user") {
      // Block deletion of any admin account (check by user_id and by email)
      let adminBlocked = false;
      const { data: byId } = await admin
        .from("admin_users")
        .select("user_id")
        .eq("user_id", userId)
        .maybeSingle();
      if (byId) adminBlocked = true;

      if (!adminBlocked && targetEmail) {
        const { data: byEmail } = await admin
          .from("admin_users")
          .select("user_id")
          .eq("email", targetEmail)
          .maybeSingle();
        if (byEmail) adminBlocked = true;
      }

      if (adminBlocked) {
        return NextResponse.json({ ok: false, error: "Cannot delete an admin account." }, { status: 403 });
      }

      // Manual cleanup for tables without FK cascade
      await admin.from("waitlist_entries").delete().eq("user_id", userId);

      // Delete the auth user — cascades all FK-linked tables
      const { error: delErr } = await admin.auth.admin.deleteUser(userId, false);
      if (delErr) throw delErr;
      return NextResponse.json({ ok: true });
    }

    return NextResponse.json({ ok: false, error: "Unknown action." }, { status: 400 });
  } catch (e) {
    console.error("[admin/user-action]", e);
    return NextResponse.json(
      { ok: false, error: e instanceof Error ? e.message : "Failed." },
      { status: 500 },
    );
  }
}

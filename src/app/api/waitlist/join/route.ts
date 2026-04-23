/**
 * POST /api/waitlist/join
 * Assigns a waitlist position to the authenticated user (or unauthenticated via email only).
 * Fires WAITLIST_CONFIRM email immediately.
 */
import crypto from "node:crypto";
import { type NextRequest, NextResponse } from "next/server";

import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getSupabaseServiceRoleClient } from "@/lib/supabase/serviceRoleClient";
import { getNextBatch, countUsersAhead } from "@/lib/waitlist/batchEngine";
import { sendWaitlistConfirm } from "@/lib/waitlist/notifications";

export const runtime = "nodejs";

const MAX_NAME = 120;
const MAX_EMAIL = 320;
const MAX_EXAM = 120;
const MAX_PHONE = 20;
const PHONE_RE = /^[6-9]\d{9}$/;

function normalizePhone(raw: string): string {
  return raw.replace(/[\s\-().+]/g, "").replace(/^(0|91)/, "");
}

type JoinBody = {
  fullName?: string;
  email?: string;
  phone?: string;
  exam?: string;
  notificationChannel?: string;
};

export async function POST(req: NextRequest) {
  let body: JoinBody;
  try {
    body = (await req.json()) as JoinBody;
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid request body." }, { status: 400 });
  }

  const fullName = (body.fullName ?? "").slice(0, MAX_NAME).trim();
  const email = (body.email ?? "").slice(0, MAX_EMAIL).trim().toLowerCase();
  const phone = normalizePhone((body.phone ?? "").slice(0, MAX_PHONE));
  const exam = (body.exam ?? "").slice(0, MAX_EXAM).trim();
  const channel = (body.notificationChannel ?? "email") as "email" | "push" | "both";

  if (!fullName) {
    return NextResponse.json({ ok: false, error: "Full name is required." }, { status: 400 });
  }
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return NextResponse.json({ ok: false, error: "A valid email address is required." }, { status: 400 });
  }
  if (!PHONE_RE.test(phone)) {
    return NextResponse.json({ ok: false, error: "A valid 10-digit Indian mobile number is required." }, { status: 400 });
  }
  if (!exam) {
    return NextResponse.json({ ok: false, error: "Please select the exam you are preparing for." }, { status: 400 });
  }

  // Try to get session (optional — user may join before auth).
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  const userId = user?.id;

  const admin = getSupabaseServiceRoleClient();
  if (!admin) {
    return NextResponse.json({ ok: false, error: "Service unavailable." }, { status: 503 });
  }

  // Find the next scheduled batch.
  const batch = await getNextBatch();
  if (!batch) {
    return NextResponse.json({ ok: false, error: "No open batch at this time. Please check back soon." }, { status: 503 });
  }

  if (!userId) {
    // Unauthenticated: derive a stable per-email UUID so UNIQUE(user_id) is never shared
    // between two different unauthenticated users. The RPC handles duplicate detection
    // by user_id (returns already_exists:true if this email already joined).
    const anonUserId = crypto
      .createHash("sha256")
      .update(`anon:${email}`)
      .digest("hex")
      .replace(/^(.{8})(.{4})(.{4})(.{4})(.{12}).*$/, "$1-$2-$3-$4-$5");

    const { data: rpcResult, error: rpcErr } = await admin.rpc("assign_waitlist_position", {
      p_user_id: anonUserId,
      p_batch_id: batch.id,
      p_notification_ch: channel,
      p_contact_email: email,
      p_contact_phone: phone,
    });

    if (rpcErr) {
      console.error("[waitlist/join] anon RPC error", rpcErr.message);
      return NextResponse.json({ ok: false, error: "Failed to join waitlist." }, { status: 500 });
    }

    const result = rpcResult as {
      ok: boolean;
      error?: string;
      position?: number;
      batch_number?: number;
      opens_at?: string;
      already_exists?: boolean;
    };

    if (!result.ok) {
      return NextResponse.json({ ok: false, error: result.error ?? "Unknown error." }, { status: 400 });
    }

    const position = result.position ?? 1;
    const aheadCount = await countUsersAhead(position);
    await sendWaitlistConfirm({ email, position, batchNumber: batch.batch_number, opensAt: batch.opens_at, aheadCount });
    return NextResponse.json({
      ok: true,
      alreadyExists: result.already_exists ?? false,
      position,
      batchNumber: batch.batch_number,
      opensAt: batch.opens_at,
      aheadCount,
    });
  }

  // Authenticated: use RPC for atomic position assignment.
  const { data: rpcResult, error: rpcErr } = await admin.rpc("assign_waitlist_position", {
    p_user_id: userId,
    p_batch_id: batch.id,
    p_notification_ch: channel,
    p_contact_email: email,
    p_contact_phone: phone,
  });

  if (rpcErr) {
    console.error("[waitlist/join] RPC error", rpcErr.message);
    return NextResponse.json({ ok: false, error: "Failed to join waitlist." }, { status: 500 });
  }

  const result = rpcResult as {
    ok: boolean;
    error?: string;
    position?: number;
    batch_number?: number;
    opens_at?: string;
    already_exists?: boolean;
  };

  if (!result.ok) {
    return NextResponse.json({ ok: false, error: result.error ?? "Unknown error." }, { status: 400 });
  }

  const position = result.position ?? 1;
  const aheadCount = await countUsersAhead(position);

  // Update contact_email and full_name on profile if provided.
  if (fullName) {
    await admin
      .from("user_profiles")
      .update({ full_name: fullName, updated_at: new Date().toISOString() })
      .eq("user_id", userId);
  }

  await sendWaitlistConfirm({
    email,
    position,
    batchNumber: result.batch_number ?? batch.batch_number,
    opensAt: result.opens_at ?? batch.opens_at,
    aheadCount,
  });

  return NextResponse.json({
    ok: true,
    alreadyExists: result.already_exists ?? false,
    position,
    batchNumber: result.batch_number ?? batch.batch_number,
    opensAt: result.opens_at ?? batch.opens_at,
    aheadCount,
  });
}

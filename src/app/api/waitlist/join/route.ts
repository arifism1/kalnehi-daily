/**
 * POST /api/waitlist/join
 * Assigns a waitlist position to the authenticated user (or unauthenticated via email only).
 * Fires WAITLIST_CONFIRM email immediately.
 */
import crypto from "node:crypto";
import { type NextRequest, NextResponse } from "next/server";

import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getSupabaseServiceRoleClient } from "@/lib/supabase/serviceRoleClient";
import { ensureJoinableBatch, countUsersAhead } from "@/lib/waitlist/batchEngine";
import { resolveAuthenticatedWaitlistContactEmail } from "@/lib/waitlist/joinContactEmail";
import { sendWaitlistConfirm } from "@/lib/waitlist/notifications";

// Max 5 join attempts per IP per 10-minute window.
const RATE_LIMIT_WINDOW_MS = 10 * 60 * 1000;
const RATE_LIMIT_MAX = 5;

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
  const rawChannel = body.notificationChannel ?? "email";
  if (!["email", "push", "both"].includes(rawChannel)) {
    return NextResponse.json({ ok: false, error: "Invalid notification channel." }, { status: 400 });
  }
  const channel = rawChannel as "email" | "push" | "both";

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

  // IP-based rate limiting — 5 attempts per 10-minute window per IP.
  // Uses a service-role DB table so the limit is shared across all serverless instances.
  const rawIp =
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    req.headers.get("x-real-ip") ??
    "unknown";
  const ipHash = crypto.createHash("sha256").update(rawIp).digest("hex");
  // Bucket timestamp to nearest 10-minute window (UTC).
  const windowStart = new Date(
    Math.floor(Date.now() / RATE_LIMIT_WINDOW_MS) * RATE_LIMIT_WINDOW_MS,
  ).toISOString();

  const admin = getSupabaseServiceRoleClient();
  if (!admin) {
    return NextResponse.json({ ok: false, error: "Service unavailable." }, { status: 503 });
  }

  // Atomically increment and read back the attempt count.
  const { data: attemptCount, error: rlErr } = await admin.rpc(
    "increment_waitlist_join_attempt" as never,
    { p_ip_hash: ipHash, p_window_start: windowStart } as never,
  );

  if (rlErr) {
    console.error("[waitlist/join] rate-limit RPC error", rlErr.message);
    return NextResponse.json(
      { ok: false, error: "Service unavailable." },
      { status: 503 },
    );
  }

  const count = attemptCount as number | null;
  if (count == null || Number.isNaN(count)) {
    console.error("[waitlist/join] rate-limit RPC returned no count");
    return NextResponse.json(
      { ok: false, error: "Service unavailable." },
      { status: 503 },
    );
  }

  if (count > RATE_LIMIT_MAX) {
    return NextResponse.json(
      { ok: false, error: "Too many requests. Please try again later." },
      { status: 429, headers: { "Retry-After": "600" } },
    );
  }

  // Try to get session (optional — user may join before auth).
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  const userId = user?.id;

  let contactEmailForAuth: string | null = null;
  if (userId) {
    const resolved = resolveAuthenticatedWaitlistContactEmail(email, user.email);
    if (!resolved.ok) {
      return NextResponse.json({ ok: false, error: resolved.error }, { status: 400 });
    }
    contactEmailForAuth = resolved.contactEmail;
  }

  // Ensure a scheduled batch exists (creates one if the table is empty).
  const batch = await ensureJoinableBatch();
  if (!batch) {
    return NextResponse.json({ ok: false, error: "Service unavailable." }, { status: 503 });
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

  if (!contactEmailForAuth) {
    return NextResponse.json({ ok: false, error: "Service unavailable." }, { status: 500 });
  }
  const authContactEmail = contactEmailForAuth;

  // Authenticated: use RPC for atomic position assignment (contact email = session only).
  const { data: rpcResult, error: rpcErr } = await admin.rpc("assign_waitlist_position", {
    p_user_id: userId,
    p_batch_id: batch.id,
    p_notification_ch: channel,
    p_contact_email: authContactEmail,
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
    email: authContactEmail,
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

/**
 * POST /api/activity/track
 * Accepts a batch of user activity events and bulk-inserts them into user_activity_logs.
 * Auth-gated: requires a valid session cookie. User-id is taken from the session,
 * not from the client payload.
 */
import { type NextRequest, NextResponse } from "next/server";
import { assertSameOrigin } from "@/lib/assertSameOrigin";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { processJourneyMilestones } from "@/lib/journey/milestones";
import { getSupabaseServiceRoleClient } from "@/lib/supabase/serviceRoleClient";
import type { Json } from "@/types/supabase";

export const runtime = "nodejs";

const MAX_EVENTS = 50;
const MAX_METADATA_BYTES = 2048;
const VALID_PLATFORMS = new Set(["web", "ios_pwa", "android_pwa"]);
const ACTION_RE = /^[a-z][a-z0-9_]{0,63}$/;
const FEATURE_RE = /^[a-z][a-z0-9_]{0,63}$/;

type RawEvent = {
  page?: unknown;
  feature?: unknown;
  action?: unknown;
  metadata?: unknown;
  platform?: unknown;
  session_id?: unknown;
  created_at?: unknown;
};

function sanitizePath(raw: unknown): string {
  if (typeof raw !== "string") return "/";
  // Strip query/hash, truncate
  return raw.replace(/[?#].*/, "").slice(0, 200) || "/";
}

function sanitizeAction(raw: unknown): string | null {
  if (typeof raw !== "string") return null;
  if (!ACTION_RE.test(raw)) return null;
  return raw;
}

function sanitizeFeature(raw: unknown): string | null {
  if (raw === null || raw === undefined) return null;
  if (typeof raw !== "string") return null;
  if (!FEATURE_RE.test(raw)) return null;
  return raw;
}

function sanitizePlatform(raw: unknown): string {
  if (typeof raw === "string" && VALID_PLATFORMS.has(raw)) return raw;
  return "web";
}

function sanitizeSessionId(raw: unknown): string {
  if (typeof raw !== "string") return "unknown";
  return raw.slice(0, 64);
}

function sanitizeMetadata(raw: unknown): Record<string, unknown> {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return {};
  return raw as Record<string, unknown>;
}

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

  let body: { events?: RawEvent[] };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid JSON" }, { status: 400 });
  }

  const rawEvents = Array.isArray(body?.events) ? body.events.slice(0, MAX_EVENTS) : [];
  if (rawEvents.length === 0) {
    return NextResponse.json({ ok: true, inserted: 0 });
  }

  const rows: {
    user_id: string;
    session_id: string;
    page: string;
    feature: string | null;
    action: string;
    metadata: Json;
    platform: string;
    created_at: string;
  }[] = [];

  for (const raw of rawEvents) {
    const action = sanitizeAction(raw.action);
    if (!action) continue;

    const metadata = sanitizeMetadata(raw.metadata);
    if (JSON.stringify(metadata).length > MAX_METADATA_BYTES) continue;

    rows.push({
      user_id: user.id,
      session_id: sanitizeSessionId(raw.session_id),
      page: sanitizePath(raw.page),
      feature: sanitizeFeature(raw.feature),
      action,
      metadata: metadata as Json,
      platform: sanitizePlatform(raw.platform),
      created_at:
        typeof raw.created_at === "string" && !isNaN(Date.parse(raw.created_at))
          ? raw.created_at
          : new Date().toISOString(),
    });
  }

  if (rows.length === 0) {
    return NextResponse.json({ ok: true, inserted: 0 });
  }

  const admin = getSupabaseServiceRoleClient();
  if (!admin) {
    return NextResponse.json({ ok: false, error: "Service unavailable" }, { status: 503 });
  }

  const { error } = await admin.from("user_activity_logs").insert(rows);
  if (error) {
    console.warn("[activity/track] insert error:", error.message);
    return NextResponse.json({ ok: false, error: "Insert failed" }, { status: 500 });
  }

  try {
    await processJourneyMilestones(
      user.id,
      rows.map((r) => ({
        action: r.action,
        created_at: r.created_at,
        metadata: (r.metadata ?? {}) as Record<string, unknown>,
      })),
    );
  } catch (e) {
    console.warn("[activity/track] journey milestones:", e);
  }

  return NextResponse.json({ ok: true, inserted: rows.length });
}

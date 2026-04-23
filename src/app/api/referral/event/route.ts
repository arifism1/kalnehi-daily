import { type NextRequest, NextResponse } from "next/server";

import { getClientIpFromRequest } from "@/lib/authRateLimit";
import { getSupabaseServiceRoleClient } from "@/lib/supabase/serviceRoleClient";

const ALLOWED_EVENT_TYPES = new Set([
  "link_clicked",
  "signup_completed",
  "trial_started",
  "converted_to_paid",
] as const);

/** Alphanumeric + underscores only, max 50 chars. */
function sanitiseCode(raw: unknown): string | null {
  if (typeof raw !== "string") return null;
  const cleaned = raw.trim().toUpperCase().replace(/[^A-Z0-9_]/g, "");
  return cleaned.length > 0 && cleaned.length <= 50 ? cleaned : null;
}

/** Strip any fields that look like PII (email, phone, name patterns). */
function stripPii(obj: unknown): Record<string, unknown> {
  if (!obj || typeof obj !== "object" || Array.isArray(obj)) return {};
  const safe: Record<string, unknown> = {};
  const blocked = /email|phone|mobile|name|password|token|secret/i;
  for (const [k, v] of Object.entries(obj as Record<string, unknown>)) {
    if (blocked.test(k)) continue;
    if (typeof v === "string" || typeof v === "number" || typeof v === "boolean") {
      safe[k] = v;
    }
  }
  return safe;
}

// ── Per-IP in-memory rate limit ───────────────────────────────────────────
// 10 requests per IP per 60 seconds.
// Module-level Map is acceptable for this low-stakes analytics endpoint — the
// worst outcome of a multi-instance bypass is extra DB rows, not a security risk.
const ipWindows = new Map<string, { count: number; windowStart: number }>();
const WINDOW_MS = 60_000;
const MAX_PER_WINDOW = 10;

function isRateLimited(ip: string): boolean {
  const now = Date.now();
  const entry = ipWindows.get(ip);
  if (!entry || now - entry.windowStart >= WINDOW_MS) {
    ipWindows.set(ip, { count: 1, windowStart: now });
    return false;
  }
  entry.count += 1;
  return entry.count > MAX_PER_WINDOW;
}

const OK = NextResponse.json({ success: true });

export async function POST(request: NextRequest) {
  const ip = getClientIpFromRequest(request);
  if (isRateLimited(ip)) return OK; // silently drop — never expose errors

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return OK;
  }

  if (!body || typeof body !== "object") return OK;
  const b = body as Record<string, unknown>;

  const eventType = typeof b.event_type === "string" ? b.event_type : null;
  if (!eventType || !ALLOWED_EVENT_TYPES.has(eventType as never)) return OK;

  const code = sanitiseCode(b.code);
  const sessionId =
    typeof b.session_id === "string" ? b.session_id.slice(0, 64) : null;
  const metadata = stripPii(b.metadata);

  const svc = getSupabaseServiceRoleClient();
  if (!svc) return OK;

  await svc
    .from("referral_events" as never)
    .insert({
      code: code ?? undefined,
      user_id: null,
      session_id: sessionId ?? undefined,
      event_type: eventType,
      metadata,
    } as never)
    .then(({ error }: { error: { message: string } | null }) => {
      if (error) console.warn("[referral/event] insert error:", error.message);
    });

  return OK;
}

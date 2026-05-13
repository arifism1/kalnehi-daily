/**
 * POST /api/public/landing-visit
 * Anonymous beacon for allowlisted marketing paths. Same-origin + IP rate limit.
 */
import { type NextRequest, NextResponse } from "next/server";

import { assertSameOrigin } from "@/lib/assertSameOrigin";
import { getClientIpFromRequest } from "@/lib/authRateLimit";
import { distributedRateLimit } from "@/lib/distributedRateLimit";
import type { Json } from "@/types/supabase";
import { getSupabaseServiceRoleClient } from "@/lib/supabase/serviceRoleClient";

export const runtime = "nodejs";

const ALLOWED_PATHS = new Set(["/", "/kalnehi-daily", "/pricing"]);
const WINDOW_MS = 60_000;
const MAX_PER_WINDOW = 40;

const OK = NextResponse.json({ ok: true });

function sanitiseSessionId(raw: unknown): string | null {
  if (typeof raw !== "string") return null;
  const s = raw.trim();
  if (s.length < 8 || s.length > 64) return null;
  if (!/^[a-zA-Z0-9_-]+$/.test(s)) return null;
  return s;
}

function sanitisePath(raw: unknown): string | null {
  if (typeof raw !== "string") return null;
  const p = raw.trim();
  return ALLOWED_PATHS.has(p) ? p : null;
}

function sanitiseReferrer(raw: unknown): string | null {
  if (typeof raw !== "string") return null;
  return raw.trim().slice(0, 500) || null;
}

function sanitiseUtm(raw: unknown): Json {
  const allowedKeys = new Set([
    "utm_source",
    "utm_medium",
    "utm_campaign",
    "utm_content",
    "utm_term",
  ]);
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return {};
  const out: Record<string, string> = {};
  for (const [k, v] of Object.entries(raw as Record<string, unknown>)) {
    if (!allowedKeys.has(k)) continue;
    if (typeof v !== "string") continue;
    const s = v.trim().slice(0, 256);
    if (s) out[k] = s;
    if (Object.keys(out).length >= 8) break;
  }
  return out as Json;
}

export async function POST(request: NextRequest) {
  const denied = assertSameOrigin(request);
  if (denied) return denied;

  const ip = getClientIpFromRequest(request);
  const rl = await distributedRateLimit(`rl:landing_visit:${ip}`, WINDOW_MS, MAX_PER_WINDOW);
  if (!rl.allowed) return OK;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return OK;
  }
  if (!body || typeof body !== "object") return OK;
  const b = body as Record<string, unknown>;

  const visitor_session_id = sanitiseSessionId(b.visitor_session_id);
  const path = sanitisePath(b.path);
  if (!visitor_session_id || !path) return OK;

  const admin = getSupabaseServiceRoleClient();
  if (!admin) return OK;

  const { error } = await admin.from("landing_page_visits").insert({
    visitor_session_id,
    path,
    referrer: sanitiseReferrer(b.referrer),
    utm: sanitiseUtm(b.utm),
  });

  if (error) {
    // 23505 = unique_violation (session+path+IST day)
    if (error.code !== "23505") {
      console.warn("[public/landing-visit] insert:", error.message);
    }
  }

  return OK;
}

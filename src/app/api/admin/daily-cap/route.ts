/**
 * GET  /api/admin/daily-cap         — last-30-days history + today's count
 * POST /api/admin/daily-cap         — toggle or update cap
 *   { action: 'toggle',     daily_cap_enabled: boolean }
 *   { action: 'update_cap', daily_trial_cap: number }
 */
import { type NextRequest, NextResponse } from "next/server";
import { revalidateTag } from "next/cache";

import { assertSameOrigin } from "@/lib/assertSameOrigin";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getSupabaseServiceRoleClient } from "@/lib/supabase/serviceRoleClient";
import { isAdminUser } from "@/lib/waitlist/batchEngine";
import {
  APP_CONFIG_CACHE_TAG,
  fetchAppConfig,
} from "@/lib/admin/killSwitch";
import { DAILY_CAP_STATUS_TAG } from "@/lib/daily-trial-cap";

export const runtime = "nodejs";

type Body =
  | { action: "toggle"; daily_cap_enabled: boolean }
  | { action: "update_cap"; daily_trial_cap: number };

// ── GET: history ─────────────────────────────────────────────────────────────

export async function GET(req: NextRequest) {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ ok: false, error: "Unauthorized." }, { status: 401 });
  }

  const admin = getSupabaseServiceRoleClient();
  if (!admin) {
    return NextResponse.json({ ok: false, error: "Service unavailable." }, { status: 503 });
  }

  const isAdmin = await isAdminUser(user.id, user.email ?? undefined);
  if (!isAdmin) {
    return NextResponse.json({ ok: false, error: "Forbidden." }, { status: 403 });
  }

  // Fetch last 30 days of daily_trial_counts.
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
  const since = thirtyDaysAgo.toISOString().split("T")[0]!;

  const { data: counts, error: countErr } = await admin
    .from("daily_trial_counts" as never)
    .select("date, trials_started, cap")
    .gte("date" as never, since)
    .order("date" as never, { ascending: false })
    .limit(35);

  if (countErr) {
    console.error("[admin/daily-cap] GET counts error:", (countErr as { message: string }).message);
  }

  // Fetch ₹19 skip counts per day from user_profiles (trial_access_type='skip_paid', grouped by trial_date).
  const { data: skipRows, error: skipErr } = await admin
    .from("user_profiles")
    .select("trial_date")
    .eq("trial_access_type" as never, "skip_paid")
    .gte("trial_date" as never, since)
    .not("trial_date" as never, "is", null);

  if (skipErr) {
    console.warn("[admin/daily-cap] GET skips error:", skipErr.message);
  }

  // Aggregate skip counts by date.
  const skipByDate = new Map<string, number>();
  for (const row of (skipRows ?? []) as unknown as { trial_date: string }[]) {
    if (row.trial_date) {
      skipByDate.set(row.trial_date, (skipByDate.get(row.trial_date) ?? 0) + 1);
    }
  }

  const history = ((counts ?? []) as unknown as { date: string; trials_started: number; cap: number }[]).map(
    (r) => ({
      date: r.date,
      trials_started: r.trials_started,
      cap: r.cap,
      skip_paid_count: skipByDate.get(r.date) ?? 0,
    }),
  );

  return NextResponse.json({ ok: true, history });
}

// ── POST: toggle / update_cap ─────────────────────────────────────────────────

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

  const admin = getSupabaseServiceRoleClient();
  if (!admin) {
    return NextResponse.json({ ok: false, error: "Service unavailable." }, { status: 503 });
  }

  const isAdmin = await isAdminUser(user.id, user.email ?? undefined);
  if (!isAdmin) {
    return NextResponse.json({ ok: false, error: "Forbidden." }, { status: 403 });
  }

  let body: Body;
  try {
    body = (await req.json()) as Body;
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid request body." }, { status: 400 });
  }

  const existing = await fetchAppConfig();
  if (!existing) {
    return NextResponse.json({ ok: false, error: "Config not found." }, { status: 404 });
  }

  if (body.action === "toggle") {
    const { daily_cap_enabled } = body;
    if (typeof daily_cap_enabled !== "boolean") {
      return NextResponse.json({ ok: false, error: "daily_cap_enabled must be boolean." }, { status: 400 });
    }

    const { error } = await admin
      .from("app_config")
      .update({ daily_cap_enabled, updated_at: new Date().toISOString() } as never)
      .eq("id", existing.id);

    if (error) {
      console.error("[admin/daily-cap] toggle error:", error.message);
      return NextResponse.json({ ok: false, error: "Failed to update config." }, { status: 500 });
    }

    revalidateTag(APP_CONFIG_CACHE_TAG, { expire: 0 });
    revalidateTag(DAILY_CAP_STATUS_TAG, { expire: 0 });

    return NextResponse.json({ ok: true, daily_cap_enabled });
  }

  if (body.action === "update_cap") {
    const cap = Number(body.daily_trial_cap);
    if (!Number.isInteger(cap) || cap < 100 || cap > 50_000) {
      return NextResponse.json(
        { ok: false, error: "daily_trial_cap must be an integer between 100 and 50,000." },
        { status: 400 },
      );
    }

    const { error } = await admin
      .from("app_config")
      .update({ daily_trial_cap: cap, updated_at: new Date().toISOString() } as never)
      .eq("id", existing.id);

    if (error) {
      console.error("[admin/daily-cap] update_cap error:", error.message);
      return NextResponse.json({ ok: false, error: "Failed to update cap." }, { status: 500 });
    }

    revalidateTag(APP_CONFIG_CACHE_TAG, { expire: 0 });
    revalidateTag(DAILY_CAP_STATUS_TAG, { expire: 0 });

    return NextResponse.json({ ok: true, daily_trial_cap: cap });
  }

  return NextResponse.json({ ok: false, error: "Unknown action." }, { status: 400 });
}

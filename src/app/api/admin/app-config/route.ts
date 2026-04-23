/**
 * POST /api/admin/app-config
 * Admin only.
 * Handles two actions:
 *   { action: 'toggle', app_enabled: boolean, reason?: string }
 *   { action: 'update_message', maintenance_title?, maintenance_message?, maintenance_eta? }
 */
import { type NextRequest, NextResponse } from "next/server";
import { revalidateTag } from "next/cache";

import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getSupabaseServiceRoleClient } from "@/lib/supabase/serviceRoleClient";
import { isAdminUser } from "@/lib/waitlist/batchEngine";
import { fetchAppConfig, APP_CONFIG_CACHE_TAG } from "@/lib/admin/killSwitch";
import { writeAppStatus } from "@/lib/edgeConfig";
import type { Json } from "@/types/supabase";

export const runtime = "nodejs";

type Body =
  | {
      action: "toggle";
      app_enabled: boolean;
      reason?: string;
    }
  | {
      action: "update_message";
      maintenance_title?: string;
      maintenance_message?: string;
      maintenance_eta?: string | null;
    };

async function sendAdminAlert(text: string) {
  const webhookUrl = process.env.ADMIN_ALERT_WEBHOOK_URL?.trim();
  if (!webhookUrl) return;
  try {
    await fetch(webhookUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text }),
    });
  } catch (e) {
    console.error("[admin/app-config] webhook failed:", e);
  }
}

export async function POST(req: NextRequest) {
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

  const now = new Date().toISOString();
  const adminEmail = user.email ?? user.id;

  if (body.action === "toggle") {
    const { app_enabled, reason } = body;

    // Read current state for audit log.
    const current = await fetchAppConfig();
    const old_value = current ? { app_enabled: current.app_enabled } : null;
    const new_value = { app_enabled };

    const updateFields: Record<string, unknown> = {
      app_enabled,
      updated_at: now,
    };

    if (!app_enabled) {
      updateFields.disabled_at = now;
      updateFields.disabled_by = user.id;
    } else {
      updateFields.re_enabled_at = now;
      updateFields.re_enabled_by = user.id;
    }

    const { error: updateErr } = await admin
      .from("app_config")
      .update(updateFields)
      .not("id", "is", null);

    if (updateErr) {
      console.error("[admin/app-config] toggle error:", updateErr);
      return NextResponse.json({ ok: false, error: updateErr.message }, { status: 500 });
    }

    // Write audit log.
    await admin.from("app_config_log").insert({
      action: app_enabled ? "app_enabled" : "app_disabled",
      performed_by: user.id,
      old_value,
      new_value,
      reason: reason?.trim() || null,
    });

    // Push to Edge Config — all serverless instances see the new state instantly.
    // Non-fatal if Edge Config is not configured (e.g. local dev).
    await writeAppStatus({ app_enabled });

    // Also bust the Next.js ISR cache so server components re-render promptly.
    revalidateTag(APP_CONFIG_CACHE_TAG, { expire: 0 });

    // Send internal alert (Slack-compatible webhook).
    if (!app_enabled) {
      const reasonText = reason?.trim() ? ` Reason: ${reason.trim()}` : "";
      await sendAdminAlert(
        `🔴 Kalnehi Daily taken *OFFLINE* by ${adminEmail} at ${new Date().toLocaleString("en-IN", { timeZone: "Asia/Kolkata" })} IST.${reasonText}`,
      );
    } else {
      const downtimeMs = current?.disabled_at
        ? Date.now() - new Date(current.disabled_at).getTime()
        : null;
      const downtimeText = downtimeMs
        ? ` Total downtime: ~${Math.round(downtimeMs / 60000)} min.`
        : "";
      await sendAdminAlert(
        `🟢 Kalnehi Daily back *ONLINE* at ${new Date().toLocaleString("en-IN", { timeZone: "Asia/Kolkata" })} IST by ${adminEmail}.${downtimeText}`,
      );
    }

    return NextResponse.json({ ok: true });
  }

  if (body.action === "update_message") {
    const { maintenance_title, maintenance_message, maintenance_eta } = body;

    const current = await fetchAppConfig();
    const old_value = current
      ? {
          maintenance_title: current.maintenance_title,
          maintenance_message: current.maintenance_message,
          maintenance_eta: current.maintenance_eta,
        }
      : null;

    const updateFields: Record<string, unknown> = { updated_at: now };
    if (maintenance_title !== undefined) updateFields.maintenance_title = maintenance_title;
    if (maintenance_message !== undefined) updateFields.maintenance_message = maintenance_message;
    if (maintenance_eta !== undefined) updateFields.maintenance_eta = maintenance_eta || null;

    const { error: updateErr } = await admin
      .from("app_config")
      .update(updateFields)
      .not("id", "is", null);

    if (updateErr) {
      console.error("[admin/app-config] update_message error:", updateErr);
      return NextResponse.json({ ok: false, error: updateErr.message }, { status: 500 });
    }

    await admin.from("app_config_log").insert({
      action: "maintenance_message_updated",
      performed_by: user.id,
      old_value: old_value as Json | null,
      new_value: updateFields as unknown as Json,
    });

    // Push updated message/title/eta to Edge Config so the maintenance screen
    // reflects the latest copy without waiting for cache expiry.
    await writeAppStatus({
      ...(maintenance_title !== undefined && { maintenance_title }),
      ...(maintenance_message !== undefined && { maintenance_message }),
      ...(maintenance_eta !== undefined && { maintenance_eta: maintenance_eta || null }),
    });

    revalidateTag(APP_CONFIG_CACHE_TAG, { expire: 0 });

    return NextResponse.json({ ok: true });
  }

  return NextResponse.json({ ok: false, error: "Unknown action." }, { status: 400 });
}

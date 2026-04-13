import { NextResponse } from "next/server";

import { getIstCalendarDateString } from "@/lib/customReminders/istClock";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

const MAX_TITLE = 120;
const MAX_BODY = 500;

function normalizeTime(hhmm: string): string | null {
  const t = hhmm.trim();
  const m = /^(\d{1,2}):(\d{2})$/.exec(t);
  if (!m) return null;
  const h = Number(m[1]);
  const min = Number(m[2]);
  if (h < 0 || h > 23 || min < 0 || min > 59) return null;
  return `${String(h).padStart(2, "0")}:${String(min).padStart(2, "0")}:00`;
}

type Ctx = { params: Promise<{ id: string }> };

export async function PATCH(req: Request, ctx: Ctx) {
  try {
    const { id } = await ctx.params;
    if (!id || typeof id !== "string") {
      return NextResponse.json({ error: "Invalid id" }, { status: 400 });
    }

    const supabase = await createSupabaseServerClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    let body: unknown;
    try {
      body = await req.json();
    } catch {
      return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
    }
    const o = body as Record<string, unknown>;

    const { data: existing } = await supabase
      .from("user_custom_notifications")
      .select(
        "title, body, scheduled_time, repeat_type, is_active, run_once_on_ist_date",
      )
      .eq("id", id)
      .eq("user_id", user.id)
      .maybeSingle();

    if (!existing) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    const patch: Record<string, unknown> = {
      updated_at: new Date().toISOString(),
    };

    if (typeof o.title === "string") {
      const t = o.title.trim().slice(0, MAX_TITLE);
      if (!t) {
        return NextResponse.json({ error: "Title cannot be empty." }, { status: 400 });
      }
      patch.title = t;
    }
    if (typeof o.body === "string") {
      const b = o.body.trim().slice(0, MAX_BODY);
      if (!b) {
        return NextResponse.json({ error: "Message cannot be empty." }, { status: 400 });
      }
      patch.body = b;
    }
    if (typeof o.scheduledTime === "string") {
      const timeNorm = normalizeTime(o.scheduledTime);
      if (!timeNorm) {
        return NextResponse.json(
          { error: "Invalid time. Use HH:MM (24h)." },
          { status: 400 },
        );
      }
      patch.scheduled_time = timeNorm;
    }
    let nextRepeat = existing.repeat_type;
    if (o.repeatType === "daily" || o.repeatType === "once") {
      patch.repeat_type = o.repeatType;
      nextRepeat = o.repeatType;
      if (o.repeatType === "daily") {
        patch.run_once_on_ist_date = null;
      }
    }
    if (typeof o.runOnceOnIstDate === "string") {
      const d = o.runOnceOnIstDate.trim();
      if (!/^\d{4}-\d{2}-\d{2}$/.test(d)) {
        return NextResponse.json({ error: "Invalid date." }, { status: 400 });
      }
      const today = getIstCalendarDateString();
      if (d < today) {
        return NextResponse.json(
          { error: "Date must be today or later (IST)." },
          { status: 400 },
        );
      }
      patch.run_once_on_ist_date = d;
    }

    const effectiveRepeat = (patch.repeat_type as string | undefined) ?? nextRepeat;
    const effectiveOnceDate =
      (patch.run_once_on_ist_date as string | null | undefined) ??
      existing.run_once_on_ist_date;
    if (effectiveRepeat === "once" && !effectiveOnceDate) {
      return NextResponse.json(
        { error: "One-time reminders need a run date (IST)." },
        { status: 400 },
      );
    }
    if (typeof o.isActive === "boolean") {
      patch.is_active = o.isActive;
    }
    if (o.clearLastFired === true) {
      patch.last_fired_ist_date = null;
    }

    const { data, error } = await supabase
      .from("user_custom_notifications")
      .update(patch)
      .eq("id", id)
      .eq("user_id", user.id)
      .select(
        "id, title, body, scheduled_time, repeat_type, is_active, run_once_on_ist_date, last_fired_ist_date, created_at, updated_at",
      )
      .maybeSingle();

    if (error) {
      console.error("[custom-reminders PATCH]", error.message);
      return NextResponse.json({ error: "Update failed" }, { status: 500 });
    }
    if (!data) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    return NextResponse.json({ reminder: data });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "unknown";
    console.error("[custom-reminders PATCH]", msg);
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}

export async function DELETE(_req: Request, ctx: Ctx) {
  try {
    const { id } = await ctx.params;
    if (!id || typeof id !== "string") {
      return NextResponse.json({ error: "Invalid id" }, { status: 400 });
    }

    const supabase = await createSupabaseServerClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { data: deleted, error } = await supabase
      .from("user_custom_notifications")
      .delete()
      .eq("id", id)
      .eq("user_id", user.id)
      .select("id");

    if (error) {
      console.error("[custom-reminders DELETE]", error.message);
      return NextResponse.json({ error: "Delete failed" }, { status: 500 });
    }
    if (!deleted?.length) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    return NextResponse.json({ ok: true });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "unknown";
    console.error("[custom-reminders DELETE]", msg);
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}

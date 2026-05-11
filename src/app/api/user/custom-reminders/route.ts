import { NextResponse } from "next/server";

import { assertSameOrigin } from "@/lib/assertSameOrigin";
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

export async function GET() {
  try {
    const supabase = await createSupabaseServerClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { data, error } = await supabase
      .from("user_custom_notifications")
      .select(
        "id, title, body, scheduled_time, repeat_type, is_active, run_once_on_ist_date, last_fired_ist_date, created_at, updated_at",
      )
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("[custom-reminders GET]", error.message);
      return NextResponse.json({ error: "Failed to load" }, { status: 500 });
    }

    return NextResponse.json({ reminders: data ?? [] });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "unknown";
    console.error("[custom-reminders GET]", msg);
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  const denied = assertSameOrigin(req);
  if (denied) return denied;

  try {
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
    const title =
      typeof o.title === "string" ? o.title.trim().slice(0, MAX_TITLE) : "";
    const msgBody =
      typeof o.body === "string" ? o.body.trim().slice(0, MAX_BODY) : "";
    const scheduledTime =
      typeof o.scheduledTime === "string" ? o.scheduledTime.trim() : "";
    const repeatType =
      o.repeatType === "once" || o.repeatType === "daily" ? o.repeatType : "";
    const runOnceRaw =
      typeof o.runOnceOnIstDate === "string" ? o.runOnceOnIstDate.trim() : "";

    if (!title || !msgBody) {
      return NextResponse.json(
        { error: "Title and message are required." },
        { status: 400 },
      );
    }
    if (repeatType !== "daily" && repeatType !== "once") {
      return NextResponse.json({ error: "Invalid repeat type." }, { status: 400 });
    }

    const timeNorm = normalizeTime(scheduledTime);
    if (!timeNorm) {
      return NextResponse.json(
        { error: "Invalid time. Use HH:MM (24h, India time)." },
        { status: 400 },
      );
    }

    let runOnceOnIstDate: string | null = null;
    if (repeatType === "once") {
      if (!/^\d{4}-\d{2}-\d{2}$/.test(runOnceRaw)) {
        return NextResponse.json(
          { error: "Pick a calendar date for one-time reminders." },
          { status: 400 },
        );
      }
      runOnceOnIstDate = runOnceRaw;
      const today = getIstCalendarDateString();
      if (runOnceOnIstDate < today) {
        return NextResponse.json(
          { error: "Date must be today or later (IST)." },
          { status: 400 },
        );
      }
    }

    const { data, error } = await supabase
      .from("user_custom_notifications")
      .insert({
        user_id: user.id,
        title,
        body: msgBody,
        scheduled_time: timeNorm,
        repeat_type: repeatType,
        is_active: true,
        run_once_on_ist_date: repeatType === "once" ? runOnceOnIstDate : null,
        last_fired_ist_date: null,
      })
      .select(
        "id, title, body, scheduled_time, repeat_type, is_active, run_once_on_ist_date, last_fired_ist_date, created_at, updated_at",
      )
      .single();

    if (error) {
      console.error("[custom-reminders POST]", error.message);
      return NextResponse.json({ error: "Could not save reminder." }, { status: 500 });
    }

    return NextResponse.json({ reminder: data });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "unknown";
    console.error("[custom-reminders POST]", msg);
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}

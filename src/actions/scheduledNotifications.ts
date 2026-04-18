"use server";

import { revalidatePath } from "next/cache";

import { formatSupabaseError } from "@/lib/supabase";
import {
  SCHEDULED_NOTIFICATION_TAGS,
  type ScheduledNotificationTag,
} from "@/lib/scheduledNotifications/tags";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { USER_ERROR } from "@/lib/userFacingErrors";
import type { TablesInsert, TablesUpdate } from "@/types/supabase";

const REPEAT_TYPES = new Set(["once", "daily", "weekly"]);

export type ScheduledNotificationRow = {
  id: string;
  user_id: string;
  title: string;
  body: string;
  tag: string;
  subject: string | null;
  chapter: string | null;
  next_fire_at: string;
  user_timezone: string;
  repeat_type: string;
  is_active: boolean;
  last_fired_at: string | null;
  created_at: string;
  updated_at: string;
};

function normalizeTag(tag: string): ScheduledNotificationTag {
  const t = tag.trim();
  return SCHEDULED_NOTIFICATION_TAGS.includes(t as ScheduledNotificationTag)
    ? (t as ScheduledNotificationTag)
    : "Other";
}

function defaultBody(title: string, tag: string): string {
  return `${tag}: ${title}`.slice(0, 500);
}

export async function listScheduledNotifications(): Promise<
  { ok: true; rows: ScheduledNotificationRow[] } | { ok: false; error: string }
> {
  try {
    const supabase = await createSupabaseServerClient();
    const {
      data: { user },
      error: authErr,
    } = await supabase.auth.getUser();
    if (authErr || !user) return { ok: false, error: USER_ERROR.session };

    const { data, error } = await supabase
      .from("user_scheduled_notifications")
      .select("*")
      .order("next_fire_at", { ascending: true });

    if (error) return { ok: false, error: formatSupabaseError(error) };
    return { ok: true, rows: (data ?? []) as ScheduledNotificationRow[] };
  } catch (e) {
    return { ok: false, error: formatSupabaseError(e) };
  }
}

export type CreateScheduledNotificationInput = {
  title: string;
  body?: string;
  tag: string;
  subject?: string | null;
  chapter?: string | null;
  next_fire_at: string;
  user_timezone: string;
  repeat_type: string;
};

export async function createScheduledNotification(
  input: CreateScheduledNotificationInput,
): Promise<{ ok: true; id: string } | { ok: false; error: string }> {
  try {
    const supabase = await createSupabaseServerClient();
    const {
      data: { user },
      error: authErr,
    } = await supabase.auth.getUser();
    if (authErr || !user) return { ok: false, error: USER_ERROR.session };

    const repeat = input.repeat_type.trim();
    if (!REPEAT_TYPES.has(repeat)) {
      return { ok: false, error: "Invalid repeat type." };
    }

    const title = input.title.trim().slice(0, 200);
    if (!title) return { ok: false, error: "Title is required." };

    const next = new Date(input.next_fire_at);
    if (Number.isNaN(next.getTime())) {
      return { ok: false, error: "Invalid time." };
    }

    const tag = normalizeTag(input.tag);
    const body = (input.body?.trim() || defaultBody(title, tag)).slice(0, 500);
    const tz = input.user_timezone.trim().slice(0, 120) || "UTC";

    const row: TablesInsert<"user_scheduled_notifications"> = {
      user_id: user.id,
      title,
      body,
      tag,
      subject: input.subject?.trim() ? input.subject.trim().slice(0, 200) : null,
      chapter: input.chapter?.trim() ? input.chapter.trim().slice(0, 200) : null,
      next_fire_at: next.toISOString(),
      user_timezone: tz,
      repeat_type: repeat,
      is_active: true,
    };

    const { data, error } = await supabase
      .from("user_scheduled_notifications")
      .insert(row)
      .select("id")
      .single();

    if (error || !data?.id) {
      return { ok: false, error: formatSupabaseError(error ?? new Error("insert")) };
    }

    revalidatePath("/notification");
    return { ok: true, id: data.id };
  } catch (e) {
    return { ok: false, error: formatSupabaseError(e) };
  }
}

export async function deleteScheduledNotification(
  id: string,
): Promise<{ ok: true } | { ok: false; error: string }> {
  try {
    const supabase = await createSupabaseServerClient();
    const {
      data: { user },
      error: authErr,
    } = await supabase.auth.getUser();
    if (authErr || !user) return { ok: false, error: USER_ERROR.session };

    const { error } = await supabase
      .from("user_scheduled_notifications")
      .delete()
      .eq("id", id)
      .eq("user_id", user.id);

    if (error) return { ok: false, error: formatSupabaseError(error) };
    revalidatePath("/notification");
    return { ok: true };
  } catch (e) {
    return { ok: false, error: formatSupabaseError(e) };
  }
}

export type UpdateScheduledNotificationInput = {
  title?: string;
  body?: string;
  tag?: string;
  subject?: string | null;
  chapter?: string | null;
  next_fire_at?: string;
  user_timezone?: string;
  repeat_type?: string;
  is_active?: boolean;
};

export async function updateScheduledNotification(
  id: string,
  input: UpdateScheduledNotificationInput,
): Promise<{ ok: true } | { ok: false; error: string }> {
  try {
    const supabase = await createSupabaseServerClient();
    const {
      data: { user },
      error: authErr,
    } = await supabase.auth.getUser();
    if (authErr || !user) return { ok: false, error: USER_ERROR.session };

    const patch: TablesUpdate<"user_scheduled_notifications"> = {
      updated_at: new Date().toISOString(),
    };

    if (input.title !== undefined) {
      const t = input.title.trim().slice(0, 200);
      if (!t) return { ok: false, error: "Title is required." };
      patch.title = t;
    }
    if (input.body !== undefined) {
      patch.body = input.body.trim().slice(0, 500);
    }
    if (input.tag !== undefined) patch.tag = normalizeTag(input.tag);
    if (input.subject !== undefined) {
      patch.subject = input.subject?.trim() ? input.subject.trim().slice(0, 200) : null;
    }
    if (input.chapter !== undefined) {
      patch.chapter = input.chapter?.trim() ? input.chapter.trim().slice(0, 200) : null;
    }
    if (input.next_fire_at !== undefined) {
      const next = new Date(input.next_fire_at);
      if (Number.isNaN(next.getTime())) {
        return { ok: false, error: "Invalid time." };
      }
      patch.next_fire_at = next.toISOString();
    }
    if (input.user_timezone !== undefined) {
      patch.user_timezone = input.user_timezone.trim().slice(0, 120) || "UTC";
    }
    if (input.repeat_type !== undefined) {
      const r = input.repeat_type.trim();
      if (!REPEAT_TYPES.has(r)) return { ok: false, error: "Invalid repeat type." };
      patch.repeat_type = r;
    }
    if (input.is_active !== undefined) patch.is_active = input.is_active;

    const { error } = await supabase
      .from("user_scheduled_notifications")
      .update(patch)
      .eq("id", id)
      .eq("user_id", user.id);

    if (error) return { ok: false, error: formatSupabaseError(error) };
    revalidatePath("/notification");
    return { ok: true };
  } catch (e) {
    return { ok: false, error: formatSupabaseError(e) };
  }
}

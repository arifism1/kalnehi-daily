"use server";

import { createSupabaseServerClient } from "@/lib/supabase/server";
import { formatSupabaseError } from "@/lib/supabase";
import { USER_ERROR } from "@/lib/userFacingErrors";
import type { Json, Tables } from "@/types/supabase";
import type { UserPlannerTextOutboxOp } from "@/lib/userPlannerTextTypes";

export type UserPlannerTextFetchResult =
  | {
      ok: true;
      revisions: Tables<"user_revision_queue_items">[];
      productivity: Tables<"user_productivity_planner"> | null;
      todos: Tables<"user_quick_exam_todos">[];
      prefs: Tables<"user_engine_notification_prefs"> | null;
    }
  | { ok: false; error: string };

export async function fetchUserPlannerTextData(): Promise<UserPlannerTextFetchResult> {
  try {
    const supabase = await createSupabaseServerClient();
    const {
      data: { user },
      error: authErr,
    } = await supabase.auth.getUser();
    if (authErr || !user) return { ok: false, error: USER_ERROR.session };

    const [revRes, prodRes, todoRes, prefRes] = await Promise.all([
      supabase
        .from("user_revision_queue_items")
        .select("*")
        .eq("user_id", user.id)
        .order("next_due", { ascending: true }),
      supabase
        .from("user_productivity_planner")
        .select("*")
        .eq("user_id", user.id)
        .maybeSingle(),
      supabase
        .from("user_quick_exam_todos")
        .select("*")
        .eq("user_id", user.id)
        .order("position", { ascending: true }),
      supabase
        .from("user_engine_notification_prefs")
        .select("*")
        .eq("user_id", user.id)
        .maybeSingle(),
    ]);

    if (revRes.error)
      return { ok: false, error: formatSupabaseError(revRes.error) };
    if (prodRes.error)
      return { ok: false, error: formatSupabaseError(prodRes.error) };
    if (todoRes.error)
      return { ok: false, error: formatSupabaseError(todoRes.error) };
    if (prefRes.error)
      return { ok: false, error: formatSupabaseError(prefRes.error) };

    return {
      ok: true,
      revisions: revRes.data ?? [],
      productivity: prodRes.data ?? null,
      todos: todoRes.data ?? [],
      prefs: prefRes.data ?? null,
    };
  } catch (e) {
    return { ok: false, error: formatSupabaseError(e) };
  }
}

export async function applyUserPlannerTextOutboxOp(
  op: UserPlannerTextOutboxOp,
): Promise<{ ok: true } | { ok: false; error: string }> {
  try {
    const supabase = await createSupabaseServerClient();
    const {
      data: { user },
      error: authErr,
    } = await supabase.auth.getUser();
    if (authErr || !user) return { ok: false, error: USER_ERROR.session };

    const now = new Date().toISOString();

    switch (op.kind) {
      case "revision_upsert": {
        const row = {
          id: op.id,
          user_id: user.id,
          title: op.title.trim().slice(0, 500) || "Revision",
          microtopic_id: op.microtopicId ?? null,
          difficulty: op.difficulty,
          next_due: op.nextDue,
          last_reviewed: op.lastReviewed,
          created_at: op.createdAt,
          updated_at: now,
        };
        const { error } = await supabase
          .from("user_revision_queue_items")
          .upsert(row, { onConflict: "id" });
        if (error) return { ok: false, error: formatSupabaseError(error) };
        return { ok: true };
      }
      case "revision_delete": {
        const { error } = await supabase
          .from("user_revision_queue_items")
          .delete()
          .eq("id", op.id)
          .eq("user_id", user.id);
        if (error) return { ok: false, error: formatSupabaseError(error) };
        return { ok: true };
      }
      case "productivity_put": {
        const { error } = await supabase.from("user_productivity_planner").upsert(
          {
            user_id: user.id,
            notes: op.notes.slice(0, 20_000),
            p1: op.p1.slice(0, 500),
            p2: op.p2.slice(0, 500),
            p3: op.p3.slice(0, 500),
            updated_at: now,
          },
          { onConflict: "user_id" },
        );
        if (error) return { ok: false, error: formatSupabaseError(error) };
        return { ok: true };
      }
      case "todo_upsert": {
        const createdAt = op.createdAt?.trim() || now;
        const { error } = await supabase.from("user_quick_exam_todos").upsert(
          {
            id: op.id,
            user_id: user.id,
            text: op.text.trim().slice(0, 2000) || "—",
            priority: op.priority,
            done: op.done,
            position: op.position,
            created_at: createdAt,
            updated_at: now,
          },
          { onConflict: "id" },
        );
        if (error) return { ok: false, error: formatSupabaseError(error) };
        return { ok: true };
      }
      case "todo_delete": {
        const { error } = await supabase
          .from("user_quick_exam_todos")
          .delete()
          .eq("id", op.id)
          .eq("user_id", user.id);
        if (error) return { ok: false, error: formatSupabaseError(error) };
        return { ok: true };
      }
      case "todo_reorder": {
        for (let i = 0; i < op.orderedIds.length; i++) {
          const id = op.orderedIds[i]!;
          const { error } = await supabase
            .from("user_quick_exam_todos")
            .update({ position: i, updated_at: now })
            .eq("id", id)
            .eq("user_id", user.id);
          if (error) return { ok: false, error: formatSupabaseError(error) };
        }
        return { ok: true };
      }
      case "engine_prefs_put": {
        const prefs = op.prefs as unknown as Json;
        const { error } = await supabase
          .from("user_engine_notification_prefs")
          .upsert(
            {
              user_id: user.id,
              prefs,
              updated_at: now,
            },
            { onConflict: "user_id" },
          );
        if (error) return { ok: false, error: formatSupabaseError(error) };
        return { ok: true };
      }
      default:
        return { ok: false, error: "Unknown planner text sync operation." };
    }
  } catch (e) {
    return { ok: false, error: formatSupabaseError(e) };
  }
}

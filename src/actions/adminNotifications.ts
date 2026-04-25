"use server";

import { formatSupabaseError } from "@/lib/supabase";
import { getSupabaseServiceRoleClient } from "@/lib/supabase/serviceRoleClient";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { isAdminUser } from "@/lib/waitlist/batchEngine";
import type { AdminAppUpdate, AppUpdateCategory } from "@/actions/adminNotifications.types";


async function requireAdmin(): Promise<
  { ok: true; userId: string } | { ok: false; error: string }
> {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();
  if (userError || !user) return { ok: false, error: "Not signed in." };
  const admin = await isAdminUser(user.id, user.email ?? undefined);
  if (!admin) return { ok: false, error: "Admin access required." };
  return { ok: true, userId: user.id };
}

export async function publishAppUpdate(
  title: string,
  message: string,
  category: string,
): Promise<{ ok: true; id: string } | { ok: false; error: string }> {
  try {
    const auth = await requireAdmin();
    if (!auth.ok) return auth;

    const serviceRole = getSupabaseServiceRoleClient();
    if (!serviceRole) return { ok: false, error: "Service role unavailable." };

    const { data, error } = await serviceRole
      .from("app_updates")
      .insert({ title: title.trim(), message: message.trim(), category })
      .select("id")
      .single();
    if (error) throw error;

    return { ok: true, id: data.id };
  } catch (e) {
    console.error("[publishAppUpdate] failed", e);
    return { ok: false, error: formatSupabaseError(e) };
  }
}

export async function deleteAppUpdate(
  id: string,
): Promise<{ ok: true } | { ok: false; error: string }> {
  try {
    const auth = await requireAdmin();
    if (!auth.ok) return auth;

    const serviceRole = getSupabaseServiceRoleClient();
    if (!serviceRole) return { ok: false, error: "Service role unavailable." };

    const { error } = await serviceRole
      .from("app_updates")
      .delete()
      .eq("id", id);
    if (error) throw error;

    return { ok: true };
  } catch (e) {
    console.error("[deleteAppUpdate] failed", e);
    return { ok: false, error: formatSupabaseError(e) };
  }
}

export async function listAdminAppUpdates(
  limit = 100,
): Promise<{ ok: true; updates: AdminAppUpdate[] } | { ok: false; error: string }> {
  try {
    const auth = await requireAdmin();
    if (!auth.ok) return auth;

    const serviceRole = getSupabaseServiceRoleClient();
    if (!serviceRole) return { ok: false, error: "Service role unavailable." };

    // Fetch recent updates and their read counts in parallel.
    const [updatesRes, readsRes] = await Promise.all([
      serviceRole
        .from("app_updates")
        .select("id, title, message, category, created_at")
        .order("created_at", { ascending: false })
        .limit(Math.max(1, Math.min(500, limit))),
      serviceRole
        .from("user_app_update_reads")
        .select("update_id"),
    ]);

    if (updatesRes.error) throw updatesRes.error;
    if (readsRes.error) throw readsRes.error;

    const updates = updatesRes.data ?? [];
    if (updates.length === 0) return { ok: true, updates: [] };

    const updateIdSet = new Set(updates.map((u) => u.id));
    const readCountMap: Record<string, number> = {};
    for (const r of readsRes.data ?? []) {
      if (!updateIdSet.has(r.update_id)) continue;
      readCountMap[r.update_id] = (readCountMap[r.update_id] ?? 0) + 1;
    }

    return {
      ok: true,
      updates: updates.map((u) => ({
        ...u,
        read_count: readCountMap[u.id] ?? 0,
      })),
    };
  } catch (e) {
    console.error("[listAdminAppUpdates] failed", e);
    return { ok: false, error: formatSupabaseError(e) };
  }
}

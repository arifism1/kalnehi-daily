import type { User } from "@supabase/supabase-js";

import { getSupabaseServiceRoleClient } from "@/lib/supabase/serviceRoleClient";

import type { Json } from "@/types/supabase";

export type UserLookupBundle = {
  userId: string;
  email: string | null;
  phone: string | null;
  createdAt: string | null;
  lastSignIn: string | null;
  profile: Record<string, unknown> | null;
  waitlist: Record<string, unknown> | null;
  payments: { kind: string; created_at: string; razorpay_payment_id: string }[];
  prepbrainConversations: number;
  supportNotes: { note: string; created_at: string }[];
};

async function findAuthUserIdByEmail(
  admin: NonNullable<ReturnType<typeof getSupabaseServiceRoleClient>>,
  email: string,
): Promise<User | null> {
  const e = email.toLowerCase();
  for (let page = 1; page <= 25; page++) {
    const { data, error } = await admin.auth.admin.listUsers({ page, perPage: 1000 });
    if (error) return null;
    const hit = data.users.find((u) => u.email?.toLowerCase() === e);
    if (hit) return hit;
    if (data.users.length < 1000) break;
  }
  return null;
}

export async function searchUsersForAdmin(q: string): Promise<UserLookupBundle[]> {
  const admin = getSupabaseServiceRoleClient();
  if (!admin || q.trim().length < 2) return [];

  const needle = q.trim();
  const bundles: UserLookupBundle[] = [];

  if (needle.includes("@")) {
    const authUser = await findAuthUserIdByEmail(admin, needle);
    if (authUser) {
      const b = await loadBundleForUserId(admin, authUser.id, authUser);
      if (b) bundles.push(b);
    }
    if (bundles.length > 0) return bundles;
  }

  const esc = needle.replace(/[%_]/g, "\\$&");
  const { data: profiles } = await admin
    .from("user_profiles")
    .select("*")
    .or(`full_name.ilike.%${esc}%,phone_number.ilike.%${esc}%`)
    .limit(15);

  const profList = (profiles ?? []) as { user_id: string | null }[];
  const seen = new Set<string>();

  for (const p of profList) {
    if (!p.user_id || seen.has(p.user_id)) continue;
    seen.add(p.user_id);
    const { data: u } = await admin.auth.admin.getUserById(p.user_id);
    if (u.user) {
      const b = await loadBundleForUserId(admin, p.user_id, u.user);
      if (b) bundles.push(b);
    }
  }

  return bundles;
}

async function loadBundleForUserId(
  admin: NonNullable<ReturnType<typeof getSupabaseServiceRoleClient>>,
  userId: string,
  authUser: { email?: string | null; phone?: string | null; created_at?: string; last_sign_in_at?: string },
): Promise<UserLookupBundle | null> {
  const [{ data: profile }, { data: waitlist }, { data: payments }, convRes, { data: notes }] =
    await Promise.all([
      admin.from("user_profiles").select("*").eq("user_id", userId).maybeSingle(),
      admin.from("waitlist_entries").select("*").eq("user_id", userId).maybeSingle(),
      admin
        .from("razorpay_processed_payments")
        .select("kind, created_at, razorpay_payment_id")
        .eq("user_id", userId)
        .order("created_at", { ascending: false })
        .limit(50),
      admin
        .from("prepbrain_conversations")
        .select("id", { count: "exact", head: true })
        .eq("user_id", userId),
      admin
        .from("admin_user_support_notes")
        .select("note, created_at")
        .eq("user_id", userId)
        .order("created_at", { ascending: false })
        .limit(30),
    ]);

  return {
    userId,
    email: authUser.email ?? null,
    phone: authUser.phone ?? (profile as { phone_number?: string } | null)?.phone_number ?? null,
    createdAt: authUser.created_at ?? null,
    lastSignIn: authUser.last_sign_in_at ?? null,
    profile: profile as Json as Record<string, unknown> | null,
    waitlist: waitlist as Json as Record<string, unknown> | null,
    payments: (payments ?? []) as UserLookupBundle["payments"],
    prepbrainConversations: convRes.count ?? 0,
    supportNotes: (notes ?? []) as UserLookupBundle["supportNotes"],
  };
}

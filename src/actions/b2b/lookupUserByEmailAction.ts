"use server";

import { createSupabaseServerClient } from "@/lib/supabase/server";
import { isAdminUser } from "@/lib/waitlist/batchEngine";

export interface UserLookupResult {
  id: string;
  email: string;
  full_name: string | null;
}

export type LookupUserByEmailResult =
  | { ok: true; users: UserLookupResult[] }
  | { ok: false; error: string };

/**
 * Searches for Kalnehi users by email using the Supabase Admin REST API
 * (the JS client does not expose a getUserByEmail method).
 * Returns up to 5 matches for confirmation before linking.
 * Platform-admin only.
 */
export async function lookupUserByEmailAction(
  email: string,
): Promise<LookupUserByEmailResult> {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Not authenticated." };

  const isAdmin = await isAdminUser(user.id, user.email ?? undefined);
  if (!isAdmin) return { ok: false, error: "Forbidden." };

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();
  if (!supabaseUrl || !serviceKey) {
    return { ok: false, error: "Service unavailable." };
  }

  const trimmedEmail = email.trim().toLowerCase();
  if (!trimmedEmail) return { ok: false, error: "Email is required." };

  try {
    const res = await fetch(
      `${supabaseUrl}/auth/v1/admin/users?email=${encodeURIComponent(trimmedEmail)}&page=1&per_page=5`,
      {
        headers: {
          Authorization: `Bearer ${serviceKey}`,
          apikey: serviceKey,
        },
        cache: "no-store",
      },
    );

    if (!res.ok) {
      const body = await res.text();
      return { ok: false, error: `Auth API error: ${res.status} — ${body}` };
    }

    const json = (await res.json()) as {
      users: Array<{
        id: string;
        email?: string;
        user_metadata?: { full_name?: string };
      }>;
    };

    const users: UserLookupResult[] = (json.users ?? [])
      .filter((u) => u.email?.toLowerCase().includes(trimmedEmail))
      .slice(0, 5)
      .map((u) => ({
        id: u.id,
        email: u.email ?? "",
        full_name: u.user_metadata?.full_name ?? null,
      }));

    return { ok: true, users };
  } catch (err) {
    return {
      ok: false,
      error: err instanceof Error ? err.message : "Unknown error.",
    };
  }
}

import { listAllAuthUsers } from "@/lib/admin/authUsers";
import { getSupabaseServiceRoleClient } from "@/lib/supabase/serviceRoleClient";

import type { Database } from "@/types/supabase";

type UserProfileRow = Database["public"]["Tables"]["user_profiles"]["Row"];

const AUTH_COLUMNS = ["email", "auth_phone", "signup_at", "last_sign_in_at"] as const;

export type UserExportAuthFields = {
  email: string | null;
  auth_phone: string | null;
  signup_at: string | null;
  last_sign_in_at: string | null;
};

export type UserExportRow = UserExportAuthFields & UserProfileRow;

export const USER_EXPORT_AUTH_COLUMNS = AUTH_COLUMNS;

const PROFILE_PAGE_SIZE = 1000;

async function getAdminUserIds(
  admin: NonNullable<ReturnType<typeof getSupabaseServiceRoleClient>>,
): Promise<Set<string>> {
  const { data: adminRows } = await admin.from("admin_users").select("user_id");
  return new Set(
    ((adminRows ?? []) as { user_id: string }[]).flatMap((r) => (r.user_id ? [r.user_id] : [])),
  );
}

async function fetchAllUserProfiles(
  admin: NonNullable<ReturnType<typeof getSupabaseServiceRoleClient>>,
): Promise<UserProfileRow[]> {
  const all: UserProfileRow[] = [];

  for (let page = 0; page < 100; page++) {
    const from = page * PROFILE_PAGE_SIZE;
    const to = from + PROFILE_PAGE_SIZE - 1;
    // react-doctor-disable-next-line react-doctor/async-await-in-loop -- paginated fetch until batch is partial
    const { data, error } = await admin
      .from("user_profiles")
      .select("*")
      .not("user_id", "is", null)
      .order("updated_at", { ascending: false })
      .range(from, to);

    if (error) {
      console.error("[exportAllUsersForAdmin] profile page", page, error.message);
      break;
    }

    const batch = (data ?? []) as UserProfileRow[];
    all.push(...batch);
    if (batch.length < PROFILE_PAGE_SIZE) break;
  }

  return all;
}

export async function exportAllUsersForAdmin(): Promise<UserExportRow[]> {
  const admin = getSupabaseServiceRoleClient();
  if (!admin) return [];

  const [adminIds, profiles, authUsers] = await Promise.all([
    getAdminUserIds(admin),
    fetchAllUserProfiles(admin),
    listAllAuthUsers(admin),
  ]);

  const authById = new Map(
    authUsers.map((u) => [
      u.id,
      {
        email: u.email ?? null,
        auth_phone: u.phone ?? null,
        signup_at: u.created_at ?? null,
        last_sign_in_at: u.last_sign_in_at ?? null,
      } satisfies UserExportAuthFields,
    ]),
  );

  const rows: UserExportRow[] = [];

  for (const profile of profiles) {
    const userId = profile.user_id;
    if (!userId || adminIds.has(userId)) continue;

    const auth = authById.get(userId) ?? {
      email: null,
      auth_phone: null,
      signup_at: null,
      last_sign_in_at: null,
    };

    rows.push({ ...auth, ...profile });
  }

  return rows;
}

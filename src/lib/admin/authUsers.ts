import type { User } from "@supabase/supabase-js";

import type { Database } from "@/types/supabase";
import type { SupabaseClient } from "@supabase/supabase-js";

type AdminClient = SupabaseClient<Database>;

const MAX_PAGES = 100;

/**
 * Lists auth users (paginated). Caps at MAX_PAGES * perPage to avoid runaway memory.
 */
export async function listAllAuthUsers(
  admin: AdminClient,
  perPage = 1000,
): Promise<User[]> {
  const all: User[] = [];
  for (let page = 1; page <= MAX_PAGES; page++) {
    // react-doctor-disable-next-line react-doctor/async-await-in-loop -- pagination loop: next page only fetched if current page was full
    const { data, error } = await admin.auth.admin.listUsers({ page, perPage });
    if (error) {
      console.error("[admin] listUsers page", page, error.message);
      break;
    }
    const batch = data.users;
    all.push(...batch);
    if (batch.length < perPage) break;
  }
  return all;
}

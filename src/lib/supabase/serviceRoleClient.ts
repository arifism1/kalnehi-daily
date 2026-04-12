import { createClient } from "@supabase/supabase-js";

import type { Database } from "@/types/supabase";

/**
 * Service-role client for trusted server routes after the user is verified via
 * `createSupabaseServerClient().auth.getUser()`. Bypasses RLS; always filter by `user_id`.
 */
export function getSupabaseServiceRoleClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();
  if (!url || !key) return null;
  return createClient<Database>(url, key, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

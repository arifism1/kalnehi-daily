import type { SupabaseClient } from "@supabase/supabase-js";

import type { Database } from "@/types/supabase";
import { getSupabaseServiceRoleClient } from "@/lib/supabase/serviceRoleClient";

/** Service-role client without generated table constraints (new migrations before `types:supabase`). */
export function getSupabaseServiceRoleUntyped(): SupabaseClient | null {
  const client = getSupabaseServiceRoleClient();
  if (!client) return null;
  return client as unknown as SupabaseClient;
}

export type TypedServiceRole = NonNullable<ReturnType<typeof getSupabaseServiceRoleClient>>;

/** Escape hatch for tables/RPCs not yet in `src/types/supabase.ts`. */
export function asUntypedServiceRole(admin: TypedServiceRole): SupabaseClient {
  return admin as unknown as SupabaseClient;
}

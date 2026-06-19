/**
 * Resolves the current user's FIZAKI role from their org membership.
 * Defensive: any failure (no session, no membership) falls back to "rep" so the rep
 * surface always renders. Manager/admin-only screens additionally re-check server-side.
 */
import "server-only";

import { createSupabaseServerClient } from "@/lib/supabase/server";

import { toFizakiRole, type FizakiRole } from "./roles";

export async function resolveFizakiRole(): Promise<FizakiRole> {
  try {
    const supabase = await createSupabaseServerClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return "rep";

    const { data } = await supabase
      .from("user_organization_memberships")
      .select("role")
      .eq("user_id", user.id)
      .maybeSingle();

    return toFizakiRole((data as { role?: string } | null)?.role);
  } catch {
    return "rep";
  }
}

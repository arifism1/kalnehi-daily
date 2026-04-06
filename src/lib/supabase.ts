import { createBrowserClient } from "@supabase/ssr";
import type { SupabaseClient } from "@supabase/supabase-js";

import type { Database } from "@/types/supabase";
import { toUserFacingMessage } from "@/lib/userFacingErrors";

export function getSupabaseConfig(): { url: string; anonKey: string } {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !anonKey) {
    throw new Error(
      "Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY",
    );
  }

  return { url, anonKey };
}

/**
 * Browser client must use @supabase/ssr so the session lives in cookies (same
 * storage the server reads). A plain supabase-js client uses localStorage by
 * default, so server actions never see the user → "Unauthorized".
 */
export function getSupabaseBrowserClient(): SupabaseClient<Database> {
  if (typeof window === "undefined") {
    throw new Error("getSupabaseBrowserClient is browser-only");
  }
  const { url, anonKey } = getSupabaseConfig();
  return createBrowserClient<Database>(url, anonKey);
}

/**
 * One-time: copy session from legacy localStorage (old plain client) into
 * cookie-backed storage so existing users stay signed in after the switch.
 */
export async function migrateLegacyLocalStorageSession(
  supabase: SupabaseClient<Database>,
): Promise<void> {
  if (typeof window === "undefined") return;
  const {
    data: { session },
  } = await supabase.auth.getSession();
  if (session) return;

  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (!key?.startsWith("sb-") || !key.includes("auth-token")) continue;
    const raw = localStorage.getItem(key);
    if (!raw) continue;
    try {
      const parsed = JSON.parse(raw) as {
        access_token?: string;
        refresh_token?: string;
      };
      const { access_token, refresh_token } = parsed;
      if (typeof access_token === "string" && typeof refresh_token === "string") {
        const { error } = await supabase.auth.setSession({
          access_token,
          refresh_token,
        });
        if (!error) return;
      }
    } catch {
      /* ignore invalid JSON */
    }
  }
}

/**
 * Safe string for any UI that surfaces sync/API failures — never raw backend text.
 */
export function formatSupabaseError(err: unknown): string {
  return toUserFacingMessage(err);
}

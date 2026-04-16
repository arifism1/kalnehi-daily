import { createServerClient } from "@supabase/ssr";
import type { NextRequest, NextResponse } from "next/server";

import type { Database } from "@/types/supabase";
import { getSupabaseConfig } from "@/lib/supabase";

/**
 * Supabase browser session cookies must be set on the Route Handler response.
 * Use this for POST /api/auth/* so Set-Cookie is applied to the returned JSON response.
 */
export function createSupabaseRouteHandlerClient(
  request: NextRequest,
  response: NextResponse,
) {
  const { url, anonKey } = getSupabaseConfig();
  return createServerClient<Database>(url, anonKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value, options }) => {
          response.cookies.set(name, value, options);
        });
      },
    },
  });
}

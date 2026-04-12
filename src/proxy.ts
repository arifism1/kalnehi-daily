import { createServerClient } from "@supabase/ssr";
import { type NextRequest, NextResponse } from "next/server";

import { getSupabaseConfig } from "@/lib/supabase";

function tryWwwToApexRedirect(request: NextRequest): NextResponse | null {
  const raw = process.env.NEXT_PUBLIC_SITE_URL?.trim();
  if (!raw) return null;
  let canonicalHost: string;
  try {
    const u = new URL(raw.startsWith("http") ? raw : `https://${raw}`);
    canonicalHost = u.hostname;
  } catch {
    return null;
  }
  const host = request.headers.get("host")?.split(":")[0] ?? "";
  if (!host || host === "localhost" || host.startsWith("127.")) return null;
  if (host === `www.${canonicalHost}`) {
    const url = request.nextUrl.clone();
    url.hostname = canonicalHost;
    url.protocol = "https:";
    return NextResponse.redirect(url, 308);
  }
  return null;
}

/**
 * Refreshes the auth session cookie on each navigation so server actions and
 * Route Handlers see the same user as the browser.
 *
 * Next.js 16+: `proxy` replaces the deprecated `middleware` file convention.
 */
export async function proxy(request: NextRequest) {
  const apex = tryWwwToApexRedirect(request);
  if (apex) return apex;

  const supabaseResponse = NextResponse.next({
    request,
  });

  const { url, anonKey } = getSupabaseConfig();

  const supabase = createServerClient(url, anonKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value, options }) =>
          supabaseResponse.cookies.set(name, value, options),
        );
      },
    },
  });

  await supabase.auth.getUser();

  return supabaseResponse;
}

export const config = {
  matcher: [
    /*
     * Match all request paths except static files and Next internals.
     */
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};

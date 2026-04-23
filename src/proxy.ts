/**
 * Request proxy (Next.js 16+): refreshes the Supabase session cookie and runs
 * `getUser()` on matched navigations. Also applies per-IP rate limiting on
 * public payment/waitlist API routes.
 *
 * **TTFB / perceived load:** Document requests pay for `getUser()` (JWT validation
 * round trip to Supabase) before HTML is returned. High WiFi throughput does not
 * remove that latency. To diagnose: DevTools → Network → first document → Timing
 * (TTFB). Compare with cold vs warm function; correlate with Supabase Auth
 * response times in production monitoring.
 */
import { createServerClient } from "@supabase/ssr";
import { type NextRequest, NextResponse } from "next/server";

import { isLegalPath } from "@/lib/legal-paths";
import { isPublicMarketingPath } from "@/lib/public-paths";
import { getSupabaseConfig } from "@/lib/supabase";

// ── Rate limiting ─────────────────────────────────────────────────────────────
// Per-IP, per-minute limits on public payment and waitlist endpoints.
const RATE_LIMITS: Record<string, number> = {
  "/api/waitlist/join":        10,
  "/api/waitlist/skip":        5,
  "/api/waitlist/skip/verify": 10,
  "/api/annual-plan":          5,
  "/api/annual-plan/verify":   10,
  "/api/admin/config":         20,  // Mutations only; low limit to deter abuse
};
const WINDOW_MS = 60_000;
type RLCounter = { count: number; resetAt: number };
const rlCounters = new Map<string, RLCounter>();

function getRealIp(req: NextRequest): string {
  return (
    req.headers.get("x-real-ip") ??
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    "unknown"
  );
}

function applyRateLimit(req: NextRequest): NextResponse | null {
  const limit = RATE_LIMITS[req.nextUrl.pathname];
  if (!limit) return null;

  const key = `${getRealIp(req)}:${req.nextUrl.pathname}`;
  const now = Date.now();
  let entry = rlCounters.get(key);
  if (!entry || now > entry.resetAt) {
    entry = { count: 0, resetAt: now + WINDOW_MS };
    rlCounters.set(key, entry);
  }
  entry.count += 1;

  if (entry.count > limit) {
    return NextResponse.json(
      { ok: false, error: "Too many requests. Please try again in a minute." },
      {
        status: 429,
        headers: {
          "Retry-After": String(Math.ceil((entry.resetAt - now) / 1000)),
          "X-RateLimit-Limit": String(limit),
          "X-RateLimit-Remaining": "0",
        },
      },
    );
  }
  return null;
}

/** HTML and static routes that must work without a session (see AppShell gate). */
function isProxyAuthExempt(pathname: string): boolean {
  if (pathname.startsWith("/api")) return true;
  if (pathname.startsWith("/_next")) return true;
  if (pathname.startsWith("/.well-known")) return true;
  if (pathname === "/sw.js") return true;
  if (pathname === "/offline.html" || pathname === "/manifest.webmanifest") {
    return true;
  }
  if (pathname === "/opengraph-image") return true;
  if (
    pathname === "/sitemap.xml" ||
    pathname === "/robots.txt" ||
    /^\/sitemap-[^/]+\.xml$/.test(pathname)
  ) {
    return true;
  }
  if (pathname === "/auth" || pathname === "/auth/reset") return true;
  if (pathname.startsWith("/auth/callback")) return true;
  if (isLegalPath(pathname)) return true;
  if (isPublicMarketingPath(pathname)) return true;
  return false;
}

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
  const path = request.nextUrl.pathname;
  if (
    path === "/sitemap.xml" ||
    path === "/robots.txt" ||
    /^\/sitemap-[^/]+\.xml$/.test(path)
  ) {
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
 *
 * Refreshes the session on each request; redirects unauthenticated document traffic away
 * from app routes (defense in depth — RLS + getUser() in APIs remains authoritative).
 */
export async function proxy(request: NextRequest) {
  const apex = tryWwwToApexRedirect(request);
  if (apex) return apex;

  const rateLimited = applyRateLimit(request);
  if (rateLimited) return rateLimited;

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

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const pathname = request.nextUrl.pathname;
  if (!user && !isProxyAuthExempt(pathname)) {
    const redirectUrl = request.nextUrl.clone();
    redirectUrl.pathname = "/auth";
    redirectUrl.search = "";
    const redirectResponse = NextResponse.redirect(redirectUrl);
    const refreshed = supabaseResponse.headers.getSetCookie?.() ?? [];
    for (const cookie of refreshed) {
      redirectResponse.headers.append("Set-Cookie", cookie);
    }
    if (refreshed.length === 0) {
      supabaseResponse.headers.forEach((value, key) => {
        if (key.toLowerCase() === "set-cookie") {
          redirectResponse.headers.append("Set-Cookie", value);
        }
      });
    }
    return redirectResponse;
  }

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

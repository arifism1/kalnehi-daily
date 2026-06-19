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
import { createClient } from "@supabase/supabase-js";
import { type NextRequest, NextResponse } from "next/server";

import { ANDROID_APP_UA_MARKER } from "@/lib/androidAppUa";
import { ORG_ID_HEADER } from "@/lib/auth/withOrganization";
import { APP_HOME_PATH } from "@/config/appRoutes";
import { distributedRateLimit } from "@/lib/distributedRateLimit";
import { isLegalPath } from "@/lib/legal-paths";
import { isPublicMarketingPath } from "@/lib/public-paths";
import { getSupabaseConfig } from "@/lib/supabase";
import { grantOrgSubscriptionInternal } from "@/lib/b2b/orgSubscription";
import { VERTICAL_HEADER, resolveVertical } from "@/lib/vertical/resolveVertical";

// ── Rate limiting ─────────────────────────────────────────────────────────────
// Per-IP, per-minute limits on public payment and waitlist endpoints.
// Uses Upstash Redis (distributed) so limits are shared across all Vercel
// function instances rather than being per-isolate in-memory counters.
const RATE_LIMITS: Record<string, number> = {
  "/api/waitlist/join":        10,
  "/api/waitlist/skip":        5,
  "/api/waitlist/skip/verify": 10,
  "/api/annual-plan":          5,
  "/api/annual-plan/verify":   10,
  "/api/six-month-plan":       5,
  "/api/six-month-plan/verify": 10,
  "/api/admin/config":         20,  // Mutations only; low limit to deter abuse
  "/api/dpdp/rights-request":  3,
  "/api/dpdp/record-consent":  10,
  "/api/dpdp/withdraw-consent": 10,
  "/api/dpdp/attest-signup":   10,
  "/api/admin/dpdp/rights-request": 30,
  "/api/admin/dpdp/breach-notify": 10,
  "/api/fizaki/demo-request": 5,
};
const WINDOW_MS = 60_000;

function getRealIp(req: NextRequest): string {
  return (
    req.headers.get("x-real-ip") ??
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    "unknown"
  );
}

async function applyRateLimit(req: NextRequest): Promise<NextResponse | null> {
  const limit = RATE_LIMITS[req.nextUrl.pathname];
  if (!limit) return null;

  const ip = getRealIp(req);
  const key = `rl:proxy:${ip}:${req.nextUrl.pathname}`;
  const result = await distributedRateLimit(key, WINDOW_MS, limit);

  if (!result.allowed) {
    const retryAfterSec = Math.ceil(result.retryAfterMs / 1000);
    return NextResponse.json(
      { ok: false, error: "Too many requests. Please try again in a minute." },
      {
        status: 429,
        headers: {
          "Retry-After": String(retryAfterSec),
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
  if (pathname === "/account") return true;
  if (isLegalPath(pathname)) return true;
  if (isPublicMarketingPath(pathname)) return true;
  return false;
}

/** Capacitor Android shell: hide billing/checkout routes (policy consumption-only app). */
function isAndroidAppBillingBlockedPath(pathname: string): boolean {
  if (pathname === "/pricing" || pathname.startsWith("/pricing/")) return true;
  if (pathname === "/checkout" || pathname.startsWith("/checkout/")) return true;
  if (pathname === "/my-subscription" || pathname.startsWith("/my-subscription/")) return true;
  if (pathname === "/my-plan" || pathname.startsWith("/my-plan/")) return true;
  // Safety net: even if someone deep-links directly to /upgrade, block the
  // Razorpay JS page — payments must happen in Chrome Custom Tabs, not WebView.
  if (pathname === "/upgrade" || pathname.startsWith("/upgrade/")) return true;
  // Waitlist position page includes ₹19 Razorpay skip checkout — block in WebView.
  if (pathname === "/waitlist/position" || pathname.startsWith("/waitlist/position/")) {
    return true;
  }
  return false;
}

/**
 * Refreshes the auth session cookie on each navigation so server actions and
 * Route Handlers see the same user as the browser.
 *
 * Next.js 16+: `proxy` replaces the deprecated `middleware` file convention.
 *
 * Canonical host is www.kalnehi.com. Apex (kalnehi.com) requests are handled
 * by the permanent redirect in next.config.ts before reaching this proxy, so
 * no host-rewriting logic is needed here.
 *
 * Refreshes the session on each request; redirects unauthenticated document traffic away
 * from app routes (defense in depth — RLS + getUser() in APIs remains authoritative).
 */
export async function proxy(request: NextRequest) {
  const rateLimited = await applyRateLimit(request);
  if (rateLimited) return rateLimited;

  const ua = request.headers.get("user-agent") ?? "";
  const pathname = request.nextUrl.pathname;
  if (pathname === "/auth/reset") {
    return NextResponse.redirect(new URL("/auth", request.url), { status: 307 });
  }
  if (
    ua.includes(ANDROID_APP_UA_MARKER) &&
    isAndroidAppBillingBlockedPath(pathname)
  ) {
    return NextResponse.redirect(new URL(APP_HOME_PATH, request.url), { status: 307 });
  }

  const baseResponse = NextResponse.next({ request });

  const { url, anonKey } = getSupabaseConfig();

  const supabase = createServerClient(url, anonKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value, options }) =>
          baseResponse.cookies.set(name, value, options),
        );
      },
    },
  });

  const {
    data: { user },
  } = await supabase.auth.getUser();

  // ── Auth gate (existing logic) ───────────────────────────────────────────────
  if (!user && !isProxyAuthExempt(pathname)) {
    const redirectUrl = request.nextUrl.clone();
    redirectUrl.pathname = "/auth";
    redirectUrl.search = "";
    const redirectResponse = NextResponse.redirect(redirectUrl);
    const refreshed = baseResponse.headers.getSetCookie?.() ?? [];
    for (const cookie of refreshed) {
      redirectResponse.headers.append("Set-Cookie", cookie);
    }
    if (refreshed.length === 0) {
      baseResponse.headers.forEach((value, key) => {
        if (key.toLowerCase() === "set-cookie") {
          redirectResponse.headers.append("Set-Cookie", value);
        }
      });
    }
    return redirectResponse;
  }

  // ── B2B org membership sync ───────────────────────────────────────────────
  // Reads organization_id from JWT app_metadata (written here on first sync).
  // Only performs a DB round-trip when the key is absent (undefined), meaning
  // this user has never been synced. Once set (UUID or null), the JWT claim
  // is trusted until it naturally expires and refreshes (~1h Supabase default)
  // or until a B2B admin action calls supabase.auth.admin.updateUser directly.
  //
  // Fix for Supabase JWT refresh delay: after updateUser, we call refreshSession()
  // server-side so the CURRENT request already carries the updated app_metadata
  // when RLS evaluates get_org_id_from_jwt(). The new cookie is written to
  // baseResponse so the browser is also updated in the same round-trip.
  //
  // IMPORTANT: user.app_metadata is the in-memory snapshot from getUser() above.
  // syncOrgMembership() returns the freshly-resolved org_id so we can use it for
  // the current request even before the refreshed JWT propagates to the user object.
  let orgIdForHeader: string | null =
    user?.app_metadata?.organization_id ?? null;

  if (user && !isProxyAuthExempt(pathname)) {
    const existingOrgId: string | undefined =
      user.app_metadata?.organization_id;

    if (existingOrgId === undefined) {
      // First time this user has been seen — fetch their membership from DB.
      // Use the returned value directly; the stale user object won't reflect it.
      orgIdForHeader = await syncOrgMembership(
        user.id,
        user.email ?? undefined,
        supabase,
        baseResponse,
      );
    }
  }
  // Resolve the brand vertical from the request host (source of truth in prod;
  // NEXT_PUBLIC_VERTICAL is the local/per-project fallback) and forward it so
  // Server Components / Route Handlers read it via getServerVertical().
  const verticalId = resolveVertical(request.headers.get("host"));

  const requestHeaders = new Headers(request.headers);
  requestHeaders.set(VERTICAL_HEADER, verticalId);
  if (orgIdForHeader) {
    requestHeaders.set(ORG_ID_HEADER, orgIdForHeader);
  }

  // Always forward the updated request headers (x-vertical + optional org id).
  const finalResponse = NextResponse.next({ request: { headers: requestHeaders } });
  // Copy refreshed session cookies from baseResponse onto finalResponse.
  baseResponse.headers.getSetCookie?.().forEach((cookie) => {
    finalResponse.headers.append("Set-Cookie", cookie);
  });
  // Host-keyed caching: each brand domain deploys as its OWN Vercel project with a
  // baked NEXT_PUBLIC_VERTICAL, so the CDN cache namespace is already per-host — a
  // cached response cannot bleed across brands. The x-vertical request header above
  // makes host resolution explicit for Server Components within a single deployment.
  return finalResponse;
}

// ── Org membership sync helper ────────────────────────────────────────────────

/**
 * Queries user_organization_memberships for `userId` and writes the result
 * into auth.jwt() app_metadata via the Admin API. Then immediately calls
 * refreshSession() so the CURRENT request's JWT carries the updated claim
 * before any Server Component runs (eliminates the Supabase JWT refresh delay).
 *
 * Returns the resolved organization_id (or null for B2C users) so the caller
 * can use it for the current request without re-reading the now-stale user object.
 */
async function syncOrgMembership(
  userId: string,
  userEmail: string | undefined,
  supabase: ReturnType<typeof createServerClient>,
  response: NextResponse,
): Promise<string | null> {
  try {
    const { url } = getSupabaseConfig();
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();
    if (!serviceKey) return null;

    const adminClient = createClient(url, serviceKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });

    // Look up the user's org membership (at most one row due to UNIQUE constraint).
    const { data: membership } = await adminClient
      .from("user_organization_memberships")
      .select("organization_id")
      .eq("user_id", userId)
      .maybeSingle();

    let organizationId: string | null = membership?.organization_id ?? null;

    // If no active membership, check the pre-approved email allowlist.
    // This auto-enrolls users who signed up after an admin added their email
    // via the admin panel (org_email_invitations table).
    if (!organizationId && userEmail) {
      const { data: invite } = await adminClient
        .from("org_email_invitations")
        .select("id, organization_id, batch_id, role, full_name")
        .eq("email", userEmail.toLowerCase())
        .is("accepted_at", null)
        .maybeSingle();

      if (invite) {
        const inv = invite as {
          id: string;
          organization_id: string;
          batch_id: string | null;
          role: string;
          full_name: string | null;
        };

        await adminClient.from("user_organization_memberships").upsert(
          {
            user_id: userId,
            organization_id: inv.organization_id,
            batch_id: inv.batch_id ?? null,
            role: inv.role,
          },
          { onConflict: "user_id,organization_id" },
        );

        await adminClient
          .from("org_email_invitations")
          .update({ accepted_at: new Date().toISOString() })
          .eq("id", inv.id);

        // Grant Smart Plan immediately — the student should never see the paywall.
        await grantOrgSubscriptionInternal(adminClient, userId);

        // Pre-fill full_name on user_profiles if the invite had one and the
        // profile field is currently empty (don't overwrite a name the user set).
        if (inv.full_name) {
          const { data: existingProfile } = await adminClient
            .from("user_profiles")
            .select("full_name")
            .eq("user_id", userId)
            .maybeSingle();
          const ep = existingProfile as { full_name?: string | null } | null;
          if (!ep?.full_name) {
            await adminClient
              .from("user_profiles")
              .update({
                full_name: inv.full_name,
                updated_at: new Date().toISOString(),
              })
              .eq("user_id", userId);
          }
        }

        organizationId = inv.organization_id;
      }
    }

    // Write to app_metadata.
    await adminClient.auth.admin.updateUserById(userId, {
      app_metadata: { organization_id: organizationId },
    });

    // Only refresh when a real org was assigned — B2C/admin users (null)
    // don't need org_id in their JWT, and the extra rotation causes a
    // double-refresh that invalidates the session in the admin layout.
    if (organizationId !== null) {
      const { data: refreshed } = await supabase.auth.refreshSession();
      if (refreshed.session) {
        // Cookies are set on the supabase client's response via the setAll callback
        // bound to `response` — nothing extra needed here.
        void refreshed;
      }
    }

    return organizationId;
  } catch {
    // Non-fatal: B2C fallback. The JWT sync will be retried on the next request
    // because app_metadata.organization_id remains undefined.
    return null;
  }
}

export const config = {
  matcher: [
    /*
     * Match all request paths except static files and Next internals.
     */
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};

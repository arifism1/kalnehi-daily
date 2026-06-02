/**
 * Request proxy (Next.js 16+): refreshes the Supabase session cookie and runs
 * `getUser()` on matched navigations. Also applies per-IP rate limiting on
 * public payment/waitlist API routes, and enforces the global kill switch via
 * Vercel Edge Config (sub-millisecond read, instant propagation).
 *
 * **Kill switch flow (when app is disabled):**
 *  1. readAppStatus() reads from Edge Config (< 1 ms in production).
 *  2. Non-exempt paths get blocked; admin users always bypass.
 *  3. Page requests receive full maintenance HTML (HTTP 503).
 *     API requests receive JSON { error: "maintenance" } (HTTP 503).
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
import { readAppStatus, type AppStatus } from "@/lib/edgeConfig";
import { grantOrgSubscriptionInternal } from "@/lib/b2b/orgSubscription";

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

// ── Kill switch ───────────────────────────────────────────────────────────────

/**
 * Paths that bypass the kill switch entirely.
 * These must be reachable even when the app is offline:
 *  - /auth* so admins can log in when their session expires during an outage.
 *  - /api/app-status so the maintenance screen refresh button can poll.
 *  - Legal pages (ToS / Privacy) — always publicly accessible.
 */
function isKillSwitchExempt(pathname: string): boolean {
  if (pathname === "/account") return true;
  if (pathname === "/upgrade") return true;
  if (pathname === "/auth" || pathname === "/auth/reset") return true;
  if (pathname.startsWith("/auth/callback")) return true;
  if (pathname === "/api/app-status") return true;
  // /maintenance is the redirect target for blocked requests — must be exempt
  // to avoid an infinite redirect loop.
  if (pathname === "/maintenance") return true;
  if (isLegalPath(pathname)) return true;
  return false;
}

// Module-level cache for admin check results (30 s) so repeated requests
// from an admin while the app is offline don't hammer the DB.
const _adminCache = new Map<string, { result: boolean; expiresAt: number }>();
const ADMIN_CACHE_TTL_MS = 30_000;

async function isAdminInProxy(userId: string, email?: string | null): Promise<boolean> {
  const now = Date.now();
  const cached = _adminCache.get(userId);
  if (cached && now < cached.expiresAt) return cached.result;

  try {
    const { url } = getSupabaseConfig();
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();
    if (!serviceKey) return false;

    const admin = createClient(url, serviceKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });

    // Try by user_id first, then by email.
    const { data: byId } = await admin
      .from("admin_users")
      .select("user_id")
      .eq("user_id", userId)
      .maybeSingle();
    if (byId) {
      _adminCache.set(userId, { result: true, expiresAt: now + ADMIN_CACHE_TTL_MS });
      return true;
    }

    if (email) {
      const { data: byEmail } = await admin
        .from("admin_users")
        .select("user_id")
        .eq("email", email)
        .maybeSingle();
      if (byEmail) {
        _adminCache.set(userId, { result: true, expiresAt: now + ADMIN_CACHE_TTL_MS });
        return true;
      }
    }
  } catch {
    // Fail closed — if admin check throws, deny admin bypass and show maintenance screen.
  }

  _adminCache.set(userId, { result: false, expiresAt: now + ADMIN_CACHE_TTL_MS });
  return false;
}

function _esc(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function buildMaintenanceHtml(status: AppStatus): string {
  const { maintenance_title, maintenance_message, maintenance_eta } = status;
  const etaHtml = maintenance_eta
    ? `<p class="eta">Expected back: ${_esc(maintenance_eta)}</p>`
    : "";

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width,initial-scale=1" />
  <title>Kalnehi Daily — Maintenance</title>
  <style>
    *{box-sizing:border-box;margin:0;padding:0}
    body{background:#FAF7F2;color:#1A1714;font-family:'DM Sans',system-ui,-apple-system,sans-serif;min-height:100dvh;display:flex;flex-direction:column;align-items:center;justify-content:center;padding:2.5rem 1.5rem;text-align:center}
    .logo{width:52px;height:52px;margin-bottom:2rem;background:#FF7A00;border-radius:14px;display:inline-flex;align-items:center;justify-content:center;color:#fff;font-size:1.5rem;font-weight:700}
    h1{font-family:'DM Serif Display',Georgia,serif;font-size:clamp(2rem,5vw,2.75rem);font-weight:400;color:#1A1714;margin-bottom:1rem;line-height:1.2}
    .msg{font-size:1rem;color:#5C5349;line-height:1.7;max-width:38ch;margin:0 auto 1.5rem}
    .eta{color:#8B7355;font-size:0.875rem;margin-bottom:1.5rem}
    hr{border:none;border-top:1px solid #E8E2D8;width:3rem;margin:0 auto 1.5rem}
    .btn{display:inline-block;padding:0.625rem 1.75rem;border:1.5px solid #1A1714;border-radius:8px;background:transparent;color:#1A1714;font-size:0.9375rem;cursor:pointer;transition:opacity .15s;font-family:inherit;letter-spacing:.01em}
    .btn:hover{opacity:.6}
    .btn:disabled{opacity:.35;cursor:default}
    #status-msg{color:#5C5349;font-size:0.8125rem;margin-top:.75rem;min-height:1.25em}
    .social{color:#8B7355;font-size:0.8125rem;margin-top:1.5rem}
    .tagline{color:#C4B8A8;font-size:0.6875rem;margin-top:auto;padding-top:2.5rem;letter-spacing:.1em;text-transform:uppercase}
  </style>
</head>
<body>
  <div class="logo" aria-hidden="true">K</div>
  <h1>${_esc(maintenance_title)}</h1>
  <p class="msg">${_esc(maintenance_message)}</p>
  ${etaHtml}
  <hr />
  <button class="btn" id="refreshBtn" onclick="checkStatus()">Refresh</button>
  <p id="status-msg"></p>
  <p class="social">Follow <strong>@kalnehi</strong> on Instagram for updates</p>
  <p class="tagline">Win Daily.</p>
  <script>
    var cd=0;
    function checkStatus(){
      var btn=document.getElementById('refreshBtn');
      var msg=document.getElementById('status-msg');
      if(cd>0)return;
      btn.disabled=true;cd=10;
      var t=setInterval(function(){
        cd--;
        if(cd<=0){clearInterval(t);btn.disabled=false;btn.textContent='Refresh';}
        else{btn.textContent='Refresh ('+cd+'s)';}
      },1000);
      fetch('/api/app-status').then(function(r){return r.json();}).then(function(d){
        if(d.app_enabled){location.reload();}
        else{msg.textContent="Still offline \u2014 we\u2019ll be back soon.";}
      }).catch(function(){
        msg.textContent="Couldn\u2019t check status. Try again shortly.";
      });
    }
  </script>
</body>
</html>`;
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

  // Run auth + Edge Config read in parallel — no added latency in production.
  const [{ data: { user } }, appStatus] = await Promise.all([
    supabase.auth.getUser(),
    readAppStatus(),
  ]);

  // ── Kill switch enforcement ──────────────────────────────────────────────────
  // Only runs the admin DB check when the app is actually disabled.
  // Normal (app enabled) path: zero extra overhead beyond the Edge Config read.
  if (!appStatus.app_enabled && !isKillSwitchExempt(pathname)) {
    const adminOk = user
      ? await isAdminInProxy(user.id, user.email)
      : false;

    if (!adminOk) {
      // API routes → JSON 503 (callers expect JSON, not HTML).
      if (pathname.startsWith("/api/")) {
        return new Response(
          JSON.stringify({
            error: "maintenance",
            message: appStatus.maintenance_message,
          }),
          {
            status: 503,
            headers: {
              "Content-Type": "application/json",
              "Retry-After": "30",
            },
          },
        );
      }

      // Page navigations AND RSC requests (client-side navigation) →
      // redirect to /maintenance so the browser makes a fresh full HTML
      // request. The root layout's KillSwitchGuard intercepts and renders
      // the MaintenanceScreen. This avoids the broken JSON-503-for-RSC
      // problem where the Next.js router shows an error overlay instead
      // of the maintenance page.
      return NextResponse.redirect(new URL("/maintenance", request.url), {
        status: 307,
      });
    }
  }

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
  const requestHeaders = new Headers(request.headers);
  if (orgIdForHeader) {
    requestHeaders.set(ORG_ID_HEADER, orgIdForHeader);
  }

  // Re-create baseResponse with the updated request headers if needed.
  // We only need to do this when there's an org to forward.
  if (orgIdForHeader) {
    const finalResponse = NextResponse.next({ request: { headers: requestHeaders } });
    // Copy session cookies from baseResponse onto finalResponse.
    baseResponse.headers.getSetCookie?.().forEach((cookie) => {
      finalResponse.headers.append("Set-Cookie", cookie);
    });
    return finalResponse;
  }

  return baseResponse;
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

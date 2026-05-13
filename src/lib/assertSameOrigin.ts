import { getTrustedBrowserOrigins } from "@/lib/site";

/**
 * Defense-in-depth CSRF protection for cookie-authenticated mutating routes.
 *
 * Checks the `Origin` header against the canonical site origin. Requests with
 * no `Origin` header (server-to-server, cron, webhooks) are passed through
 * because those callers don't send `Origin`.
 *
 * Exemptions — do NOT use this helper on:
 *   - POST /api/razorpay/webhook  (Razorpay HMAC; no cookie session)
 *   - GET  /api/cron/*            (bearer secret; no cookie session)
 *   - POST /api/waitlist/join     (anonymous-capable; non-browser callers expected)
 *   - POST /api/referral/event    (anonymous analytics; no session)
 *   - POST /api/public/landing-visit (anonymous beacon; origin-checked)
 *
 * Returns a Response when the request should be rejected, null otherwise.
 * Call this at the very top of the handler before reading the body.
 *
 * @example
 *   const denied = assertSameOrigin(request);
 *   if (denied) return denied;
 */
export function assertSameOrigin(req: Request): Response | null {
  const origin = req.headers.get("origin");
  // No Origin header → non-browser caller (cron, webhook, server-to-server) — allow.
  if (!origin) return null;

  const allowed = new Set(getTrustedBrowserOrigins());

  if (!allowed.has(origin)) {
    return new Response(
      JSON.stringify({ ok: false, error: "Forbidden." }),
      {
        status: 403,
        headers: { "Content-Type": "application/json" },
      },
    );
  }

  return null;
}

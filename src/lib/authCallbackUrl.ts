/**
 * OAuth / identity-link redirect target for Supabase Auth (PKCE callback).
 * Must stay in sync with {@link src/app/auth/callback/route.ts}.
 */
export function buildAuthCallbackUrl(nextPath: string): string {
  const origin =
    typeof window !== "undefined"
      ? window.location.origin
      : (process.env.NEXT_PUBLIC_SITE_URL ?? "");
  const normalizedOrigin = origin.replace(/\/+$/, "");
  const next = encodeURIComponent(nextPath.startsWith("/") ? nextPath : `/${nextPath}`);
  if (!normalizedOrigin) return `/auth/callback?next=${next}`;
  return `${normalizedOrigin}/auth/callback?next=${next}`;
}

import { isLegalPath } from "@/lib/legal-paths";
import { isPublicMarketingPath } from "@/lib/public-paths";

/**
 * Signed-in users without active paid access may use these routes without the
 * full-screen paywall overlay. Must stay aligned with [`AppShell`](src/components/AppShell.tsx).
 */
export function isPaidAccessOverlayExemptPath(pathname: string): boolean {
  if (
    pathname === "/pricing" ||
    pathname === "/my-subscription" ||
    pathname === "/my-plan" ||
    pathname === "/account" ||
    pathname === "/upgrade"
  ) {
    return true;
  }
  if (isLegalPath(pathname)) return true;
  if (isPublicMarketingPath(pathname)) return true;
  return false;
}

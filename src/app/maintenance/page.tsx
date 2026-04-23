/**
 * /maintenance — redirect target used by proxy.ts when the kill switch is on.
 *
 * The proxy redirects ALL blocked non-API requests here (both full-page loads
 * and RSC client-side navigation requests). Because this path is exempt from
 * the proxy kill switch check, there is no redirect loop.
 *
 * The root layout wraps this page with KillSwitchGuard. When the app is
 * offline, KillSwitchGuard renders MaintenanceScreen in place of this
 * page's content — so the maintenance UI is always shown correctly.
 *
 * When the app is back online (proxy no longer redirects here), any user
 * who lands on /maintenance directly is sent home.
 */
import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

export default function MaintenancePage() {
  // App is online — this page was visited directly, not via proxy redirect.
  redirect("/");
}

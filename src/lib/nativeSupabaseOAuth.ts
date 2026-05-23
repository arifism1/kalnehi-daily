import { Capacitor } from "@capacitor/core";
import type { AuthError } from "@supabase/supabase-js";

/** Chrome Custom Tabs toolbar — matches Kalnehi accent used in checkout. */
const OAUTH_TOOLBAR_COLOR = "#FF7A00";

export function isNativeKalnehiShell(): boolean {
  return Capacitor.isNativePlatform();
}

export function isNativeOAuthCallbackUrl(url: URL): boolean {
  return url.pathname === "/auth/callback";
}

type OAuthInitResult = {
  data: { url?: string | null; provider?: string } | null;
  error: AuthError | null;
};

/**
 * Starts Supabase OAuth in Chrome Custom Tabs (Android shell).
 * PKCE verifier stays in the WebView cookie jar; the callback must load in the
 * WebView via App Link / deep link so `/auth/callback` can exchange the code.
 */
export async function startNativeSupabaseOAuthFlow(
  initiate: () => Promise<OAuthInitResult>,
): Promise<void> {
  const { data, error } = await initiate();
  if (error) throw error;
  const url = data?.url;
  if (!url) {
    throw new Error("Could not start Google sign-in. Please try again.");
  }
  const { Browser } = await import("@capacitor/browser");
  await Browser.open({ url, toolbarColor: OAUTH_TOOLBAR_COLOR });
}

export async function closeNativeOAuthBrowser(): Promise<void> {
  if (!isNativeKalnehiShell()) return;
  try {
    const { Browser } = await import("@capacitor/browser");
    await Browser.close();
  } catch {
    /* Tab may already be closed when App Link opens the app. */
  }
}

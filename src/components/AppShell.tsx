"use client";

import { Capacitor } from "@capacitor/core";
import { usePathname, useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import { SubscriptionPaywallInterstitial } from "@/components/subscription/SubscriptionPaywallInterstitial";
import { TrialGuard } from "@/components/TrialGuard";
import { ensureFreeTrialStarted } from "@/actions/subscription";
import { trackMetaFreeTrialStarted } from "@/lib/analytics";
import { useSubscriptionAccess } from "@/hooks/useSubscriptionAccess";
import { isLegalPath } from "@/lib/legal-paths";
import { isPaidAccessOverlayExemptPath } from "@/lib/paid-access-exempt-paths";
import { isPublicMarketingPath } from "@/lib/public-paths";
import { APP_HOME_PATH } from "@/config/appRoutes";
import { useAuthStore } from "@/store/useAuthStore";
import { KalShimmerBlock } from "@/components/loading/KalShimmerBlock";
import { KalSpinner } from "@/components/loading/KalSpinner";

function LoadingScreen() {
  return (
    <div
      className="flex min-h-full min-h-dvh flex-1 flex-col bg-kal-page"
      aria-busy="true"
      aria-label="Loading"
    >
      {/* Header skeleton */}
      <div className="kal-glass-header sticky top-0 z-40 pt-[env(safe-area-inset-top)]">
        <div className="mx-auto flex h-14 w-full max-w-7xl items-center justify-between gap-3 px-4 sm:px-6">
          <KalShimmerBlock className="h-7 w-28 rounded-lg" />
          <div className="flex items-center gap-2">
            <KalShimmerBlock className="size-9 rounded-xl" />
            <KalShimmerBlock className="size-9 rounded-xl" />
          </div>
        </div>
      </div>
      {/* Content skeleton */}
      <div className="mx-auto w-full max-w-lg space-y-3 px-4 pt-6 md:max-w-5xl">
        <KalShimmerBlock className="h-6 w-2/5 rounded-lg" />
        <div className="kal-card-surface space-y-3">
          <KalShimmerBlock className="h-4 w-3/4 rounded" />
          <KalShimmerBlock className="h-4 w-1/2 rounded" />
          <KalShimmerBlock className="h-4 w-2/3 rounded" />
        </div>
        <div className="kal-card-surface space-y-3">
          <KalShimmerBlock className="size-4/5 rounded" />
          <KalShimmerBlock className="h-4 w-3/5 rounded" />
        </div>
        <div className="kal-card-surface space-y-3">
          <KalShimmerBlock className="h-4 w-2/3 rounded" />
          <KalShimmerBlock className="h-4 w-1/2 rounded" />
          <KalShimmerBlock className="h-4 w-3/4 rounded" />
        </div>
      </div>
      {/* Centered spinner with branded message */}
      <div className="flex flex-1 items-center justify-center py-12">
        <KalSpinner size="xl" message="Getting your plan ready…" />
      </div>
    </div>
  );
}

function ProfileErrorScreen({ onRetry }: { onRetry: () => void }) {
  return (
    <div className="flex min-h-full min-h-dvh flex-1 flex-col items-center justify-center gap-4 bg-kal-page px-6 text-center">
      <p className="text-sm font-medium text-kal-text">
        Could not load your plan.
      </p>
      <p className="text-xs text-kal-muted">
        Check your connection — your subscription and data are safe.
      </p>
      <button
        type="button"
        onClick={onRetry}
        className="mt-1 inline-flex min-h-[44px] items-center justify-center rounded-xl border border-kal-border bg-kal-card-muted px-5 text-sm font-semibold text-kal-text transition-colors hover:bg-kal-accent hover:text-white"
      >
        Retry
      </button>
    </div>
  );
}

/** Shown on Android when the waitlist position page is blocked (contains Razorpay checkout). */
const ANDROID_DAILY_CAP_MSG =
  "Kalnehi is at capacity for new users today. Please try again tomorrow — your spot is reserved.";
const ANDROID_WAITLIST_QUEUED_MSG =
  "You're on the waitlist. Your spot is reserved — we'll notify you when Kalnehi opens for you.";

/**
 * Shown when onboarding is complete but the welcome trial has never been started
 * (e.g. the user hit a network error during OnboardingWizard's trial-start call,
 * refreshed the page, and ended up with onboardingDone=true but no trial).
 * Automatically calls ensureFreeTrialStarted and routes to waitlist or dashboard.
 */
function TrialStartGate({ refetch }: { refetch: () => void }) {
  const [error, setError] = useState<string | null>(null);

  const startTrial = useCallback(async () => {
    setError(null);
    const isNativeApp = Capacitor.isNativePlatform();
    // Fast-path: already queued in this session — skip the server round-trip.
    if (sessionStorage.getItem("wl_position")) {
      if (isNativeApp) {
        // Android: /waitlist/position is proxy-blocked (Razorpay checkout).
        setError(ANDROID_WAITLIST_QUEUED_MSG);
        return;
      }
      window.location.assign("/waitlist/position");
      return;
    }
    try {
      const result = await ensureFreeTrialStarted();
      if (!result.ok) {
        if (result.error === "daily_cap_reached") {
          const cap = result as {
            ok: false;
            error: "daily_cap_reached";
            position: number;
            opensAt: string;
          };
          sessionStorage.setItem(
            "wl_position",
            JSON.stringify({
              position: cap.position,
              opensAt: cap.opensAt,
              aheadCount: Math.max(0, cap.position - 1),
            }),
          );
          if (isNativeApp) {
            // Android: do not navigate to billing-blocked waitlist page.
            setError(ANDROID_DAILY_CAP_MSG);
            return;
          }
          window.location.assign("/waitlist/position");
          return;
        }
        setError(result.error);
        return;
      }
      if (result.started) trackMetaFreeTrialStarted();
      refetch();
    } catch {
      setError("Something went wrong. Please try again.");
    }
  }, [refetch]);

  useEffect(() => {
    void startTrial();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="flex min-h-full min-h-dvh flex-1 flex-col items-center justify-center gap-4 bg-kal-page px-6 text-center">
      {error ? (
        <>
          <p className="text-sm font-medium text-kal-text">
            Could not start your free trial.
          </p>
          <p className="text-xs text-kal-muted">{error}</p>
          <button
            type="button"
            onClick={() => { void startTrial(); }}
            className="mt-1 inline-flex min-h-[44px] items-center justify-center rounded-xl border border-kal-border bg-kal-card-muted px-5 text-sm font-semibold text-kal-text transition-colors hover:bg-kal-accent hover:text-white"
          >
            Retry
          </button>
        </>
      ) : (
        <KalSpinner size="xl" message="Starting your free trial…" />
      )}
    </div>
  );
}

const AUTH_PATHS = new Set(["/auth", "/auth/reset"]);

function isAuthPath(p: string) {
  return AUTH_PATHS.has(p);
}

/** Allows anonymous session handoff (`?rt=`) and account buffer UI without redirecting to /auth. */
function isAccountBufferPath(p: string): boolean {
  return p === "/account";
}

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();

  const initialized = useAuthStore((s) => s.initialized);
  const session = useAuthStore((s) => s.session);
  const {
    loading: profileLoading,
    fetchError,
    onboardingDone,
    hasPaidAccess,
    freeTrialActive,
    hasHadTrial,
    hasUsedFreeTrial,
    welcomeTrialExpiredNoPay,
    refetch,
  } = useSubscriptionAccess();

  const authed = !!session;

  const allowAppWithoutPaid = hasPaidAccess || freeTrialActive;

  const gateTarget = useMemo(() => {
    if (!initialized) return "wait";
    if (!authed) {
      if (isAuthPath(pathname)) return "render";
      if (isAccountBufferPath(pathname)) return "render";
      if (isPublicMarketingPath(pathname)) return "render";
      if (isLegalPath(pathname)) return "render";
      return "auth";
    }
    if (profileLoading) {
      if (
        isAuthPath(pathname) ||
        isLegalPath(pathname) ||
        isAccountBufferPath(pathname) ||
        pathname === "/upgrade"
      ) {
        return "render";
      }
      return "wait";
    }

    // Profile loaded but with a network/server error — don't redirect to
    // paywall or onboarding; show a retry screen instead.
    if (
      fetchError &&
      !isAuthPath(pathname) &&
      !isLegalPath(pathname) &&
      !isPublicMarketingPath(pathname) &&
      !isAccountBufferPath(pathname)
    ) {
      return "error";
    }

    if (isAuthPath(pathname)) return "home";

    if (!onboardingDone) {
      if (
        pathname === "/onboarding" ||
        pathname === "/account" ||
        pathname === "/upgrade" ||
        isLegalPath(pathname) ||
        isPublicMarketingPath(pathname)
      )
        return "render";
      return "onboarding";
    }

    if (!allowAppWithoutPaid) {
      if (isPaidAccessOverlayExemptPath(pathname)) return "render";
      // Onboarding done but trial never started — auto-start the trial (or route
      // to waitlist). This catches users whose trial-start call failed during
      // onboarding and who refreshed the page.
      if (!hasUsedFreeTrial && !hasHadTrial && !welcomeTrialExpiredNoPay) return "trialStart";
      return "paywallRender";
    }

    if (pathname === "/onboarding") return "home";

    // Logged-in subscribers can still read the blog, pricing, tools, and other
    // marketing pages. Only the main landings send them into the app.
    if (isPublicMarketingPath(pathname)) {
      if (pathname === "/" || pathname === "/kalnehi-daily") return "home";
      return "render";
    }

    return "render";
  }, [
    initialized,
    authed,
    profileLoading,
    fetchError,
    onboardingDone,
    allowAppWithoutPaid,
    hasHadTrial,
    hasUsedFreeTrial,
    welcomeTrialExpiredNoPay,
    pathname,
  ]);

  useEffect(() => {
    switch (gateTarget) {
      case "auth":
        router.replace("/auth");
        break;
      case "home":
        router.replace(APP_HOME_PATH);
        break;
      case "onboarding":
        router.replace("/onboarding");
        break;
    }
  }, [gateTarget, router]);

  if (gateTarget === "error") {
    return (
      <main className="flex min-h-0 min-h-dvh flex-1 flex-col pl-[env(safe-area-inset-left)] pr-[env(safe-area-inset-right)]">
        <ProfileErrorScreen onRetry={refetch} />
      </main>
    );
  }

  if (gateTarget === "trialStart") {
    return (
      <main className="flex min-h-0 min-h-dvh flex-1 flex-col pl-[env(safe-area-inset-left)] pr-[env(safe-area-inset-right)]">
        <TrialStartGate refetch={refetch} />
      </main>
    );
  }

  if (gateTarget !== "render" && gateTarget !== "paywallRender") {
    return (
      <main className="flex min-h-0 min-h-dvh flex-1 flex-col pl-[env(safe-area-inset-left)] pr-[env(safe-area-inset-right)]">
        <LoadingScreen />
      </main>
    );
  }

  return (
    <main
      id="kalnehi-main"
      className="flex min-h-0 min-h-dvh flex-1 flex-col pl-[env(safe-area-inset-left)] pr-[env(safe-area-inset-right)]"
    >
      {gateTarget === "paywallRender" ? (
        <>
          {welcomeTrialExpiredNoPay ? (
            <TrialGuard>{children}</TrialGuard>
          ) : (
            <>
              <div
                className="flex min-h-0 min-h-dvh flex-1 flex-col"
                aria-hidden="true"
                inert
              >
                {children}
              </div>
              <SubscriptionPaywallInterstitial freeTrialEnded={false} />
            </>
          )}
        </>
      ) : (
        children
      )}
    </main>
  );
}

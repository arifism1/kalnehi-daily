"use client";

import { usePathname, useRouter } from "next/navigation";
import { useEffect, useMemo } from "react";
import { SubscriptionPaywallInterstitial } from "@/components/subscription/SubscriptionPaywallInterstitial";
import { useSubscriptionAccess } from "@/hooks/useSubscriptionAccess";
import { isLegalPath } from "@/lib/legal-paths";
import { isPaidAccessOverlayExemptPath } from "@/lib/paid-access-exempt-paths";
import { isPublicMarketingPath } from "@/lib/public-paths";
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
            <KalShimmerBlock className="h-9 w-9 rounded-xl" />
            <KalShimmerBlock className="h-9 w-9 rounded-xl" />
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
          <KalShimmerBlock className="h-4 w-4/5 rounded" />
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

const AUTH_PATHS = new Set(["/auth", "/auth/reset"]);

function isAuthPath(p: string) {
  return AUTH_PATHS.has(p);
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
    welcomeTrialExpiredNoPay,
    refetch,
  } = useSubscriptionAccess();

  const authed = !!session;

  const allowAppWithoutPaid = hasPaidAccess || freeTrialActive;

  const gateTarget = useMemo(() => {
    if (!initialized) return "wait";
    if (!authed) {
      if (isAuthPath(pathname)) return "render";
      if (isPublicMarketingPath(pathname)) return "render";
      if (isLegalPath(pathname)) return "render";
      return "auth";
    }
    if (profileLoading) {
      if (isAuthPath(pathname) || isLegalPath(pathname)) return "render";
      return "wait";
    }

    // Profile loaded but with a network/server error — don't redirect to
    // paywall or onboarding; show a retry screen instead.
    if (
      fetchError &&
      !isAuthPath(pathname) &&
      !isLegalPath(pathname) &&
      !isPublicMarketingPath(pathname)
    ) {
      return "error";
    }

    if (isAuthPath(pathname)) return "home";

    if (!onboardingDone) {
      if (
        pathname === "/onboarding" ||
        isLegalPath(pathname) ||
        isPublicMarketingPath(pathname)
      )
        return "render";
      return "onboarding";
    }

    if (!allowAppWithoutPaid) {
      if (isPaidAccessOverlayExemptPath(pathname)) return "render";
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
    pathname,
  ]);

  useEffect(() => {
    switch (gateTarget) {
      case "auth":
        router.replace("/auth");
        break;
      case "home":
        router.replace("/home");
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
          <div
            className="flex min-h-0 min-h-dvh flex-1 flex-col"
            aria-hidden="true"
            inert
          >
            {children}
          </div>
          <SubscriptionPaywallInterstitial freeTrialEnded={welcomeTrialExpiredNoPay} />
        </>
      ) : (
        children
      )}
    </main>
  );
}

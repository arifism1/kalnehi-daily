"use client";

import { usePathname, useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";

import { SubscriptionPaywallInterstitial } from "@/components/subscription/SubscriptionPaywallInterstitial";
import { useSubscriptionAccess } from "@/hooks/useSubscriptionAccess";
import { isLegalPath } from "@/lib/legal-paths";
import { isPaidAccessOverlayExemptPath } from "@/lib/paid-access-exempt-paths";
import { isPublicMarketingPath } from "@/lib/public-paths";
import { useAuthStore } from "@/store/useAuthStore";

function LoadingScreen() {
  return (
    <div
      className="flex min-h-full min-h-dvh flex-1 items-center justify-center bg-kal-page text-sm text-kal-muted"
      aria-busy="true"
    >
      Loading…
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
  /** Avoid SSR vs first client paint mismatches from auth/subscription state. */
  const [clientShellReady, setClientShellReady] = useState(false);
  useEffect(() => {
    setClientShellReady(true);
  }, []);

  const initialized = useAuthStore((s) => s.initialized);
  const session = useAuthStore((s) => s.session);
  const {
    loading: profileLoading,
    fetchError,
    onboardingDone,
    hasPaidAccess,
    refetch,
  } = useSubscriptionAccess();

  const authed = !!session;

  const gateTarget = useMemo(() => {
    if (!initialized) return "wait";
    if (!authed) {
      if (isAuthPath(pathname)) return "render";
      if (isPublicMarketingPath(pathname)) return "render";
      if (isLegalPath(pathname)) return "render";
      return "auth";
    }
    if (profileLoading) {
      if (
        isAuthPath(pathname) ||
        isLegalPath(pathname) ||
        isPublicMarketingPath(pathname)
      )
        return "render";
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

    if (!hasPaidAccess) {
      if (isPaidAccessOverlayExemptPath(pathname)) return "render";
      return "paywallRender";
    }

    if (pathname === "/onboarding") return "home";

    return "render";
  }, [initialized, authed, profileLoading, fetchError, onboardingDone, hasPaidAccess, pathname]);

  useEffect(() => {
    switch (gateTarget) {
      case "auth":
        router.replace("/auth");
        break;
      case "home":
        router.replace("/");
        break;
      case "onboarding":
        router.replace("/onboarding");
        break;
    }
  }, [gateTarget, router]);

  if (!clientShellReady) {
    return (
      <main className="flex min-h-0 min-h-dvh flex-1 flex-col">
        <LoadingScreen />
      </main>
    );
  }

  if (gateTarget === "error") {
    return (
      <main className="flex min-h-0 min-h-dvh flex-1 flex-col">
        <ProfileErrorScreen onRetry={refetch} />
      </main>
    );
  }

  if (gateTarget !== "render" && gateTarget !== "paywallRender") {
    return (
      <main className="flex min-h-0 min-h-dvh flex-1 flex-col">
        <LoadingScreen />
      </main>
    );
  }

  return (
    <main id="kalnehi-main" className="flex min-h-0 min-h-dvh flex-1 flex-col">
      {gateTarget === "paywallRender" ? (
        <>
          <div
            className="flex min-h-0 min-h-dvh flex-1 flex-col"
            aria-hidden="true"
            inert
          >
            {children}
          </div>
          <SubscriptionPaywallInterstitial />
        </>
      ) : (
        children
      )}
    </main>
  );
}

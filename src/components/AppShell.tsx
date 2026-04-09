"use client";

import { usePathname, useRouter } from "next/navigation";
import { useEffect, useMemo } from "react";

import { useSubscriptionAccess } from "@/hooks/useSubscriptionAccess";
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

const AUTH_PATHS = new Set(["/auth", "/auth/reset"]);

const LEGAL_PATHS = new Set([
  "/privacy",
  "/terms",
  "/refund",
  "/return",
  "/shipping",
  "/policies",
  "/about",
]);

function isLegalPath(p: string) {
  return LEGAL_PATHS.has(p);
}
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
    onboardingDone,
    hasPaidAccess,
  } = useSubscriptionAccess();

  const authed = !!session;

  const gateTarget = useMemo(() => {
    if (!initialized) return "wait";
    if (!authed) {
      if (isAuthPath(pathname)) return "render";
      return "auth";
    }
    if (profileLoading) {
      if (isAuthPath(pathname) || isLegalPath(pathname))
        return "render";
      return "wait";
    }

    if (isAuthPath(pathname)) return "home";

    if (!onboardingDone) {
      if (pathname === "/onboarding" || isLegalPath(pathname))
        return "render";
      return "onboarding";
    }

    if (!hasPaidAccess) {
      if (pathname === "/pricing" || isLegalPath(pathname))
        return "render";
      return "pricing";
    }

    if (pathname === "/onboarding") return "home";

    return "render";
  }, [initialized, authed, profileLoading, onboardingDone, hasPaidAccess, pathname]);

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
      case "pricing":
        router.replace("/pricing");
        break;
    }
  }, [gateTarget, router]);

  if (gateTarget !== "render") {
    return <LoadingScreen />;
  }

  return <>{children}</>;
}

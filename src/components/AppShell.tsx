"use client";

import { usePathname, useRouter } from "next/navigation";
import { useEffect } from "react";

import { useAuthStore } from "@/store/useAuthStore";
import { useOnboardingStore } from "@/store/useOnboardingStore";

function LoadingScreen() {
  return (
    <div
      className="flex min-h-full flex-1 items-center justify-center bg-[#020617] text-sm text-zinc-400"
      aria-busy="true"
    >
      Loading…
    </div>
  );
}

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const initialized = useAuthStore((s) => s.initialized);
  const session = useAuthStore((s) => s.session);
  const onboardingCompleted = useOnboardingStore((s) => s.onboardingCompleted);

  const publicAuthPath =
    pathname === "/auth" || pathname === "/auth/reset";

  useEffect(() => {
    if (!initialized) return;
    const authed = !!session;
    if (!authed && !publicAuthPath) {
      router.replace("/auth");
      return;
    }
    if (authed && pathname === "/auth") {
      router.replace(onboardingCompleted ? "/" : "/onboarding");
      return;
    }
    if (authed && onboardingCompleted && pathname === "/onboarding") {
      router.replace("/");
      return;
    }
    if (
      authed &&
      !onboardingCompleted &&
      pathname !== "/onboarding" &&
      pathname !== "/auth" &&
      pathname !== "/auth/reset"
    ) {
      router.replace("/onboarding");
    }
  }, [initialized, session, pathname, router, onboardingCompleted]);

  if (!initialized) {
    return <LoadingScreen />;
  }

  if (!session && !publicAuthPath) {
    return <LoadingScreen />;
  }

  if (session && pathname === "/auth") {
    return <LoadingScreen />;
  }

  if (
    session &&
    !onboardingCompleted &&
    pathname !== "/onboarding" &&
    pathname !== "/auth" &&
    pathname !== "/auth/reset"
  ) {
    return <LoadingScreen />;
  }

  return <>{children}</>;
}

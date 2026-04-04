"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";

import { useAuthStore } from "@/store/useAuthStore";

/**
 * Ensures only authenticated users see Kalnehi app chrome & routes.
 * Pair with root AppShell for global /auth routing.
 */
export function ProtectedLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const initialized = useAuthStore((s) => s.initialized);
  const session = useAuthStore((s) => s.session);

  useEffect(() => {
    if (!initialized) return;
    if (!session) {
      router.replace("/auth");
    }
  }, [initialized, session, router]);

  if (!initialized) {
    return (
      <div
        className="flex min-h-[50vh] flex-1 items-center justify-center text-sm text-zinc-500"
        aria-busy="true"
      >
        Loading…
      </div>
    );
  }

  if (!session) {
    return null;
  }

  return <>{children}</>;
}

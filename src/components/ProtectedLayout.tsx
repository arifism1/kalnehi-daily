"use client";

import { usePathname, useRouter } from "next/navigation";
import { useEffect } from "react";

import { isLegalPath } from "@/lib/legal-paths";
import { useAuthStore } from "@/store/useAuthStore";

/**
 * Ensures only authenticated users see Kalnehi app chrome & routes.
 * Legal/policy pages render without a session so crawlers and footers work.
 * Pair with root AppShell for global /auth routing.
 */
export function ProtectedLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const initialized = useAuthStore((s) => s.initialized);
  const session = useAuthStore((s) => s.session);

  useEffect(() => {
    if (!initialized) return;
    if (!session && !isLegalPath(pathname)) {
      router.replace("/auth");
    }
  }, [initialized, session, router, pathname]);

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
    if (isLegalPath(pathname)) return <>{children}</>;
    return null;
  }

  return <>{children}</>;
}

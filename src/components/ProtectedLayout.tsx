"use client";

import { usePathname, useRouter } from "next/navigation";
import { useEffect } from "react";

import { isLegalPath } from "@/lib/legal-paths";
import { isPublicMarketingPath } from "@/lib/public-paths";
import { useAuthStore } from "@/store/useAuthStore";
import { KalSpinner } from "@/components/loading/KalSpinner";

function isPublicUnauthedPath(pathname: string) {
  return isLegalPath(pathname) || isPublicMarketingPath(pathname);
}

/**
 * Ensures only authenticated users see Kalnehi app chrome & routes.
 * Legal/policy and public marketing pages render without a session so crawlers and acquisition flows work.
 * Pair with root AppShell for global /auth routing.
 */
export function ProtectedLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const initialized = useAuthStore((s) => s.initialized);
  const session = useAuthStore((s) => s.session);

  useEffect(() => {
    if (!initialized) return;
    if (!session && !isPublicUnauthedPath(pathname)) {
      router.replace("/auth");
    }
  }, [initialized, session, router, pathname]);

  if (!initialized) {
    return (
      <div
        className="flex min-h-[50vh] flex-1 items-center justify-center"
        aria-busy="true"
      >
        <KalSpinner size="lg" />
      </div>
    );
  }

  if (!session) {
    if (isPublicUnauthedPath(pathname)) return <>{children}</>;
    return null;
  }

  return <>{children}</>;
}

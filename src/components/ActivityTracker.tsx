"use client";

import { useEffect, useRef } from "react";
import { usePathname } from "next/navigation";
import { trackActivity, flushActivity, FLUSH_INTERVAL_MS } from "@/lib/activity";

/**
 * Mounts in the protected (kalnehi) layout.
 * - Tracks a page_view event on every route change.
 * - Flushes the event buffer every FLUSH_INTERVAL_MS.
 * - Flushes on tab-hide (visibilitychange) and before unload.
 * Renders nothing.
 */
export function ActivityTracker() {
  const pathname = usePathname();
  const prevPathname = useRef<string | null>(null);

  // Track page views on route change.
  useEffect(() => {
    if (pathname === prevPathname.current) return;
    prevPathname.current = pathname;
    trackActivity("page_view", { page: pathname });
  }, [pathname]);

  // Periodic flush + visibility + unload.
  useEffect(() => {
    const interval = setInterval(() => {
      flushActivity().catch(() => {});
    }, FLUSH_INTERVAL_MS);

    const handleVisibility = () => {
      if (document.visibilityState === "hidden") {
        flushActivity().catch(() => {});
      }
    };

    const handleUnload = () => {
      flushActivity().catch(() => {});
    };

    document.addEventListener("visibilitychange", handleVisibility);
    window.addEventListener("beforeunload", handleUnload);

    return () => {
      clearInterval(interval);
      document.removeEventListener("visibilitychange", handleVisibility);
      window.removeEventListener("beforeunload", handleUnload);
    };
  }, []);

  return null;
}

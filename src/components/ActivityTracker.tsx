"use client";

import { useEffect, useRef } from "react";
import { usePathname } from "next/navigation";
import { JourneyAction, featureOpenForPath } from "@/lib/analytics/journeyEvents";
import { trackActivity, flushActivity, FLUSH_INTERVAL_MS } from "@/lib/activity";

/**
 * Mounts in the protected (kalnehi) layout.
 * - Tracks app_opened once per browser session.
 * - Tracks page_view + feature-open events on route change.
 * - Flushes the event buffer every FLUSH_INTERVAL_MS.
 */
export function ActivityTracker() {
  const pathname = usePathname();
  const prevPathname = useRef<string | null>(null);
  const appOpenedRef = useRef(false);
  const featureOpenedRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    if (!appOpenedRef.current) {
      appOpenedRef.current = true;
      trackActivity(JourneyAction.APP_OPENED, { page: pathname ?? "/" });
    }
  }, [pathname]);

  useEffect(() => {
    if (!pathname || pathname === prevPathname.current) return;
    prevPathname.current = pathname;

    trackActivity(JourneyAction.PAGE_VIEW, { page: pathname });

    const featureOpen = featureOpenForPath(pathname);
    if (featureOpen && !featureOpenedRef.current.has(featureOpen.action)) {
      featureOpenedRef.current.add(featureOpen.action);
      trackActivity(featureOpen.action, { feature: featureOpen.feature, page: pathname });
    }
  }, [pathname]);

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

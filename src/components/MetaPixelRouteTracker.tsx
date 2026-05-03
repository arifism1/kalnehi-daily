"use client";

import { usePathname, useSearchParams } from "next/navigation";
import { useEffect, useRef } from "react";

/**
 * Fires a Meta Pixel PageView on App Router navigations (path or query change).
 * The initial load is covered by the base snippet in {@link MetaPixelScript}.
 */
export function MetaPixelRouteTracker() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const searchKey = searchParams.toString();
  const skipNextRef = useRef(true);

  useEffect(() => {
    if (skipNextRef.current) {
      skipNextRef.current = false;
      return;
    }
    const fbq = typeof window !== "undefined" ? window.fbq : undefined;
    if (typeof fbq === "function") {
      fbq("track", "PageView");
    }
  }, [pathname, searchKey]);

  return null;
}

"use client";

import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";

/**
 * True in development, or when the page URL has `?debug=true` (checked on load and on route changes).
 */
export function useAiModelDebugVisible(): boolean {
  const pathname = usePathname();
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (process.env.NODE_ENV === "development") {
      setVisible(true);
      return;
    }
    if (typeof window === "undefined") return;
    setVisible(
      new URLSearchParams(window.location.search).get("debug") === "true",
    );
  }, [pathname]);

  return visible;
}

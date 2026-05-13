"use client";

import { useEffect, useRef } from "react";

const FLUSH_MS = 30_000;
const MAX_DELTA = 120;

/**
 * Accumulates seconds while the document tab is visible; flushes to
 * POST /api/activity/active-time (authenticated). Mount only under (kalnehi).
 */
export function ActiveTimeTracker() {
  const pendingRef = useRef(0);

  useEffect(() => {
    const tick = () => {
      if (document.visibilityState === "visible") {
        pendingRef.current += 1;
      }
    };

    const flush = async () => {
      const n = pendingRef.current;
      if (n < 1) return;
      const send = Math.min(MAX_DELTA, n);
      pendingRef.current -= send;
      try {
        await fetch("/api/activity/active-time", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ delta_seconds: send }),
          keepalive: true,
        });
      } catch {
        pendingRef.current += send;
      }
    };

    const tickIv = setInterval(tick, 1000);
    const flushIv = setInterval(() => {
      void flush();
    }, FLUSH_MS);

    const onVis = () => {
      if (document.visibilityState === "hidden") void flush();
    };
    document.addEventListener("visibilitychange", onVis);
    window.addEventListener("beforeunload", onVis);

    return () => {
      clearInterval(tickIv);
      clearInterval(flushIv);
      document.removeEventListener("visibilitychange", onVis);
      window.removeEventListener("beforeunload", onVis);
      void flush();
    };
  }, []);

  return null;
}

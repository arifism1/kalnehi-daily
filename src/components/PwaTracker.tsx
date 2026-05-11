"use client";

import { usePwaTracking } from "@/hooks/usePwaTracking";

/**
 * Thin client wrapper that mounts usePwaTracking in the protected layout.
 * Renders nothing — side-effects only.
 */
export function PwaTracker() {
  usePwaTracking();
  return null;
}

"use client";

import { Analytics } from "@vercel/analytics/react";
import { SpeedInsights } from "@vercel/speed-insights/next";

import { shouldLoadVercelWebVitals } from "@/lib/nativeSyncPolicy";

/** Skips Vercel Analytics / Speed Insights in the Capacitor shell to save data. */
export function VercelWebVitalsGate() {
  if (!shouldLoadVercelWebVitals()) return null;
  return (
    <>
      <Analytics />
      <SpeedInsights sampleRate={0.5} />
    </>
  );
}

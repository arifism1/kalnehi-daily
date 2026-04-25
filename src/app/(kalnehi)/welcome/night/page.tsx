import type { Metadata } from "next";

import { NightShutdownRouteClient } from "./NightShutdownRouteClient";

export const metadata: Metadata = {
  title: "Rest well — Kalnehi",
  robots: { index: false, follow: false },
};

export default function WelcomeNightPage() {
  return <NightShutdownRouteClient />;
}

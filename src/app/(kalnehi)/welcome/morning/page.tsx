import type { Metadata } from "next";

import { MorningWelcomeRouteClient } from "./MorningWelcomeRouteClient";

export const metadata: Metadata = {
  title: "Good morning — Kalnehi Daily",
  robots: { index: false, follow: false },
};

export default function WelcomeMorningPage() {
  return <MorningWelcomeRouteClient />;
}

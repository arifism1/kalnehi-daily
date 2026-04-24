import type { Metadata } from "next";

import { InstagramWelcomeBanner } from "@/components/InstagramWelcomeBanner";
import { CinematicStartClient } from "@/components/start/CinematicStartClient";
import { SITE_NAME } from "@/lib/seo-metadata";

export const metadata: Metadata = {
  title: `Get Started — ${SITE_NAME}`,
  description: "Sign up for your 3-day free trial of Kalnehi Daily.",
  robots: { index: false },
};

export default function StartPage() {
  return (
    <div className="kal-page-bg flex min-h-full flex-col items-center justify-center gap-8 px-6 py-16">
      <InstagramWelcomeBanner />

      <CinematicStartClient />
    </div>
  );
}

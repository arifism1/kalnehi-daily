import dynamic from "next/dynamic";

import { HeroSection } from "@/components/landing/HeroSection";
import { SocialProofStrip } from "@/components/landing/SocialProofStrip";
import { DailyRitualSection } from "@/components/landing/DailyRitualSection";
import { FinalCTASection } from "@/components/landing/FinalCTASection";

// Below-the-fold sections — split out of the initial bundle since mobile
// visitors rarely need them hydrated before they've scrolled past the hero.
const PrepOperatingSystemSection = dynamic(() =>
  import("@/components/landing/PrepOperatingSystemSection").then((m) => m.PrepOperatingSystemSection),
);
const AllFeaturesSection = dynamic(() =>
  import("@/components/landing/AllFeaturesSection").then((m) => m.AllFeaturesSection),
);
const ExamTabsSection = dynamic(() =>
  import("@/components/landing/ExamTabsSection").then((m) => m.ExamTabsSection),
);
const FAQSection = dynamic(() =>
  import("@/components/landing/FAQSection").then((m) => m.FAQSection),
);
const FounderNoteSection = dynamic(() =>
  import("@/components/landing/FounderNoteSection").then((m) => m.FounderNoteSection),
);

/** Full marketing landing body (home + `/kalnehi-daily` mirror). */
export function LandingPageContent() {
  return (
    <>
      <HeroSection />
      <SocialProofStrip />
      <DailyRitualSection />
      <PrepOperatingSystemSection />
      <AllFeaturesSection />
      <ExamTabsSection />
      <FAQSection />
      <FounderNoteSection />
      <FinalCTASection />
    </>
  );
}

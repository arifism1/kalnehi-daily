import { HeroSection } from "@/components/landing/HeroSection";
import { SocialProofStrip } from "@/components/landing/SocialProofStrip";
import { ProblemSection } from "@/components/landing/ProblemSection";
import { DailyRitualSection } from "@/components/landing/DailyRitualSection";
import { PrepOperatingSystemSection } from "@/components/landing/PrepOperatingSystemSection";
import { AllFeaturesSection } from "@/components/landing/AllFeaturesSection";
import { ExamTabsSection } from "@/components/landing/ExamTabsSection";
import { PricingSection } from "@/components/landing/PricingSection";
import { FAQSection } from "@/components/landing/FAQSection";
import { FounderNoteSection } from "@/components/landing/FounderNoteSection";
import { FinalCTASection } from "@/components/landing/FinalCTASection";

/** Full marketing landing body (home + `/kalnehi-daily` mirror). */
export function LandingPageContent() {
  return (
    <>
      <HeroSection />
      <SocialProofStrip />
      <ProblemSection />
      <DailyRitualSection />
      <PrepOperatingSystemSection />
      <AllFeaturesSection />
      <ExamTabsSection />
      <PricingSection />
      <FAQSection />
      <FounderNoteSection />
      <FinalCTASection />
    </>
  );
}

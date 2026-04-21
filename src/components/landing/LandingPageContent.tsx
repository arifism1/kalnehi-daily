import { HeroSection } from "@/components/landing/HeroSection";
import { SocialProofStrip } from "@/components/landing/SocialProofStrip";
import { ProblemSection } from "@/components/landing/ProblemSection";
import { DailyRitualSection } from "@/components/landing/DailyRitualSection";
import { FeatureDeepDivesSection } from "@/components/landing/FeatureDeepDivesSection";
import { AllFeaturesSection } from "@/components/landing/AllFeaturesSection";
import { ExamTabsSection } from "@/components/landing/ExamTabsSection";
import { DayTimelineSection } from "@/components/landing/DayTimelineSection";
import { OutcomesBlock } from "@/components/landing/OutcomesBlock";
import { TestimonialsSection } from "@/components/landing/TestimonialsSection";
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
      <FeatureDeepDivesSection />
      <AllFeaturesSection />
      <ExamTabsSection />
      <DayTimelineSection />
      <OutcomesBlock />
      <TestimonialsSection />
      <PricingSection />
      <FAQSection />
      <FounderNoteSection />
      <FinalCTASection />
    </>
  );
}

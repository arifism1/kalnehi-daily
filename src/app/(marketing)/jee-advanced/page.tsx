import Link from "next/link";
import { CTABanner } from "@/components/marketing/CTABanner";
import { ExamHero } from "@/components/marketing/ExamHero";
import { FAQBlock } from "@/components/marketing/FAQBlock";
import { Breadcrumbs } from "@/components/seo/Breadcrumbs";
import { MarketingPageJsonLd } from "@/components/seo/MarketingPageJsonLd";
import { marketingPageMetadata } from "@/lib/marketing-seo";
import { SITE_NAME } from "@/lib/seo-metadata";

export const metadata = marketingPageMetadata({
  path: "/jee-advanced",
  title: `Daily Planner for JEE Advanced Preparation | ${SITE_NAME}`,
  description: `JEE Advanced is one of the toughest undergraduate entrance exams in the world. Kalnehi Daily helps you build the depth, problem-solving volume and daily consistency that Advanced demands.`,
});

const FAQS = [
  { question: "What makes JEE Advanced different from JEE Main?", answer: "JEE Advanced tests deeper conceptual understanding, multi-concept problems, and application under pressure. The same PCM topics appear, but at significantly higher difficulty. You can't get away with NCERT-level understanding alone — you need JEE Advanced-specific problem practice." },
  { question: "How many hours should I study for JEE Advanced?", answer: "Most IIT toppers report 8-12 focused hours per day in the peak phase. But quantity alone doesn't decide rank — the quality of problem-solving practice and revision consistency is what separates 99 percentile from rank 1-500. Kalnehi Daily helps you track both hours and quality." },
  { question: "Can Kalnehi Daily help me track both Main and Advanced preparation at once?", answer: "Yes. Set up your JEE Main date and JEE Advanced date separately. Kalnehi Daily will help you plan the Main phase first, then shift automatically to Advanced-specific depth and problem sets." },
  { question: "How does Mastermind help for JEE Advanced?", answer: "Mastermind identifies which advanced-level topics you haven't solved problems for. It tracks which problem types from previous Advanced papers you've covered and which need more practice. For JEE Advanced, problem coverage matters as much as chapter completion." },
];

export default function JeeAdvancedPage() {
  return (
    <>
      <MarketingPageJsonLd
        breadcrumbs={[{ name: "Home", path: "/" }, { name: "JEE Advanced Preparation", path: "/jee-advanced" }]}
        faqs={FAQS}
      />

      <Breadcrumbs items={[{ name: "Home", path: "/" }, { name: "JEE Advanced Preparation", path: "/jee-advanced" }]} className="mb-2" />
      <article className="space-y-10">
        <ExamHero
          badge="JEE Advanced — IIT Entrance"
          headline="JEE Advanced Preparation Daily Planner — Depth, Volume, and Daily Execution"
          subheadline="JEE Advanced doesn't just test what you know. It tests whether you can solve problems you've never seen before, under pressure, in 3 hours. The only way to prepare for that is relentless daily practice — and a system that tracks every hour of it."
        />

        <section className="space-y-4" aria-labelledby="jeeadv-approach">
          <h2 id="jeeadv-approach" className="text-xl font-bold text-kal-text">What makes JEE Advanced prep different</h2>
          <div className="space-y-3 text-sm">
            <div className="kal-glass-card rounded-xl p-4">
              <strong className="text-kal-text block mb-1">Problem volume matters more than reading</strong>
              <p className="text-kal-text-secondary">For JEE Advanced, you can't study your way to IIT — you have to problem-solve your way there. Track the number of advanced problems solved per chapter, not just chapter completion.</p>
            </div>
            <div className="kal-glass-card rounded-xl p-4">
              <strong className="text-kal-text block mb-1">Multi-concept problem tracking</strong>
              <p className="text-kal-text-secondary">Advanced questions combine 2-3 concepts. Mastermind helps you identify which concept combinations you're weakest on — and builds your doubt tracker around them.</p>
            </div>
            <div className="kal-glass-card rounded-xl p-4">
              <strong className="text-kal-text block mb-1">Mock test review discipline</strong>
              <p className="text-kal-text-secondary">Every JEE Advanced mock you write should have a 4-hour review session. Kalnehi Daily helps you plan and track mock review as a dedicated study session type — separate from regular prep.</p>
            </div>
          </div>
        </section>

        <section className="space-y-2">
          <h2 className="text-base font-semibold text-kal-text">Related pages</h2>
          <ul className="space-y-1 text-sm">
            <li><Link href="/jee" className="font-medium text-kal-accent-dark hover:underline">JEE Main & Advanced complete guide →</Link></li>
            <li><Link href="/syllabus/jee-advanced" className="font-medium text-kal-accent-dark hover:underline">JEE Advanced syllabus — all topics →</Link></li>
            <li><Link href="/blog/jee-dropper-study-plan" className="font-medium text-kal-accent-dark hover:underline">Study plan for JEE droppers →</Link></li>
          </ul>
        </section>

        <FAQBlock items={FAQS} />
        <CTABanner headline="Build your JEE Advanced execution system" subtext="7 days free. Mastermind. No credit card." />
      </article>
    </>
  );
}

import Link from "next/link";

import { CTABanner } from "@/components/marketing/CTABanner";
import { ExamHero } from "@/components/marketing/ExamHero";
import { FeatureBlock } from "@/components/marketing/FeatureBlock";
import { FAQBlock } from "@/components/marketing/FAQBlock";
import { Breadcrumbs } from "@/components/seo/Breadcrumbs";
import { MarketingPageJsonLd } from "@/components/seo/MarketingPageJsonLd";
import { marketingPageMetadata } from "@/lib/marketing-seo";
import { SITE_NAME } from "@/lib/seo-metadata";

export const metadata = marketingPageMetadata({
  path: "/cat",
  title: `Daily Planner for CAT Preparation | ${SITE_NAME}`,
  description: `CAT prep alongside a job or college is brutal without a system. Kalnehi Daily helps you track Quant, VARC and DILR, plan mock review sessions, and build daily consistency that converts to percentile.`,
});

const SYLLABUS = [
  {
    section: "VARC",
    topics: [
      "Reading Comprehension (5 passages, ~24 questions)",
      "Para Jumbles, Para Summary",
      "Sentence Exclusion, Odd One Out",
      "Vocabulary in Context",
    ],
  },
  {
    section: "DILR",
    topics: [
      "Data Interpretation (Tables, Graphs, Charts, Caselets)",
      "Logical Reasoning (Arrangements, Blood Relations, Syllogisms)",
      "Combined DI-LR sets (2-3 sets, mixed format)",
    ],
  },
  {
    section: "Quant",
    topics: [
      "Arithmetic (Percentages, Profit-Loss, Time-Work, Speed)",
      "Algebra (Equations, Inequalities, Functions)",
      "Geometry & Mensuration",
      "Number Theory (Divisibility, Remainders, P&C, Probability)",
      "Modern Maths (Sets, Progressions, Logarithms)",
    ],
  },
];

const FAQS = [
  {
    question: "How does Kalnehi Daily help CAT aspirants who are working or in college?",
    answer:
      "Most CAT aspirants prepare with 2-3 hours per day alongside a job or college schedule. Kalnehi Daily's daily planner lets you plan exactly what to cover in those hours — which Quant topic, how many RC passages, which DILR set — and track completion daily without a separate notebook.",
  },
  {
    question: "How does Mastermind help CAT preparation?",
    answer:
      "Mastermind analyses your mock test data and identifies which section is pulling your percentile down. It tells you if you're spending too much time on Quant while VARC accuracy is tanking, and gives you a rebalancing strategy based on your target percentile.",
  },
  {
    question: "CAT changes format every year — does Kalnehi Daily account for that?",
    answer:
      "The core skills tested in CAT — reading speed, Quant accuracy, LR pattern recognition — don't change. Kalnehi Daily tracks your skill development at the chapter level, which remains relevant regardless of format tweaks in a given year.",
  },
  {
    question: "Can I track mock test performance in Kalnehi Daily?",
    answer:
      "Yes. Use the Marks Engine to log your sectional and overall scores from AIMCAT, IMS and SimCAT mocks. Mastermind reads this data and tells you your performance trend across the last 5-10 mocks.",
  },
  {
    question: "Is there a specific plan for CAT beginners starting from zero?",
    answer:
      "Absolutely. Mastermind will ask about your current skill level and design a phase-wise plan — foundation (3 months), mock-based improvement (2 months), intensive revision (1 month). You just execute each day.",
  },
];

export default function CatPage() {
  return (
    <>
      <MarketingPageJsonLd
        breadcrumbs={[
          { name: "Home", path: "/" },
          { name: "CAT Preparation Daily Planner", path: "/cat" },
        ]}
        faqs={FAQS}
        webPage={{
          name: `Daily Planner for CAT Preparation | ${SITE_NAME}`,
          description: `Track Quant, VARC and DILR, plan mock review sessions, and build daily consistency that converts to percentile.`,
        }}
      />

      <Breadcrumbs items={[
          { name: "Home", path: "/" },
          { name: "CAT Preparation Daily Planner", path: "/cat" },
        ]} className="mb-2" />

      <article className="space-y-12">
        <ExamHero
          badge="CAT — Common Admission Test"
          headline="CAT Preparation Daily Planner — From 70 Percentile to 99 Is a Consistency Problem, Not a Content Problem"
          subheadline="Most CAT aspirants know enough Quant, VARC and DILR to score 90+. What separates 90 from 99 percentile is the ability to practice daily without skipping a single week for 6 months. Kalnehi Daily builds that system."
          stats={[
            { value: "3 sections", label: "VARC · DILR · Quant" },
            { value: "6 months", label: "typical serious prep window" },
            { value: "₹0", label: "to start — 3 days free" },
          ]}
        />

        <section className="space-y-5" aria-labelledby="cat-syllabus">
          <h2 id="cat-syllabus" className="text-xl font-bold text-kal-text">
            CAT syllabus mapped in Kalnehi Daily
          </h2>
          <p className="text-sm leading-relaxed text-kal-text-secondary">
            CAT has no official syllabus — but the pattern is consistent. These are the areas that
            appear every year and what Kalnehi Daily helps you track at topic level.
          </p>
          <div className="grid gap-4 sm:grid-cols-3">
            {SYLLABUS.map(({ section, topics }) => (
              <div key={section} className="kal-glass-card rounded-2xl p-4 space-y-2">
                <h3 className="text-sm font-bold text-kal-accent-dark uppercase tracking-wide">{section}</h3>
                <ul className="space-y-1">
                  {topics.map((t) => (
                    <li key={t} className="text-xs text-kal-text-secondary leading-snug">· {t}</li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </section>

        <section className="space-y-4" aria-labelledby="cat-mastermind">
          <h2 id="cat-mastermind" className="text-xl font-bold text-kal-text">How Mastermind helps CAT aspirants</h2>
          <div className="grid gap-4 sm:grid-cols-2">
            <FeatureBlock
              title="Sectional balance analysis"
              description="Mastermind monitors how much time you're allocating to VARC, DILR and Quant. If your mock data shows DILR is your weakest section, it'll tell you to shift 40% of prep time there for the next 3 weeks."
              tag="AI Strategy"
            />
            <FeatureBlock
              title="Mock review planning"
              description="After each CAT mock, the most important session is the review — not the test itself. Mastermind helps you schedule dedicated mock review sessions so you extract learning from every test you write."
              tag="Mock Review"
            />
            <FeatureBlock
              title="Reading habit tracker"
              description="VARC is the hardest section to improve quickly. Mastermind tracks your daily reading practice — editorials, long-form articles — and monitors reading speed improvement over weeks."
              tag="VARC Prep"
            />
            <FeatureBlock
              title="Target percentile roadmap"
              description="Tell Mastermind your target IIM and percentile cutoff. It back-calculates what accuracy and speed you need in each section and maps your current mock performance against that target."
              tag="Goal Mapping"
            />
          </div>
        </section>

        <section className="space-y-4" aria-labelledby="cat-voice">
          <h2 id="cat-voice" className="text-xl font-bold text-kal-text">Voice control for CAT prep</h2>
          <div className="space-y-3">
            {[
              { cmd: "Hey Boss, log 45 minutes of Quant — Time and Work chapter", result: "Session logged, Quant tracker updated" },
              { cmd: "Hey Boss, mark Number Theory as needs revision", result: "Topic flagged; add or update Revision Tracker with your next due date" },
              { cmd: "Hey Boss, set a daily reminder to read one editorial at 7 AM", result: "Daily reading habit created with morning reminder" },
            ].map(({ cmd, result }) => (
              <div key={cmd} className="kal-glass-card rounded-xl p-4 space-y-1">
                <p className="text-sm font-semibold text-kal-text">"{cmd}"</p>
                <p className="text-xs text-kal-text-secondary">→ {result}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="space-y-2" aria-labelledby="cat-related">
          <h2 id="cat-related" className="text-base font-semibold text-kal-text">Read next</h2>
          <ul className="space-y-1.5 text-sm">
            <li>
              <Link href="/blog/study-consistency-vs-long-hours" className="font-medium text-kal-accent-dark hover:underline">
                Studying 6 Consistent Hours vs 14 Chaotic Hours — What the Data Says
              </Link>
            </li>
            <li>
              <Link href="/blog/spaced-repetition-competitive-exams-india" className="font-medium text-kal-accent-dark hover:underline">
                Spaced Repetition for Indian Competitive Exams
              </Link>
            </li>
            <li>
              <Link href="/features/marks-engine" className="font-medium text-kal-accent-dark hover:underline">
                Marks Engine — Track scores and predict rank
              </Link>
            </li>
          </ul>
        </section>

        <FAQBlock items={FAQS} />
        <CTABanner headline="Build your CAT prep system today" subtext="3 days free. Full access. No credit card." />
      </article>
    </>
  );
}

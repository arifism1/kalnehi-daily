import { CTABanner } from "@/components/marketing/CTABanner";
import { RelatedContent } from "@/components/marketing/RelatedContent";
import { ExamHero } from "@/components/marketing/ExamHero";
import { FeatureBlock } from "@/components/marketing/FeatureBlock";
import { FAQBlock } from "@/components/marketing/FAQBlock";
import { Breadcrumbs } from "@/components/seo/Breadcrumbs";
import { MarketingPageJsonLd } from "@/components/seo/MarketingPageJsonLd";
import { ogImageExam } from "@/lib/og-image";
import { marketingPageMetadata } from "@/lib/marketing-seo";
import {
  SMART_PLAN_ANNUAL_BILLING_LABEL,
  SMART_PLAN_MONTHLY_DISPLAY,
} from "@/lib/smartPlanPricing";
import { SITE_NAME } from "@/lib/seo-metadata";

const MONTHLY = SMART_PLAN_MONTHLY_DISPLAY;

export const metadata = marketingPageMetadata({
  path: "/neet",
  title: `Daily Planner for NEET Preparation | ${SITE_NAME}`,
  description: `Track Biology, Physics and Chemistry at the chapter level. Mastermind identifies which NEET topics have the highest weightage vs your current completion. Start free for 3 days.`,
  ogImage: ogImageExam("NEET Preparation"),
});

const SYLLABUS = [
  {
    subject: "Biology",
    chapters: [
      "Diversity of Living Organisms (Kingdoms, Classification)",
      "Cell Structure & Function, Cell Division",
      "Plant Physiology (Photosynthesis, Respiration, Transport)",
      "Human Physiology (Digestion, Circulation, Excretion, Neural, Endocrine)",
      "Reproduction (Flowering Plants, Human, Reproductive Health)",
      "Genetics & Evolution (Mendelian, Molecular, Darwinism)",
      "Ecology & Environment (Ecosystems, Biodiversity, Conservation)",
      "Biology in Human Welfare & Biotechnology",
    ],
  },
  {
    subject: "Physics",
    chapters: [
      "Mechanics (Motion, Laws of Motion, Work-Energy, Gravitation)",
      "Properties of Matter & Thermodynamics",
      "Waves & Oscillations, Optics",
      "Electrostatics, Current Electricity, Magnetism",
      "Modern Physics (Photoelectric, Atoms, Nuclei)",
      "Electronic Devices & Communication",
    ],
  },
  {
    subject: "Chemistry",
    chapters: [
      "Physical Chemistry (States, Thermodynamics, Equilibrium, Electrochemistry)",
      "Inorganic (Periodic Table, Bonding, s/p/d Block, Coordination)",
      "Organic (Hydrocarbons, Haloalkanes, Alcohols, Carbonyls, Amines, Biomolecules)",
    ],
  },
];

const FAQS = [
  {
    question: "How does Kalnehi Daily help NEET aspirants track their syllabus?",
    answer:
      "Kalnehi Daily lets you mark every NEET chapter in Biology, Physics and Chemistry at the microtopic level — Not started, In progress, Done, or Needs revision. Mastermind then cross-references your completion with NEET historical question patterns and tells you which chapters to prioritise next.",
  },
  {
    question: "Biology is 90 marks in NEET — how does Kalnehi Daily help me prioritise it?",
    answer:
      "Mastermind knows which Biology chapters appear most in NEET question papers (Genetics, Human Physiology, Ecology consistently dominate). It reads your syllabus completion and flags the high-weightage chapters you haven't finished yet — so you get maximum marks per hour of study.",
  },
  {
    question: "Can I use Kalnehi Daily for both NEET UG and NEET PG?",
    answer:
      "Yes, Kalnehi Daily supports both. NEET UG is for class 12 graduates targeting MBBS/BDS. NEET PG is for medical graduates targeting MD/MS. Each has a different syllabus and we have separate landing pages for each. You set your exam in the app.",
  },
  {
    question: "Is voice control useful for NEET prep?",
    answer:
      "Very much so. Long Biology chapters like Genetics or Human Physiology take hours to study. You can say 'Hey Boss, log 4 hours of Genetics done' or 'Hey Boss, mark Ecology as needs revision' without picking up your phone mid-study.",
  },
  {
    question: "What is the pricing for NEET aspirants?",
    answer:
      `Start free for 3 days with full access. Smart Plan is ${MONTHLY}/month or ${SMART_PLAN_ANNUAL_BILLING_LABEL}. For a 12-month NEET prep cycle, the annual plan costs less than ₹300/month — less than a single coaching batch's monthly fee for just notes.`,
  },
];

export default function NeetPage() {
  return (
    <>
      <MarketingPageJsonLd
        breadcrumbs={[
          { name: "Home", path: "/" },
          { name: "NEET Preparation Daily Planner", path: "/neet" },
        ]}
        faqs={FAQS}
        webPage={{
          name: `Daily Planner for NEET Preparation | ${SITE_NAME}`,
          description: `Track Biology, Physics and Chemistry at the chapter level. Mastermind identifies which NEET topics have the highest weightage vs your current completion.`,
        }}
      />

      <Breadcrumbs items={[
          { name: "Home", path: "/" },
          { name: "NEET Preparation Daily Planner", path: "/neet" },
        ]} className="mb-2" />

      <article className="space-y-12">
        <ExamHero
          badge="NEET UG"
          headline="NEET Preparation Daily Planner — Track Biology, Physics & Chemistry Without Losing a Single Chapter"
          subheadline="97 chapters. 180 questions. One exam that decides your medical future. Kalnehi Daily maps NEET's entire syllabus to a daily plan you can actually execute — day after day, month after month."
          stats={[
            { value: "97", label: "NEET chapters tracked" },
            { value: "3 subjects", label: "Biology · Physics · Chemistry" },
            { value: "₹0", label: "to start — 3 days free" },
          ]}
        />

        {/* Section 2 — Syllabus */}
        <section className="space-y-5" aria-labelledby="neet-syllabus">
          <h2 id="neet-syllabus" className="text-xl font-bold text-kal-text">
            How Kalnehi Daily maps to the NEET syllabus
          </h2>
          <p className="text-sm leading-relaxed text-kal-text-secondary">
            NEET has a well-defined syllabus based on NCERT class 11 and 12 content. The challenge is not
            knowing the syllabus — it's tracking 97 chapters across 3 subjects while also attending
            coaching, writing mock tests, and revising. Kalnehi Daily gives you that structure.
          </p>
          <div className="grid gap-4 sm:grid-cols-3">
            {SYLLABUS.map(({ subject, chapters }) => (
              <div key={subject} className="kal-glass-card rounded-2xl p-4 space-y-2">
                <h3 className="text-sm font-bold text-kal-accent-dark uppercase tracking-wide">
                  {subject}
                </h3>
                <ul className="space-y-1">
                  {chapters.map((ch) => (
                    <li key={ch} className="text-xs text-kal-text-secondary leading-snug">
                      · {ch}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
          <p className="text-sm text-kal-text-secondary">
            Biology is worth 360 marks in NEET — twice the weight of Physics or Chemistry. Kalnehi Daily's
            syllabus tracker helps you ensure you're spending proportional time on what matters most.
          </p>
        </section>

        {/* Section 3 — Mastermind */}
        <section className="space-y-4" aria-labelledby="neet-mastermind">
          <h2 id="neet-mastermind" className="text-xl font-bold text-kal-text">
            How Mastermind helps NEET aspirants
          </h2>
          <div className="grid gap-4 sm:grid-cols-2">
            <FeatureBlock
              title="Weightage vs completion gap analysis"
              description="Mastermind identifies which Biology chapters have the highest historical NEET weightage vs your current completion — and tells you where to spend your next 3 study hours to maximise marks."
              tag="AI Strategy"
            />
            <FeatureBlock
              title="NCERT-first approach"
              description="Mastermind keeps you honest: it flags when you're spending too much time on reference books before NCERT is fully covered. For NEET, NCERT is the bible — Mastermind knows that."
              tag="Study Strategy"
            />
            <FeatureBlock
              title="Mock score pattern recognition"
              description="Log your NEET mock scores and Mastermind spots the pattern — which subject is consistently pulling your aggregate down, which chapters keep appearing, and what to revise before the next mock."
              tag="Mock Analysis"
            />
            <FeatureBlock
              title="Revision windows before NEET"
              description="In the final 60 days before NEET, Mastermind shifts strategy from learning new chapters to revision windows — it tells you which chapters need a second pass and which are solid."
              tag="Final Stretch"
            />
          </div>
        </section>

        {/* Section 4 — Voice control */}
        <section className="space-y-4" aria-labelledby="neet-voice">
          <h2 id="neet-voice" className="text-xl font-bold text-kal-text">
            Voice control for NEET prep
          </h2>
          <p className="text-sm leading-relaxed text-kal-text-secondary">
            NEET Biology chapters are long. When you're deep in Human Physiology or Genetics, you
            shouldn't have to pick up your phone to update your tracker. Just speak.
          </p>
          <div className="space-y-3">
            {[
              {
                cmd: "Hey Boss, log 3 hours of Human Physiology done",
                result: "Study session logged, progress updated automatically",
              },
              {
                cmd: "Hey Boss, mark Genetics as needs revision",
                result: "Chapter status updated — Mastermind schedules a revision window",
              },
              {
                cmd: "Hey Boss, how much Biology is left to cover?",
                result: "Mastermind reads your syllabus tracker and reports completion percentage",
              },
            ].map(({ cmd, result }) => (
              <div key={cmd} className="kal-glass-card rounded-xl p-4 space-y-1">
                <p className="text-sm font-semibold text-kal-text">"{cmd}"</p>
                <p className="text-xs text-kal-text-secondary">→ {result}</p>
              </div>
            ))}
          </div>
        </section>

        <RelatedContent pathname="/neet" />

        <FAQBlock items={FAQS} />

        <CTABanner
          headline="Start your NEET prep system today"
          subtext="3 days free. Full access including Mastermind. No credit card."
        />
      </article>
    </>
  );
}

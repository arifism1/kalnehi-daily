import { CTABanner } from "@/components/marketing/CTABanner";
import { RelatedContent } from "@/components/marketing/RelatedContent";
import { ExamHero } from "@/components/marketing/ExamHero";
import { FeatureBlock } from "@/components/marketing/FeatureBlock";
import { FAQBlock } from "@/components/marketing/FAQBlock";
import { Breadcrumbs } from "@/components/seo/Breadcrumbs";
import { MarketingPageJsonLd } from "@/components/seo/MarketingPageJsonLd";
import { ogImageExam } from "@/lib/og-image";
import { marketingPageMetadata } from "@/lib/marketing-seo";
import { SITE_NAME } from "@/lib/seo-metadata";

export const metadata = marketingPageMetadata({
  path: "/jee",
  title: `Daily Planner for JEE Preparation | ${SITE_NAME}`,
  description: `Track every PCM topic, plan your day with voice, and let PrepBrain AI show exactly where your next 3 study hours should go. Built for JEE Main & Advanced aspirants. Start free.`,
  ogImage: ogImageExam("JEE Preparation"),
});

const SYLLABUS = [
  {
    subject: "Physics",
    chapters: [
      "Mechanics (Kinematics, Laws of Motion, Work-Energy, Rotational Motion)",
      "Waves & Thermodynamics (SHM, Heat Transfer, Kinetic Theory)",
      "Electrostatics & Current Electricity",
      "Magnetism & Electromagnetic Induction",
      "Optics (Ray Optics, Wave Optics)",
      "Modern Physics (Photoelectric Effect, Nuclear Physics, Semiconductors)",
    ],
  },
  {
    subject: "Chemistry",
    chapters: [
      "Physical Chemistry (Thermodynamics, Equilibrium, Electrochemistry, Kinetics)",
      "Inorganic Chemistry (Periodic Table, Chemical Bonding, p/d/f Block, Coordination)",
      "Organic Chemistry (IUPAC, Mechanisms, GOC, Named Reactions, Biomolecules)",
    ],
  },
  {
    subject: "Mathematics",
    chapters: [
      "Algebra (Complex Numbers, Progressions, Matrices, Probability)",
      "Coordinate Geometry (Straight Lines, Circles, Conics)",
      "Calculus (Limits, Derivatives, Integrals, Differential Equations)",
      "Vectors & 3D Geometry",
      "Trigonometry",
    ],
  },
];

const FAQS = [
  {
    question: "How does Kalnehi help JEE aspirants specifically?",
    answer:
      "Kalnehi maps your daily tasks directly to JEE chapters — Physics, Chemistry, Maths. You track topic-level mastery, mark chapters as done/needs revision/in progress, and PrepBrain AI reads that data to tell you which chapters to prioritise today based on weightage and your gaps.",
  },
  {
    question: "Can I use Kalnehi for both JEE Main and JEE Advanced prep?",
    answer:
      "Yes. JEE Main and Advanced share the same PCM syllabus core. You set your exam date, and Kalnehi builds a timeline that covers the full JEE Advanced syllabus — so you're automatically prepared for Main along the way.",
  },
  {
    question: "What is the voice control feature for JEE prep?",
    answer:
      "Say 'Hey Boss, log 2 hours of Rotational Motion done' or 'Hey Boss, mark Thermodynamics as needs revision' and Kalnehi logs it hands-free. Useful when you're mid-session and don't want to break flow.",
  },
  {
    question: "Does Kalnehi work for JEE droppers?",
    answer:
      "Especially for droppers. The consistency heatmap and streak tracker show you exactly which weeks you slipped last year. You build a different system this time — one you can actually sustain for 12 months.",
  },
  {
    question: "How much does it cost for a JEE aspirant?",
    answer:
      "Start completely free for 3 days with full access including PrepBrain AI (60,000 tokens) and 5 minutes of voice — no card required. After your trial, Smart Plan is ₹399/month with 2 million tokens and 100 minutes of voice per month.",
  },
];

export default function JeePage() {
  return (
    <>
      <MarketingPageJsonLd
        breadcrumbs={[
          { name: "Home", path: "/" },
          { name: "JEE Preparation Daily Planner", path: "/jee" },
        ]}
        faqs={FAQS}
        webPage={{
          name: `Daily Planner for JEE Preparation | ${SITE_NAME}`,
          description: `Track every PCM topic, plan your day with voice, and let PrepBrain AI show exactly where your next 3 study hours should go. Built for JEE Main & Advanced aspirants.`,
        }}
      />

      <Breadcrumbs
        items={[
          { name: "Home", path: "/" },
          { name: "JEE Preparation Daily Planner", path: "/jee" },
        ]}
        className="mb-2"
      />

      <article className="space-y-12">
        <ExamHero
          badge="JEE Main & Advanced"
          headline="JEE Preparation Daily Planner — Track, Plan & Win Every Single Day"
          subheadline="720 topics. 2 years. One system to track all of it. Kalnehi maps your entire PCM syllabus to a daily plan that adapts when life doesn't cooperate."
          stats={[
            { value: "720+", label: "JEE topics tracked" },
            { value: "3 exams", label: "Main + Advanced + Boards" },
            { value: "₹0", label: "to start — 3 days free" },
          ]}
        />

        {/* Section 2 — Syllabus structure */}
        <section className="space-y-5" aria-labelledby="jee-syllabus">
          <h2 id="jee-syllabus" className="text-xl font-bold text-kal-text">
            How Kalnehi maps to the JEE syllabus
          </h2>
          <p className="text-sm leading-relaxed text-kal-text-secondary">
            The JEE syllabus is fixed — 3 subjects, hundreds of chapters, thousands of subtopics. Most
            students track it in a notebook or spreadsheet that falls apart by March. Kalnehi gives you a
            microtopic-level tracker built for the exact JEE structure below.
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
            Mark each chapter as{" "}
            <strong className="text-kal-text">Not started → In progress → Done → Needs revision</strong>.
            PrepBrain AI reads your completion map and tells you which chapters to prioritise this week
            based on JEE weightage data and your gaps.
          </p>
        </section>

        {/* Section 3 — PrepBrain */}
        <section className="space-y-4" aria-labelledby="jee-prepbrain">
          <h2 id="jee-prepbrain" className="text-xl font-bold text-kal-text">
            How PrepBrain AI helps JEE aspirants
          </h2>
          <div className="grid gap-4 sm:grid-cols-2">
            <FeatureBlock
              title="Syllabus-weighted strategy"
              description="PrepBrain reads your chapter completion and cross-references JEE historical weightage. It tells you exactly which Physics chapters are worth the next 6 hours of your time — not a generic list."
              tag="AI Strategy"
            />
            <FeatureBlock
              title="Mock score analysis"
              description="Log your JEE mock scores and PrepBrain identifies your weak areas across PCM — broken down by chapter and subtopic — so you fix the right things before the next mock."
              tag="Mock Analysis"
            />
            <FeatureBlock
              title="Revision prioritisation"
              description="As your JEE date approaches, PrepBrain shifts its focus from new chapters to revision windows — telling you which chapters need a second pass based on how long ago you studied them."
              tag="Revision reminders"
            />
            <FeatureBlock
              title="Daily study load optimisation"
              description="Tell PrepBrain how many hours you have today. It'll suggest what to cover across Physics, Chemistry and Maths so you stay balanced and don't spend 4 hours on one subject every day."
              tag="Daily Plan"
            />
          </div>
        </section>

        {/* Section 4 — Voice control */}
        <section className="space-y-4" aria-labelledby="jee-voice">
          <h2 id="jee-voice" className="text-xl font-bold text-kal-text">
            Voice control for JEE prep — hands-free logging
          </h2>
          <p className="text-sm leading-relaxed text-kal-text-secondary">
            When you're mid-session solving integration problems, the last thing you want to do is pick
            up your phone and update a spreadsheet. Voice control lets you log progress without breaking
            your study state.
          </p>
          <div className="space-y-3">
            {[
              {
                cmd: "Hey Boss, mark Rotational Motion as needs revision",
                result: "Chapter status updated immediately — no tapping required",
              },
              {
                cmd: "Hey Boss, log 3 hours of Organic Chemistry done today",
                result: "Study session recorded and reflected in your consistency heatmap",
              },
              {
                cmd: "Hey Boss, what should I study for the next 2 hours?",
                result: "PrepBrain answers based on your current completion and JEE date",
              },
            ].map(({ cmd, result }) => (
              <div key={cmd} className="kal-glass-card rounded-xl p-4 space-y-1">
                <p className="text-sm font-semibold text-kal-text">"{cmd}"</p>
                <p className="text-xs text-kal-text-secondary">→ {result}</p>
              </div>
            ))}
          </div>
        </section>

        <RelatedContent pathname="/jee" />

        <FAQBlock items={FAQS} />

        <CTABanner
          headline="Start your JEE prep system today"
          subtext="3 days free. Full access. No credit card. Then ₹399/month."
        />
      </article>
    </>
  );
}

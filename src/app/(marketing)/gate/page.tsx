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
  path: "/gate",
  title: `Daily Planner for GATE Preparation | ${SITE_NAME}`,
  description: `GATE covers 10+ technical subjects across 6 months. Kalnehi Daily tracks your subject-wise progress, helps you plan revision before the exam, and lets Mastermind identify your biggest score gaps.`,
});

const GATE_CSE_SUBJECTS = [
  { subject: "Engineering Mathematics", topics: ["Linear Algebra", "Calculus", "Probability & Statistics", "Graph Theory", "Discrete Mathematics"] },
  { subject: "Digital Logic", topics: ["Boolean Algebra", "Combinational Circuits", "Sequential Circuits", "Number Systems"] },
  { subject: "Computer Organisation", topics: ["Machine Instructions", "ALU", "Memory Hierarchy", "I/O Organisation"] },
  { subject: "Programming & DS", topics: ["C Programming", "Recursion", "Arrays, Stacks, Queues", "Trees, Graphs, Hashing"] },
  { subject: "Algorithms", topics: ["Sorting, Searching", "Dynamic Programming", "Graph Algorithms", "Complexity Theory"] },
  { subject: "Theory of Computation", topics: ["Formal Languages", "Automata", "Turing Machines", "Undecidability"] },
  { subject: "Compiler Design", topics: ["Lexical Analysis", "Parsing", "Semantic Analysis", "Code Generation"] },
  { subject: "Operating Systems", topics: ["Process Management", "Memory Management", "File Systems", "Synchronisation"] },
  { subject: "Databases", topics: ["Relational Model", "SQL", "Normalisation", "Transactions", "Indexing"] },
  { subject: "Computer Networks", topics: ["OSI / TCP-IP", "Routing", "Transport Layer", "Application Layer"] },
];

const FAQS = [
  {
    question: "GATE has 10 subjects — how does Kalnehi Daily help me not fall behind?",
    answer:
      "Kalnehi Daily's syllabus tracker lets you map all 10 GATE subjects and their individual topics. You can see your overall completion percentage and identify which subjects are lagging. Mastermind then tells you how to redistribute your study time to close the gap before your exam date.",
  },
  {
    question: "How does Mastermind help GATE preparation?",
    answer:
      "Mastermind identifies which GATE subjects carry the most marks weight and cross-references that with your current completion. It tells you if spending more time on TOC is worth it vs improving your Programming & DS accuracy which could recover more marks faster.",
  },
  {
    question: "Can I prepare for GATE while working a job?",
    answer:
      "Yes — and Kalnehi Daily is especially useful for working professionals. With 2-3 hours per day, you need brutal prioritisation. Kalnehi Daily's daily planner helps you plan each night what to cover the next morning, so you don't waste 20 minutes deciding what to study.",
  },
  {
    question: "Does Kalnehi Daily work for GATE ECE, ME, and other branches?",
    answer:
      "Yes. While our syllabus page is optimised for GATE CSE and GATE ECE, the tracker works for any branch. You can manually set up your branch's subject list and track topics within each subject.",
  },
  {
    question: "How does voice control help during GATE prep?",
    answer:
      "When you're deep in Algorithm problem sets or debugging circuit problems, you can log your progress with voice: 'Hey Boss, log 2 hours of Algorithms done — covered dynamic programming.' No interruption to your study session.",
  },
];

export default function GatePage() {
  return (
    <>
      <MarketingPageJsonLd
        breadcrumbs={[
          { name: "Home", path: "/" },
          { name: "GATE Preparation Daily Planner", path: "/gate" },
        ]}
        faqs={FAQS}
        webPage={{
          name: `Daily Planner for GATE Preparation | ${SITE_NAME}`,
          description: `GATE covers 10+ technical subjects. Kalnehi Daily tracks your subject-wise progress and helps Mastermind identify your biggest score gaps.`,
        }}
      />

      <Breadcrumbs items={[
          { name: "Home", path: "/" },
          { name: "GATE Preparation Daily Planner", path: "/gate" },
        ]} className="mb-2" />

      <article className="space-y-12">
        <ExamHero
          badge="GATE — Graduate Aptitude Test in Engineering"
          headline="GATE Preparation Daily Planner — 10 Subjects, 6 Months, Zero Left Behind"
          subheadline="GATE tests depth across multiple technical subjects simultaneously. The students who crack it aren't smarter — they have a system that ensures no subject gets neglected while another absorbs all their time."
          stats={[
            { value: "10+", label: "technical subjects for GATE CSE" },
            { value: "6 months", label: "typical focused prep window" },
            { value: "₹0", label: "to start — 3 days free" },
          ]}
        />

        <section className="space-y-5" aria-labelledby="gate-syllabus">
          <h2 id="gate-syllabus" className="text-xl font-bold text-kal-text">GATE CSE syllabus — tracked in Kalnehi Daily</h2>
          <p className="text-sm leading-relaxed text-kal-text-secondary">
            Every GATE subject can be added to Kalnehi Daily's syllabus tracker. Here's how GATE CSE maps
            across subjects — each with individual topics you can mark as done, in progress, or needing
            revision.
          </p>
          <div className="grid gap-3 sm:grid-cols-2">
            {GATE_CSE_SUBJECTS.map(({ subject, topics }) => (
              <div key={subject} className="kal-glass-card rounded-xl p-4 space-y-1.5">
                <h3 className="text-xs font-bold text-kal-accent-dark uppercase tracking-wide">{subject}</h3>
                <ul className="space-y-0.5">
                  {topics.map((t) => (
                    <li key={t} className="text-xs text-kal-text-secondary">· {t}</li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
          <p className="text-sm text-kal-text-secondary">
            Engineering Mathematics and Algorithms together account for ~25% of GATE marks. Kalnehi Daily
            helps you track them as separate subjects and ensure they get proportional prep time.
          </p>
        </section>

        <section className="space-y-4" aria-labelledby="gate-mastermind">
          <h2 id="gate-mastermind" className="text-xl font-bold text-kal-text">How Mastermind helps GATE aspirants</h2>
          <div className="grid gap-4 sm:grid-cols-2">
            <FeatureBlock
              title="Subject weight vs completion analysis"
              description="Mastermind cross-references GATE subject marks distribution with your syllabus completion. It tells you which subjects are highest leverage right now — not which ones you feel comfortable studying."
              tag="AI Strategy"
            />
            <FeatureBlock
              title="Previous year question pattern analysis"
              description="Mastermind tracks which GATE topics you've practiced PYQs for and which you haven't. Previous year questions are the single best GATE practice resource — Mastermind makes sure you don't skip them."
              tag="PYQ Tracking"
            />
            <FeatureBlock
              title="Mock gate score analysis"
              description="Log your GATE mock scores subject-wise. Mastermind identifies your score trend across subjects and tells you which ones have the most improvement potential left."
              tag="Score Analysis"
            />
            <FeatureBlock
              title="Final 30-day revision plan"
              description="In the last 30 days before GATE, Mastermind shifts to revision mode — it tells you which subjects to touch again and which to trust, so you don't waste time rereading what you already know."
              tag="Final Revision"
            />
          </div>
        </section>

        <section className="space-y-4" aria-labelledby="gate-voice">
          <h2 id="gate-voice" className="text-xl font-bold text-kal-text">Voice control for GATE prep</h2>
          <div className="space-y-3">
            {[
              { cmd: "Hey Boss, log 3 hours of Signals and Systems done", result: "Study session logged, GATE ECE tracker updated" },
              { cmd: "Hey Boss, mark Computer Networks as needs revision", result: "Revision window scheduled for next week" },
              { cmd: "Hey Boss, set a daily alarm for GATE practice at 5:30 AM", result: "Daily study alarm created" },
            ].map(({ cmd, result }) => (
              <div key={cmd} className="kal-glass-card rounded-xl p-4 space-y-1">
                <p className="text-sm font-semibold text-kal-text">"{cmd}"</p>
                <p className="text-xs text-kal-text-secondary">→ {result}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="space-y-2" aria-labelledby="gate-related">
          <h2 id="gate-related" className="text-base font-semibold text-kal-text">Read next</h2>
          <ul className="space-y-1.5 text-sm">
            <li>
              <Link href="/blog/gate-preparation-daily-plan" className="font-medium text-kal-accent-dark hover:underline">
                GATE Preparation Daily Plan — How to Cover 10 Subjects Without Losing Track
              </Link>
            </li>
            <li>
              <Link href="/for/engineering-students-gate" className="font-medium text-kal-accent-dark hover:underline">
                Kalnehi Daily for Engineering Students Preparing GATE
              </Link>
            </li>
            <li>
              <Link href="/syllabus/gate-cse" className="font-medium text-kal-accent-dark hover:underline">
                Complete GATE CSE Syllabus — All Subjects and Topics
              </Link>
            </li>
          </ul>
        </section>

        <FAQBlock items={FAQS} />
        <CTABanner headline="Build your GATE prep system today" subtext="3 days free. Full access. No credit card." />
      </article>
    </>
  );
}

import Link from "next/link";
import { CTABanner } from "@/components/marketing/CTABanner";
import { ExamHero } from "@/components/marketing/ExamHero";
import { FAQBlock } from "@/components/marketing/FAQBlock";
import { Breadcrumbs } from "@/components/seo/Breadcrumbs";
import { MarketingPageJsonLd } from "@/components/seo/MarketingPageJsonLd";
import { marketingPageMetadata } from "@/lib/marketing-seo";
import { SITE_NAME } from "@/lib/seo-metadata";

export const metadata = marketingPageMetadata({
  path: "/jee-main",
  title: `Daily Planner for JEE Main Preparation | ${SITE_NAME}`,
  description: `JEE Main is the qualifier for Advanced and the gateway to top NITs. Kalnehi helps you track PCM chapter-by-chapter, build daily consistency, and use PrepBrain AI to prioritise what moves the needle.`,
});

const FAQS = [
  { question: "How many attempts do I get for JEE Main?", answer: "JEE Main is held twice a year (January and April sessions). You can attempt both and your best score is counted. This gives you two chances to qualify for JEE Advanced." },
  { question: "What is a good score in JEE Main for top NITs?", answer: "For top NITs like NIT Trichy, Warangal and Surathkal, you typically need 97-99 percentile. For other good NITs, 90-96 percentile can open doors. Kalnehi's marks engine helps you target the specific percentile you need." },
  { question: "How does Kalnehi help JEE Main preparation differently from JEE Advanced prep?", answer: "JEE Main tests breadth — all NCERT-level topics across PCM. Kalnehi helps you ensure complete syllabus coverage with no gaps. JEE Advanced tests depth and problem-solving. Kalnehi helps shift your practice towards harder problem types as you move from Main to Advanced prep." },
  { question: "Can I prepare for JEE Main and Boards simultaneously using Kalnehi?", answer: "Yes. Many students need to balance JEE Main with Class 12 Board exams. Kalnehi lets you track both exam syllabuses in one place and plan each day across both." },
];

export default function JeeMainPage() {
  return (
    <>
      <MarketingPageJsonLd
        breadcrumbs={[{ name: "Home", path: "/" }, { name: "JEE Main Preparation", path: "/jee-main" }]}
        faqs={FAQS}
      />

      <Breadcrumbs items={[{ name: "Home", path: "/" }, { name: "JEE Main Preparation", path: "/jee-main" }]} className="mb-2" />
      <article className="space-y-10">
        <ExamHero
          badge="JEE Main"
          headline="JEE Main Preparation Daily Planner — Track Every Chapter, Build Daily Output"
          subheadline="JEE Main rewards complete syllabus coverage and consistent daily practice. One chapter left blank in Optics or Thermodynamics can cost you 4-8 marks. Kalnehi ensures nothing slips through."
        />

        <section className="space-y-4" aria-labelledby="jeemain-how">
          <h2 id="jeemain-how" className="text-xl font-bold text-kal-text">How Kalnehi helps JEE Main aspirants</h2>
          <ul className="space-y-3 text-sm text-kal-text-secondary leading-relaxed">
            <li className="kal-glass-card rounded-xl p-4"><strong className="text-kal-text block mb-1">Complete PCM syllabus tracking</strong>Mark every Physics, Chemistry and Maths chapter — from Kinematics to Coordination Compounds to Integration. See your completion percentage per subject at a glance.</li>
            <li className="kal-glass-card rounded-xl p-4"><strong className="text-kal-text block mb-1">Spaced revision engine</strong>JEE Main demands you remember chapters studied months ago. Kalnehi's spaced revision engine schedules each chapter for review at the right intervals — 1 day, 3 days, 1 week, 2 weeks, 1 month.</li>
            <li className="kal-glass-card rounded-xl p-4"><strong className="text-kal-text block mb-1">Dual-session planning (Jan + April)</strong>If you plan to attempt both JEE Main sessions, Kalnehi helps you plan a structured improvement cycle between the two attempts — identifying what went wrong in January and what to fix for April.</li>
            <li className="kal-glass-card rounded-xl p-4"><strong className="text-kal-text block mb-1">PrepBrain AI strategy</strong>PrepBrain reads your completion data and tells you which topics carry maximum JEE Main weightage that you haven't fully covered. It also recommends the number of practice problems per chapter based on your current accuracy.</li>
          </ul>
        </section>

        <section className="space-y-2" aria-labelledby="jeemain-links">
          <h2 id="jeemain-links" className="text-base font-semibold text-kal-text">Also useful</h2>
          <ul className="space-y-1 text-sm">
            <li><Link href="/jee" className="font-medium text-kal-accent-dark hover:underline">JEE Main & Advanced full prep guide →</Link></li>
            <li><Link href="/syllabus/jee-main" className="font-medium text-kal-accent-dark hover:underline">Complete JEE Main syllabus — all chapters →</Link></li>
            <li><Link href="/blog/how-to-make-daily-study-timetable-jee" className="font-medium text-kal-accent-dark hover:underline">How to make a JEE daily study timetable →</Link></li>
          </ul>
        </section>

        <FAQBlock items={FAQS} />
        <CTABanner headline="Start your JEE Main prep system" subtext="3 days free. Full PrepBrain AI access. No card needed." />
      </article>
    </>
  );
}

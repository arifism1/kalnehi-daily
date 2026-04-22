import Link from "next/link";
import { CTABanner } from "@/components/marketing/CTABanner";
import { ExamHero } from "@/components/marketing/ExamHero";
import { FAQBlock } from "@/components/marketing/FAQBlock";
import { Breadcrumbs } from "@/components/seo/Breadcrumbs";
import { MarketingPageJsonLd } from "@/components/seo/MarketingPageJsonLd";
import { marketingPageMetadata } from "@/lib/marketing-seo";
import { SITE_NAME } from "@/lib/seo-metadata";

export const metadata = marketingPageMetadata({
  path: "/neet-pg",
  title: `Daily Planner for NEET PG Preparation | ${SITE_NAME}`,
  description: `NEET PG covers 19 clinical subjects. Most medical graduates prepare while doing internship. Kalnehi's daily planner and PrepBrain AI help you get maximum output from limited study hours.`,
});

const FAQS = [
  { question: "How does Kalnehi help NEET PG aspirants who are doing internship?", answer: "Internship leaves you with 2-4 hours of study time per day at most. Kalnehi helps you plan exactly which subject and which topic to cover in those limited hours — and tracks your completion so you don't realise in month 8 that you've barely touched Medicine or Surgery." },
  { question: "What subjects are covered in NEET PG?", answer: "NEET PG tests all 19 clinical subjects from MBBS including Medicine, Surgery, Obstetrics & Gynaecology, Paediatrics, ENT, Ophthalmology, Psychiatry, Dermatology, Orthopaedics, Radiology, and pre-clinical subjects like Anatomy, Physiology, Biochemistry, Pathology, Microbiology, Pharmacology, Forensic Medicine, and Community Medicine." },
  { question: "How does PrepBrain AI help NEET PG preparation?", answer: "PrepBrain reads your subject-wise completion and cross-references with NEET PG question frequency data. It tells you which high-yield subjects you're under-investing in — Surgery and Medicine together make up 30%+ of NEET PG marks." },
  { question: "Is Kalnehi useful for NEXT (National Exit Test) preparation too?", answer: "Yes. NEXT has a similar subject structure to NEET PG. Kalnehi's syllabus tracker works for any subject list — set up your NEXT subjects and track them the same way." },
];

export default function NeetPgPage() {
  return (
    <>
      <MarketingPageJsonLd
        breadcrumbs={[{ name: "Home", path: "/" }, { name: "NEET PG Preparation", path: "/neet-pg" }]}
        faqs={FAQS}
      />

      <Breadcrumbs items={[{ name: "Home", path: "/" }, { name: "NEET PG Preparation", path: "/neet-pg" }]} className="mb-2" />
      <article className="space-y-10">
        <ExamHero
          badge="NEET PG — Medical PG Entrance"
          headline="NEET PG Preparation Daily Planner — 19 Subjects, Limited Hours, Zero Compromise"
          subheadline="NEET PG aspirants carry one of the toughest preparation loads in India — 19 clinical subjects, revised during internship with barely 3 hours of free time per day. Kalnehi helps you make every hour count."
          stats={[{ value: "19", label: "clinical subjects" }, { value: "2-4 hrs/day", label: "typical internship window" }]}
        />

        <section className="space-y-3" aria-labelledby="neetpg-system">
          <h2 id="neetpg-system" className="text-xl font-bold text-kal-text">How Kalnehi helps NEET PG aspirants</h2>
          <ul className="space-y-3 text-sm">
            {[
              { t: "19-subject syllabus tracker", d: "Track progress across Medicine, Surgery, OBG, Paediatrics, Pathology, Microbiology and all other NEET PG subjects at the topic level. See which subjects are lagging in one view." },
              { t: "High-yield topic prioritisation", d: "PrepBrain flags the NEET PG high-yield subjects (Medicine, Surgery, OBG, Paediatrics) and ensures you're giving them proportional preparation time relative to their marks weight." },
              { t: "Grand test planning", d: "Log your NEET PG grand test scores and PrepBrain tracks your percentile trend. It tells you which subject is consistently pulling your rank down and what to focus on before the next test." },
              { t: "Voice logging during busy rotations", d: "Say 'Hey Boss, log 1 hour of Pharmacology done' after a night shift without opening your phone. Hands-free tracking for your busiest rotation weeks." },
            ].map(({ t, d }) => (
              <div key={t} className="kal-glass-card rounded-xl p-4">
                <strong className="text-kal-text block mb-1">{t}</strong>
                <p className="text-kal-text-secondary">{d}</p>
              </div>
            ))}
          </ul>
        </section>

        <section className="space-y-2">
          <h2 className="text-base font-semibold text-kal-text">Related pages</h2>
          <ul className="space-y-1 text-sm">
            <li><Link href="/neet" className="font-medium text-kal-accent-dark hover:underline">NEET UG Preparation →</Link></li>
            <li><Link href="/features/prepbrain-ai" className="font-medium text-kal-accent-dark hover:underline">PrepBrain AI — your personal study strategist →</Link></li>
          </ul>
        </section>

        <FAQBlock items={FAQS} />
        <CTABanner headline="Build your NEET PG prep system" subtext="3 days free. Full PrepBrain AI. No credit card." />
      </article>
    </>
  );
}

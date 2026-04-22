import Link from "next/link";

import { CTABanner } from "@/components/marketing/CTABanner";
import { ExamHero } from "@/components/marketing/ExamHero";
import { FeatureBlock } from "@/components/marketing/FeatureBlock";
import { FAQBlock } from "@/components/marketing/FAQBlock";
import { MarketingPageJsonLd } from "@/components/seo/MarketingPageJsonLd";
import { marketingPageMetadata } from "@/lib/marketing-seo";
import { SITE_NAME } from "@/lib/seo-metadata";

export const metadata = marketingPageMetadata({
  path: "/upsc",
  title: `Daily Planner for UPSC CSE Preparation | ${SITE_NAME}`,
  description: `UPSC needs years of consistent preparation across GS, Essay and Optional. Kalnehi gives working professionals and full-time aspirants a daily planning system that survives the long haul.`,
});

const SYLLABUS = [
  {
    paper: "Prelims",
    topics: [
      "GS Paper I: History, Polity, Geography, Economy, Environment, Science & Tech, Current Affairs",
      "CSAT Paper II: Comprehension, Reasoning, Maths, Decision Making (qualifying)",
    ],
  },
  {
    paper: "Mains",
    topics: [
      "GS Paper I: Indian Heritage, History, World Geography, Indian Society",
      "GS Paper II: Polity, Governance, Constitution, International Relations",
      "GS Paper III: Economy, Technology, Environment, Internal Security",
      "GS Paper IV: Ethics, Integrity, Aptitude (Case Studies)",
      "Essay Paper: Two essays — philosophical + social/political",
      "Optional Paper I & II: 48 subjects to choose from",
      "Language Papers (qualifying): English + any Indian language",
    ],
  },
  {
    paper: "Interview",
    topics: [
      "Personality Test: 275 marks",
      "Board tests awareness, communication, judgment and leadership potential",
      "No fixed syllabus — you are the syllabus",
    ],
  },
];

const FAQS = [
  {
    question: "Why do most UPSC aspirants fail despite knowing the syllabus?",
    answer:
      "Because they cannot sustain consistent preparation over 12-18 months. They have good weeks and terrible weeks, with no system to catch the slippage. Kalnehi's consistency heatmap, streak tracker and daily plan help you build the kind of boring, reliable daily output that UPSC rewards.",
  },
  {
    question: "How does Kalnehi help working professionals preparing for UPSC?",
    answer:
      "Working professionals typically have 3-4 hours per day at most. Kalnehi's daily planner helps you extract maximum output from those hours — logging what you actually covered, tracking GS topics, and using PrepBrain AI to tell you which paper is most behind schedule.",
  },
  {
    question: "How does PrepBrain AI help UPSC preparation?",
    answer:
      "PrepBrain reads your GS completion, your Optional progress, and your daily logs. It tells you if you're spending disproportionate time on GS1 while GS4 (Ethics) is neglected. For UPSC, topic balance matters as much as depth.",
  },
  {
    question: "Can Kalnehi help me track Current Affairs for UPSC?",
    answer:
      "Yes. You can create daily log entries for Current Affairs reading — newspapers, PIB summaries, monthly magazines. Track it as a habit with daily check-in so you never miss a day of Current Affairs coverage.",
  },
  {
    question: "Does Kalnehi work for UPSC Optional subjects?",
    answer:
      "Yes. The syllabus tracker is flexible — you can add your Optional subject's syllabus (say, History or Public Administration) and track topics just like GS subjects. PrepBrain will also account for Optional when giving strategy advice.",
  },
];

export default function UpscPage() {
  return (
    <>
      <MarketingPageJsonLd
        breadcrumbs={[
          { name: "Home", path: "/" },
          { name: "UPSC Preparation Daily Planner", path: "/upsc" },
        ]}
        faqs={FAQS}
        webPage={{
          name: `Daily Planner for UPSC CSE Preparation | ${SITE_NAME}`,
          description: `UPSC needs years of consistent preparation across GS, Essay and Optional. Kalnehi gives aspirants a daily planning system that survives the long haul.`,
        }}
      />

      <article className="space-y-12">
        <ExamHero
          badge="UPSC CSE"
          headline="UPSC Preparation Daily Planner — The Most Unpredictable Exam Needs the Most Consistent System"
          subheadline="UPSC doesn't just test knowledge. It tests how long you can sustain serious, consistent preparation without breaking down. Most aspirants fail consistency, not content. Kalnehi fixes that."
          stats={[
            { value: "9 papers", label: "Prelims + Mains + Interview" },
            { value: "2,000+", label: "hours of prep over 12-18 months" },
            { value: "₹0", label: "to start — 3 days free" },
          ]}
        />

        {/* Section 2 — Syllabus */}
        <section className="space-y-5" aria-labelledby="upsc-syllabus">
          <h2 id="upsc-syllabus" className="text-xl font-bold text-kal-text">
            How Kalnehi maps to the UPSC CSE structure
          </h2>
          <p className="text-sm leading-relaxed text-kal-text-secondary">
            UPSC CSE has three stages — Prelims, Mains, and Interview. Most aspirants prepare for all
            three simultaneously while managing Current Affairs daily. Kalnehi gives you a system to track
            all of it without a single spreadsheet.
          </p>
          <div className="grid gap-4 sm:grid-cols-3">
            {SYLLABUS.map(({ paper, topics }) => (
              <div key={paper} className="kal-glass-card rounded-2xl p-4 space-y-2">
                <h3 className="text-sm font-bold text-kal-accent-dark uppercase tracking-wide">{paper}</h3>
                <ul className="space-y-1.5">
                  {topics.map((t) => (
                    <li key={t} className="text-xs text-kal-text-secondary leading-snug">· {t}</li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </section>

        {/* Section 3 — PrepBrain */}
        <section className="space-y-4" aria-labelledby="upsc-prepbrain">
          <h2 id="upsc-prepbrain" className="text-xl font-bold text-kal-text">
            How PrepBrain AI helps UPSC aspirants
          </h2>
          <div className="grid gap-4 sm:grid-cols-2">
            <FeatureBlock
              title="GS paper balance monitoring"
              description="PrepBrain tracks your coverage across GS1, GS2, GS3, GS4 and Essay. It flags when one paper is significantly behind and tells you how many focused hours are needed to close the gap before your Prelims date."
              tag="Study Balance"
            />
            <FeatureBlock
              title="Optional subject tracking"
              description="Whatever Optional you've chosen — History, Geography, PSIR, Sociology — PrepBrain tracks your syllabus coverage and factors it into your weekly planning alongside GS."
              tag="Optional Tracking"
            />
            <FeatureBlock
              title="Current affairs integration"
              description="Log your daily newspaper reading and PIB coverage as habits. PrepBrain monitors the streak and alerts you when you've missed days — because for UPSC, current affairs gaps compound quickly."
              tag="Current Affairs"
            />
            <FeatureBlock
              title="Long-haul consistency support"
              description="UPSC prep takes 12-18 months. PrepBrain analyses your weekly output trends and tells you when your consistency is slipping — before you realise you've wasted three weeks."
              tag="Consistency"
            />
          </div>
        </section>

        {/* Section 4 — Voice control */}
        <section className="space-y-4" aria-labelledby="upsc-voice">
          <h2 id="upsc-voice" className="text-xl font-bold text-kal-text">
            Voice control for UPSC prep
          </h2>
          <div className="space-y-3">
            {[
              {
                cmd: "Hey Boss, log 2 hours of Polity done — covered fundamental rights",
                result: "Session logged, GS Paper II tracker updated",
              },
              {
                cmd: "Hey Boss, set a reminder to read today's newspaper at 6 AM",
                result: "Daily Current Affairs reminder set",
              },
              {
                cmd: "Hey Boss, mark Indian Economy Chapter 4 as needs revision",
                result: "Spaced revision window scheduled for that chapter",
              },
            ].map(({ cmd, result }) => (
              <div key={cmd} className="kal-glass-card rounded-xl p-4 space-y-1">
                <p className="text-sm font-semibold text-kal-text">"{cmd}"</p>
                <p className="text-xs text-kal-text-secondary">→ {result}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="space-y-2" aria-labelledby="upsc-related">
          <h2 id="upsc-related" className="text-base font-semibold text-kal-text">Read next</h2>
          <ul className="space-y-1.5 text-sm">
            <li>
              <Link href="/blog/upsc-consistency-more-important-than-hours" className="font-medium text-kal-accent-dark hover:underline">
                Why UPSC Toppers Study Fewer Hours Than You — And Score More
              </Link>
            </li>
            <li>
              <Link href="/blog/upsc-daily-study-routine" className="font-medium text-kal-accent-dark hover:underline">
                UPSC Daily Study Routine — What a 12-Hour Prep Day Actually Looks Like
              </Link>
            </li>
            <li>
              <Link href="/for/upsc-working-professionals" className="font-medium text-kal-accent-dark hover:underline">
                Kalnehi for UPSC Working Professionals
              </Link>
            </li>
          </ul>
        </section>

        <FAQBlock items={FAQS} />

        <CTABanner
          headline="Build the UPSC preparation system that actually lasts"
          subtext="3 days free. Full access. No credit card required."
        />
      </article>
    </>
  );
}

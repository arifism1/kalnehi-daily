import Link from "next/link";
import { CTABanner } from "@/components/marketing/CTABanner";
import { Breadcrumbs } from "@/components/seo/Breadcrumbs";
import { MarketingPageJsonLd } from "@/components/seo/MarketingPageJsonLd";
import { marketingPageMetadata } from "@/lib/marketing-seo";
import { SITE_NAME } from "@/lib/seo-metadata";

export const metadata = marketingPageMetadata({
  path: "/tools",
  title: `Free Study Tools for Exam Preparation | ${SITE_NAME}`,
  description: `Free calculators and tools for Indian competitive exam aspirants. Study hours calculator, exam countdown timer, and spaced revision scheduler. No login required.`,
});

const TOOLS = [
  {
    href: "/tools/study-hours-calculator",
    name: "Study Hours Calculator",
    description: "Enter your exam date, remaining topics, and available hours per day. Get a feasibility assessment and recommended daily study hours.",
    badge: "Calculator",
  },
  {
    href: "/tools/exam-countdown",
    name: "Exam Countdown Timer",
    description: "Select your exam, see exactly how many days, weeks, and months remain. Get a shareable link to keep you honest.",
    badge: "Countdown",
  },
  {
    href: "/tools/revision-scheduler",
    name: "Spaced Revision Scheduler",
    description: "Enter your topics and when you studied them. Get a personalised revision schedule based on the spacing effect. Export as CSV.",
    badge: "Scheduler",
  },
];

export default function ToolsPage() {
  return (
    <>
      <MarketingPageJsonLd
        breadcrumbs={[{ name: "Home", path: "/" }, { name: "Free Tools", path: "/tools" }]}
        webPage={{
          name: `Free Study Tools | ${SITE_NAME}`,
          description: "Free calculators and planning tools for Indian competitive exam aspirants. No login required.",
        }}
      />

      <Breadcrumbs items={[{ name: "Home", path: "/" }, { name: "Free Tools", path: "/tools" }]} className="mb-2" />

      <div className="space-y-10">
        <header className="space-y-4">
          <p className="inline-flex items-center gap-1.5 rounded-full border border-kal-accent/25 bg-kal-accent-soft px-3 py-1 text-xs font-bold uppercase tracking-wide text-kal-accent-dark">
            <span className="h-1.5 w-1.5 rounded-full bg-kal-accent" aria-hidden />
            Free Tools — No login required
          </p>
          <h1 className="kal-feature-title">Free Study Planning Tools for Competitive Exams</h1>
          <p className="max-w-2xl text-base text-kal-text-secondary">
            Three tools that answer the questions every exam aspirant has but never gets a precise answer for. Free, instant, no signup.
          </p>
        </header>

        <div className="grid gap-4 sm:grid-cols-3">
          {TOOLS.map(({ href, name, description, badge }) => (
            <Link
              key={href}
              href={href}
              className="kal-glass-card rounded-2xl p-6 space-y-3 hover:border-kal-accent/30 transition-colors group"
            >
              <span className="inline-block rounded-full bg-kal-accent-soft px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-kal-accent-dark">
                {badge}
              </span>
              <h2 className="text-base font-semibold text-kal-text group-hover:text-kal-accent-dark transition-colors">
                {name}
              </h2>
              <p className="text-sm leading-relaxed text-kal-text-secondary">{description}</p>
              <span className="text-xs font-semibold text-kal-accent-dark">Use tool →</span>
            </Link>
          ))}
        </div>

        <div className="kal-glass-card rounded-2xl p-6 space-y-3">
          <h2 className="text-base font-semibold text-kal-text">Want full daily planning inside one app?</h2>
          <p className="text-sm text-kal-text-secondary">
            These free tools answer point-in-time questions. Kalnehi is your ongoing daily operating system — syllabus tracker, Mastermind, voice control, consistency heatmap, and everything else that makes exam prep sustainable for months.
          </p>
          <Link
            href="/auth"
            className="inline-flex min-h-[44px] items-center justify-center rounded-full bg-kal-accent px-6 text-sm font-bold text-white transition hover:brightness-105"
          >
            Start free — 3 days on us
          </Link>
        </div>

        <CTABanner
          headline="These tools are free. The full system is better."
          subtext="Start free for 3 days — Mastermind, syllabus tracker, voice control, and everything else."
        />
      </div>
    </>
  );
}

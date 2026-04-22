import { marketingPageMetadata } from "@/lib/marketing-seo";
import { SITE_NAME } from "@/lib/seo-metadata";

export const metadata = marketingPageMetadata({
  path: "/changelog",
  title: `Changelog — What's New in Kalnehi Daily | ${SITE_NAME}`,
  description: `See every update, new feature, and bug fix in Kalnehi Daily. We ship improvements every week for JEE, NEET, UPSC, CAT, GATE, CA, and all Indian exam aspirants.`,
});

interface ChangeEntry {
  version: string;
  date: string;
  type: "feature" | "improvement" | "fix";
  title: string;
  description: string;
}

interface Release {
  version: string;
  date: string;
  summary: string;
  changes: ChangeEntry[];
}

const RELEASES: Release[] = [
  {
    version: "2.4",
    date: "April 2026",
    summary: "PrepBrain AI context improvements, CUET and NDA syllabus added to Syllabus Tracker, mobile revision scheduling improvements.",
    changes: [
      { version: "2.4", date: "April 2026", type: "feature", title: "CUET and NDA syllabus added", description: "Syllabus Tracker now includes complete syllabi for CUET UG/PG and NDA (Maths + GAT). Select your exam during onboarding or from Settings → Exam." },
      { version: "2.4", date: "April 2026", type: "improvement", title: "PrepBrain AI context awareness", description: "PrepBrain now considers your revision history alongside coverage — giving advice that accounts for topics you studied long ago and haven't revisited." },
      { version: "2.4", date: "April 2026", type: "improvement", title: "Mobile revision scheduling", description: "The Spaced Revision Engine's scheduling view is now fully optimized for mobile. Swipe to mark topics as revised, reschedule, or skip." },
      { version: "2.4", date: "April 2026", type: "fix", title: "Voice log persistence on Safari iOS", description: "Fixed an issue where voice-logged doubts were not saving correctly on Safari (iOS 17+). All voice input now persists correctly." },
    ],
  },
  {
    version: "2.3",
    date: "March 2026",
    summary: "On-camera study mode (public beta), IBPS PO and SBI PO syllabi, new Marks Engine subjects.",
    changes: [
      { version: "2.3", date: "March 2026", type: "feature", title: "On-Camera Study mode — public beta", description: "Enable camera-on study sessions for accountability. No video is stored or transmitted — the camera feed is processed locally. Your session logs confirm camera-on time." },
      { version: "2.3", date: "March 2026", type: "feature", title: "IBPS PO and SBI PO syllabi", description: "Banking exam syllabi now available in Syllabus Tracker. Includes Quantitative Aptitude, Reasoning, English, GA, and Computer Knowledge." },
      { version: "2.3", date: "March 2026", type: "improvement", title: "Marks Engine — additional subjects", description: "Added per-subject and per-topic scoring support for CA Foundation, CLAT, and SSC CGL. Log mock scores at a more granular level." },
      { version: "2.3", date: "March 2026", type: "fix", title: "Daily Planner date navigation", description: "Fixed an edge case where navigating to future dates in the Daily Planner could show incorrect revision recommendations." },
    ],
  },
  {
    version: "2.2",
    date: "February 2026",
    summary: "Daily Log redesign, PrepBrain voice commands expansion, performance improvements across the app.",
    changes: [
      { version: "2.2", date: "February 2026", type: "improvement", title: "Daily Log redesign", description: "The Daily Log now shows a weekly view alongside the daily entry, making weekly patterns visible without switching screens." },
      { version: "2.2", date: "February 2026", type: "improvement", title: "PrepBrain voice commands expanded", description: "PrepBrain now responds to 20+ new natural language commands. Examples: 'What should I revise today?', 'How many topics left in Organic Chemistry?', 'Show me my weakest subjects'." },
      { version: "2.2", date: "February 2026", type: "improvement", title: "App performance — 40% faster loading", description: "Significant client-side performance improvements. Cold start time reduced by ~40%. Revision schedule calculations are now instant on all devices." },
      { version: "2.2", date: "February 2026", type: "fix", title: "Streak calculation edge case", description: "Fixed a bug where studying past midnight (e.g. 12:30 AM) was incorrectly attributed to the next day, breaking streak continuity." },
    ],
  },
  {
    version: "2.1",
    date: "January 2026",
    summary: "Habit Maker launched, multi-exam support (switch between exams), GRE and SAT syllabi.",
    changes: [
      { version: "2.1", date: "January 2026", type: "feature", title: "Habit Maker", description: "Build study habits alongside your daily planning. Define habits (e.g. '30-min revision every morning'), track completion, and see streaks independently of your main study log." },
      { version: "2.1", date: "January 2026", type: "feature", title: "Multi-exam support", description: "You can now prepare for up to 2 exams simultaneously. Switch between exam contexts in the sidebar. PrepBrain, Syllabus Tracker, and Marks Engine are all exam-specific." },
      { version: "2.1", date: "January 2026", type: "feature", title: "GRE and SAT syllabi", description: "Syllabus Tracker now supports GRE (Verbal, Quant, AWA) and SAT (Math, EBRW) with section-wise topic tracking." },
      { version: "2.1", date: "January 2026", type: "fix", title: "PrepBrain response formatting", description: "Fixed markdown rendering in PrepBrain responses. Lists, bold text, and code blocks now display correctly across all browsers." },
    ],
  },
  {
    version: "2.0",
    date: "December 2025",
    summary: "Major update: PrepBrain AI, Spaced Revision Engine, and On-Camera Study mode (alpha). New design system.",
    changes: [
      { version: "2.0", date: "December 2025", type: "feature", title: "PrepBrain AI — General availability", description: "PrepBrain AI is out of alpha. Context-aware exam preparation AI trained with knowledge of JEE, NEET, UPSC, CAT, GATE, CA, and 20+ Indian competitive exams. Available on all paid plans." },
      { version: "2.0", date: "December 2025", type: "feature", title: "Spaced Revision Engine — General availability", description: "Automated revision scheduling based on forgetting curve intervals (Day 1, 3, 7, 14, 30, 60, 90). Works across all subjects and exams." },
      { version: "2.0", date: "December 2025", type: "feature", title: "New design system", description: "Complete redesign with improved contrast, better mobile layout, and reduced visual clutter. Dark mode improvements. DM Sans body font, DM Serif Display for headings." },
      { version: "2.0", date: "December 2025", type: "improvement", title: "Syllabus Tracker — granularity", description: "Topics can now be marked as Not Started / In Progress / Done / Needs Revision — more nuance than the previous binary complete/incomplete." },
    ],
  },
  {
    version: "1.8",
    date: "October 2025",
    summary: "Consistency Tracker, improved Doubt Tracker with resolution workflow, UPSC optional subject support.",
    changes: [
      { version: "1.8", date: "October 2025", type: "feature", title: "Consistency Tracker", description: "Weekly and monthly view of actual study hours, daily study streaks, and target vs actual comparison. The most honest view of your preparation." },
      { version: "1.8", date: "October 2025", type: "improvement", title: "Doubt Tracker — resolution workflow", description: "Doubts now have a resolution workflow: Open → Addressed → Closed. Link resolved doubts to a source (book, YouTube, teacher) for future reference." },
      { version: "1.8", date: "October 2025", type: "feature", title: "UPSC optional subject syllabus", description: "Added 20 UPSC optional subjects to Syllabus Tracker, including Sociology, Geography, History, Public Administration, and more." },
    ],
  },
];

const typeColors: Record<ChangeEntry["type"], string> = {
  feature: "bg-kal-accent/10 text-kal-accent-dark",
  improvement: "bg-blue-500/10 text-blue-600 dark:text-blue-400",
  fix: "bg-green-500/10 text-green-700 dark:text-green-400",
};

const typeLabels: Record<ChangeEntry["type"], string> = {
  feature: "New",
  improvement: "Improved",
  fix: "Fixed",
};

export default function ChangelogPage() {
  return (
    <div className="space-y-12">
      <header className="space-y-3">
        <p className="inline-flex items-center gap-1.5 rounded-full border border-kal-accent/25 bg-kal-accent-soft px-3 py-1 text-xs font-bold uppercase tracking-wide text-kal-accent-dark">
          <span className="h-1.5 w-1.5 rounded-full bg-kal-accent" aria-hidden />
          Changelog
        </p>
        <h1 className="kal-feature-title">What&apos;s new in Kalnehi</h1>
        <p className="max-w-xl text-sm leading-relaxed text-kal-text-secondary">
          Every feature we ship, every bug we fix, every improvement we make — in one place, newest first. We ship meaningful updates every 2-4 weeks.
        </p>
      </header>

      <div className="space-y-12">
        {RELEASES.map((release) => (
          <section key={release.version} className="space-y-5">
            <div className="flex items-baseline gap-3 border-b border-kal-border pb-3">
              <h2 className="text-xl font-bold text-kal-text">v{release.version}</h2>
              <span className="text-sm text-kal-muted">{release.date}</span>
            </div>
            <p className="text-sm text-kal-text-secondary leading-relaxed">{release.summary}</p>
            <div className="space-y-3">
              {release.changes.map((change) => (
                <div key={change.title} className="flex gap-3">
                  <span
                    className={`mt-0.5 flex-shrink-0 rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide h-fit ${typeColors[change.type]}`}
                  >
                    {typeLabels[change.type]}
                  </span>
                  <div className="space-y-0.5">
                    <p className="text-sm font-semibold text-kal-text">{change.title}</p>
                    <p className="text-sm text-kal-text-secondary leading-relaxed">{change.description}</p>
                  </div>
                </div>
              ))}
            </div>
          </section>
        ))}
      </div>

      <div className="rounded-2xl border border-kal-border bg-kal-card p-5 space-y-2">
        <p className="text-sm font-semibold text-kal-text">Want to suggest a feature?</p>
        <p className="text-sm text-kal-text-secondary">
          Send a message to{" "}
          <a href="mailto:support@kalnehi.com" className="text-kal-accent-dark hover:underline underline-offset-2">
            support@kalnehi.com
          </a>{" "}
          with the subject "Feature request". We read every one and implement the most-requested ones.
        </p>
      </div>
    </div>
  );
}

import Link from "next/link";

const ALL_FEATURES = [
  {
    emoji: "✅",
    title: "Today's Plan",
    tagline: "Most students lose the day before 10am. This stops that.",
    detail: "Live, tickable tasks. Edit mid-day when life happens. Every tick is real progress.",
  },
  {
    emoji: "📚",
    title: "Syllabus Tracker",
    tagline: "You've been studying. But do you know what you've actually covered?",
    detail: "Track every subject, chapter, and microtopic. Connects directly to your daily plan.",
  },
  {
    emoji: "🎯",
    title: "Execution Planner & Master Today",
    tagline: "Knowing what to study and actually doing it are two different things. This is the bridge.",
    detail: "Master Today keeps your one non-negotiable task front and centre until it's done.",
  },
  {
    emoji: "🗣️",
    title: "Dictate My Day + Self Type",
    tagline: "Talk or type. The plan gets in — your way, every time.",
    detail: "Dictate your plan out loud and the app parses it into tasks in 90 seconds. Prefer typing? Self Type puts you in full control.",
  },
  {
    emoji: "⏱️",
    title: "Focus Timer",
    tagline: "You think you studied for 4 hours. The timer knows the truth.",
    detail: "Timed blocks, real minutes per subject. Short breaks built in so you don't crash at 2pm.",
  },
  {
    emoji: "📈",
    title: "Progress Tracker",
    tagline: "Stop guessing how prepared you are. See it.",
    detail: "Prep health in one view — syllabus coverage, tasks done, days spent. Numbers don't lie.",
  },
  {
    emoji: "🏆",
    title: "Marks Engine & Predictions",
    tagline: "The chapters you skipped aren't hiding. Here's exactly what they're costing you.",
    detail: "Predicted score before the exam. Weightage data baked in for JEE, NEET, and Boards.",
  },
  {
    emoji: "🔄",
    title: "Revision reminders",
    tagline: "A dated queue beats a vague promise to \"revise later.\"",
    detail: "Due dates, priorities, optional syllabus links — reschedule anytime, push to your daily plan when ready.",
  },
  {
    emoji: "🔥",
    title: "Consistency Tracker & Heatmap",
    tagline: "One missed day is fine. Ten missed days with no record of it is how ranks slip.",
    detail: "A heatmap of every day you showed up. Green squares don't lie.",
  },
  {
    emoji: "💪",
    title: "Habit Maker",
    tagline: "The difference between a 99 percentiler and you isn't talent. It's what they do every day.",
    detail: "Build non-negotiables — sleep time, morning review, evening recap. Streaks make habits stick.",
  },
  {
    emoji: "📷",
    title: "Study Sessions",
    tagline: "The session you didn't log? It might as well not have happened.",
    detail: "Timed desk sessions with optional on-device verification. Nothing is uploaded.",
  },
  {
    emoji: "🧘",
    title: "Brain Yoga / Meditation",
    tagline: "You can't study for 8 hours straight. Nobody can. This makes 5 hours feel like 8.",
    detail: "5-minute guided resets between subjects. Track how often you recover.",
  },
  {
    emoji: "🤖",
    title: "Mastermind",
    tagline: "A tutor who knows your syllabus, your weak spots, and your plan.",
    detail: "Ask questions in context of your actual prep. Answers tied to your syllabus coverage.",
  },
  {
    emoji: "🎁",
    title: "AI Voice Dictation",
    tagline: "Your voice, your ideas — structured into tasks in seconds.",
    detail: "Talk out your day. Edit before committing. Free trial includes voice time.",
  },
  {
    emoji: "💛",
    title: "Personal Motivation Vault",
    tagline: "There will be a day when nothing works. This is what you built for exactly that day.",
    detail: "Save your own reasons, targets, quotes. On a bad day, open this — it's your voice, not a stranger's.",
  },
  {
    emoji: "🔔",
    title: "Push Notifications & Reminders",
    tagline: "You meant to revise Electrostatics on Wednesday. Wednesday came and went.",
    detail: "Reminders that fire when you need them. Automated nudges for habits you've committed to.",
  },
  {
    emoji: "❓",
    title: "Doubt Tracker",
    tagline: "Every doubt you left unresolved is a question you'll get wrong in the exam.",
    detail: "Capture the doubt mid-session, stay in flow. A logged doubt has a chance of getting solved.",
  },
  {
    emoji: "📝",
    title: "Daily Log",
    tagline: "A 2-minute note tonight is the reason you'll understand week 8 when it feels impossible.",
    detail: "Record what you did, what felt hard, what to carry forward. Pattern into decisions. Decisions into rank.",
  },
] as const;

export function AllFeaturesSection() {
  return (
    <section className="bg-kal-page py-24 lg:py-32" id="all-features">
      <div className="mx-auto max-w-7xl px-6 sm:px-8 lg:px-12">
        <div className="mb-14 flex flex-col items-start justify-between gap-6 sm:flex-row sm:items-end">
          <div>
            <h2
              className="mb-3 text-3xl font-normal leading-tight tracking-tight text-kal-text sm:text-4xl"
              style={{ fontFamily: "var(--font-display)" }}
            >
              All 18 features. One app.
            </h2>
            <p className="max-w-lg text-lg text-kal-text-secondary">
              Every feature built for one thing — helping you show up, stay sharp, and actually finish what you started.
            </p>
          </div>
          <Link
            href="/what-can-kalnehi-do"
            className="shrink-0 text-sm font-semibold text-kal-accent underline underline-offset-4 hover:opacity-70"
          >
            See full feature guide →
          </Link>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {ALL_FEATURES.map(({ emoji, title, tagline, detail }) => (
            <div
              key={title}
              className="flex flex-col gap-3 rounded-2xl border border-kal-border bg-kal-card p-5 backdrop-blur-sm transition hover:border-kal-accent/25 hover:shadow-[0_8px_24px_rgba(255,122,0,0.07)] dark:hover:shadow-[0_8px_24px_rgba(0,0,0,0.35)]"
            >
              <div className="flex items-start gap-3">
                <span
                  className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-kal-accent-soft text-lg"
                  aria-hidden
                >
                  {emoji}
                </span>
                <div className="min-w-0">
                  <p className="text-sm font-bold leading-snug text-kal-text">{title}</p>
                  <p className="mt-0.5 text-xs leading-snug text-kal-accent/80">{tagline}</p>
                </div>
              </div>
              <p className="border-t border-kal-border pt-3 text-xs leading-relaxed text-kal-text-secondary">
                {detail}
              </p>
            </div>
          ))}
        </div>

        <div className="mt-12 flex flex-col items-center gap-4 text-center">
          <p className="text-sm text-kal-muted">All 18 features included in Pro. One price. No tiers.</p>
          <Link
            href="/auth"
            className="inline-flex min-h-[48px] items-center justify-center rounded-full bg-kal-accent px-8 text-sm font-bold text-white shadow-[0_4px_16px_rgba(255,122,0,0.28)] transition hover:brightness-105"
          >
            Start free — 3 days on us
          </Link>
        </div>
      </div>
    </section>
  );
}

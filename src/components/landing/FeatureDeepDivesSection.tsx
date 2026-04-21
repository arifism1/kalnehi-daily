import type { ReactNode } from "react";

interface Feature {
  tag: string;
  headline: string;
  bullets: readonly string[];
  illustration: ReactNode;
}

const FEATURES: Feature[] = [
  {
    tag: "Daily Plan",
    headline: "Most students lose the day before 10am. This stops that.",
    bullets: [
      "Your tasks for today — live, tickable, honest. Not a schedule you pretend to follow.",
      "Edit or delete mid-day when life happens. The plan bends so you don't break.",
      "Every tick is real progress, not the feeling of progress.",
    ],
    illustration: <DailyPlanIllustration />,
  },
  {
    tag: "Syllabus Mastery Tracker",
    headline: "You've been studying. But do you know what you've actually covered? Most don't.",
    bullets: [
      "Track every subject, chapter, and microtopic — not just the ones that feel done.",
      "Most toppers know which 15% of the syllabus decides their rank. This shows you yours.",
      "Connects directly to your daily plan so what you study actually moves the needle.",
    ],
    illustration: <SyllabusMasteryIllustration />,
  },
  {
    tag: "Marks Engine & Predictions",
    headline: "The chapters you skipped aren't hiding. Here's exactly what they're costing you.",
    bullets: [
      "Enter your syllabus progress and see a predicted score — before the exam.",
      "Weightage data baked in so you know if skipping Thermodynamics is actually safe.",
      "Spend your next 30 days on what moves your rank, not what feels urgent.",
    ],
    illustration: <MarksEngineIllustration />,
  },
  {
    tag: "Revision Engine",
    headline: "Topics you studied 3 weeks ago are already fading. This catches them before the mock does.",
    bullets: [
      "Flags chapters that need revisiting based on how long ago you covered them.",
      "One bad mock score from forgotten content is demoralising. This makes it avoidable.",
      "Revision that's planned is revision that actually happens.",
    ],
    illustration: <RevisionEngineIllustration />,
  },
  {
    tag: "Focus Timer",
    headline: "You think you studied for 4 hours. The timer knows the truth.",
    bullets: [
      "Run timed blocks and see real minutes on real subjects — not time in the room.",
      "Short breaks built in so you don't crash at 2pm and lose the evening.",
      "After a week you know exactly how long you actually give each subject.",
    ],
    illustration: <FocusTimerIllustration />,
  },
  {
    tag: "PrepBrain AI",
    headline: "A tutor who knows your syllabus, your weak spots, and your plan — not just the textbook.",
    bullets: [
      "Ask questions in the context of what you're actually preparing for, not generically.",
      "Answers connected to your syllabus coverage, so advice is specific, not generic.",
      "Pro includes PrepBrain AI and monthly voice dictation (limits vary by welcome, paid trial, or monthly billing).",
    ],
    illustration: <PrepBrainIllustration />,
  },
];

export function FeatureDeepDivesSection() {
  return (
    <section className="bg-[#F7F4EE] py-24 lg:py-32" id="features">
      <div className="mx-auto max-w-7xl px-6 sm:px-8 lg:px-12">
        <div className="mb-16">
          <h2
            className="mb-4 text-3xl font-normal leading-tight tracking-tight text-kal-text sm:text-4xl lg:text-[2.75rem]"
            style={{ fontFamily: "var(--font-display)" }}
          >
            Built around how toppers actually study.
          </h2>
          <p className="max-w-xl text-lg text-kal-text-secondary">
            Six tools that work together. Each one does one thing extremely well.
          </p>
        </div>

        <div className="flex flex-col gap-24 lg:gap-32">
          {FEATURES.map(({ tag, headline, bullets, illustration }, i) => (
            <div
              key={tag}
              className={`flex flex-col gap-12 lg:flex-row lg:items-center lg:gap-16 ${
                i % 2 === 1 ? "lg:flex-row-reverse" : ""
              }`}
            >
              {/* Text */}
              <div className="flex flex-1 flex-col justify-center">
                <p className="mb-3 text-[10px] font-bold uppercase tracking-widest text-kal-accent">
                  {tag}
                </p>
                <h3
                  className="mb-5 text-2xl font-normal leading-tight text-kal-text sm:text-3xl"
                  style={{ fontFamily: "var(--font-display)" }}
                >
                  {headline}
                </h3>
                <ul className="space-y-3">
                  {bullets.map((b) => (
                    <li key={b} className="flex items-start gap-3">
                      <span
                        className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-kal-accent"
                        aria-hidden
                      />
                      <span className="text-base leading-relaxed text-kal-text-secondary">{b}</span>
                    </li>
                  ))}
                </ul>
              </div>

              {/* Illustration */}
              <div className="flex flex-1 items-center justify-center">
                <div className="w-full max-w-md overflow-hidden rounded-2xl border border-[rgba(210,192,168,0.4)] bg-[#FAF7F2] shadow-[0_20px_60px_-12px_rgba(14,21,37,0.10)]">
                  {illustration}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ─── DailyPlanIllustration ─────────────────────────────────────────────── */
function DailyPlanIllustration() {
  const tasks = [
    { label: "Thermodynamics Ch.12", sub: "Physics",   done: true,  active: false },
    { label: "Electrochemistry",      sub: "Chemistry", done: false, active: true  },
    { label: "Probability",           sub: "Maths",     done: false, active: false },
  ];

  return (
    <div className="p-6 select-none">
      <p className="mb-4 text-[9px] font-bold uppercase tracking-[0.14em] text-kal-muted">Today&apos;s Plan</p>
      <div className="space-y-2">
        {tasks.map(({ label, sub, done, active }) => (
          <div
            key={label}
            className={`flex items-center gap-3 rounded-xl px-4 py-3 ${
              done
                ? "border border-[rgba(134,239,172,0.3)] bg-[rgba(240,253,244,0.6)]"
                : active
                  ? "border-[1.5px] border-[rgba(255,122,0,0.35)] bg-[rgba(255,243,232,0.7)]"
                  : "border border-[rgba(210,192,168,0.3)] bg-white/50"
            }`}
          >
            {/* Status circle */}
            <div
              className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full ${
                done
                  ? "bg-emerald-400"
                  : active
                    ? "bg-kal-accent"
                    : "border-[1.5px] border-[rgba(180,162,138,0.5)]"
              }`}
            >
              {done && (
                <svg width="10" height="8" viewBox="0 0 10 8" fill="none" aria-hidden>
                  <path d="M1 4l3 3 5-6" stroke="white" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              )}
              {active && (
                <svg width="8" height="8" viewBox="0 0 8 8" fill="none" aria-hidden>
                  <polygon points="2,1 7,4 2,7" fill="white" />
                </svg>
              )}
            </div>
            <span
              className={`flex-1 text-sm font-medium leading-none ${
                done ? "text-kal-muted line-through decoration-[rgba(180,162,138,0.7)]" : "text-kal-text"
              }`}
            >
              {label}
            </span>
            <span
              className={`shrink-0 text-[10px] font-semibold ${
                done ? "text-kal-muted" : active ? "text-kal-accent" : "text-kal-muted"
              }`}
            >
              {sub}
            </span>
          </div>
        ))}
      </div>

      {/* Progress bar */}
      <div className="mt-5">
        <div className="mb-1.5 flex items-center justify-between">
          <span className="text-[10px] text-kal-muted">1 of 3 done</span>
          <span className="text-[10px] font-bold text-kal-accent">33%</span>
        </div>
        <div className="h-1.5 overflow-hidden rounded-full bg-[rgba(210,192,168,0.3)]">
          <div className="h-full w-1/3 rounded-full bg-kal-accent" />
        </div>
      </div>
    </div>
  );
}

/* ─── SyllabusMasteryIllustration ───────────────────────────────────────── */
function SyllabusMasteryIllustration() {
  const rows = [
    { name: "Physics",     pct: 61, color: "#4F86C6" },
    { name: "Chemistry",   pct: 44, color: "#5BA55B" },
    { name: "Mathematics", pct: 78, color: "#C97A2A" },
  ];

  return (
    <div className="p-6 select-none">
      <p className="mb-5 text-[9px] font-bold uppercase tracking-[0.14em] text-kal-muted">Syllabus Mastery</p>
      <div className="space-y-5">
        {rows.map(({ name, pct, color }) => (
          <div key={name}>
            <div className="mb-2 flex items-baseline justify-between">
              <span className="text-sm font-bold text-kal-text">{name}</span>
              <span className="font-serif text-base font-bold" style={{ color }}>{pct}%</span>
            </div>
            <div className="h-2 overflow-hidden rounded-full bg-[rgba(210,192,168,0.2)]">
              <div
                className="h-full rounded-full transition-all"
                style={{ width: `${pct}%`, backgroundColor: color, opacity: 0.8 }}
              />
            </div>
          </div>
        ))}
      </div>

      {/* Insight badge */}
      <div className="mt-6 inline-flex items-center gap-2 rounded-lg border border-[rgba(255,122,0,0.2)] bg-[rgba(255,243,232,0.8)] px-3 py-2">
        <div className="h-1.5 w-1.5 rounded-full bg-kal-accent" aria-hidden />
        <span className="text-[10px] font-semibold text-[#B35200]">15% of topics = 60% of marks</span>
      </div>
    </div>
  );
}

/* ─── MarksEngineIllustration ───────────────────────────────────────────── */
function MarksEngineIllustration() {
  const subjects = [
    { name: "Physics",   score: 180, max: 240, color: "#4F86C6" },
    { name: "Chemistry", score: 170, max: 240, color: "#5BA55B" },
    { name: "Maths",     score: 197, max: 240, color: "#C97A2A" },
  ];

  return (
    <div className="p-6 select-none">
      <p className="mb-4 text-[9px] font-bold uppercase tracking-[0.14em] text-kal-muted">Marks Engine</p>

      {/* Big predicted score */}
      <div className="mb-5 text-center">
        <p className="font-serif text-5xl font-bold text-kal-accent">547</p>
        <p className="mt-1 text-[11px] text-kal-muted">predicted out of 720</p>
      </div>

      <div className="mb-5 h-px bg-[rgba(210,192,168,0.3)]" />

      {/* Subject breakdown */}
      <div className="space-y-3">
        {subjects.map(({ name, score, max, color }) => (
          <div key={name} className="flex items-center gap-3">
            <span className="w-20 shrink-0 text-[11px] font-semibold text-[#4A3F33]">{name}</span>
            <div className="flex-1 overflow-hidden rounded-full bg-[rgba(210,192,168,0.2)]" style={{ height: 8 }}>
              <div
                className="h-full rounded-full"
                style={{ width: `${(score / max) * 100}%`, backgroundColor: color, opacity: 0.8 }}
              />
            </div>
            <span className="w-8 shrink-0 text-right font-serif text-[11px] font-bold" style={{ color }}>
              {score}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ─── RevisionEngineIllustration ────────────────────────────────────────── */
function RevisionEngineIllustration() {
  const topics = [
    { name: "Optics",           days: 21, urgent: true  },
    { name: "Electrochemistry", days: 12, urgent: true  },
    { name: "Probability",      days: 7,  urgent: false },
  ];

  return (
    <div className="p-6 select-none">
      <div className="mb-1 flex items-center justify-between">
        <p className="text-[9px] font-bold uppercase tracking-[0.14em] text-kal-muted">Revision Engine</p>
      </div>
      <p className="mb-4 text-[11px] text-kal-muted">Topics fading — needs revisiting</p>

      <div className="space-y-2.5">
        {topics.map(({ name, days, urgent }) => (
          <div
            key={name}
            className={`flex items-center gap-3 rounded-xl px-4 py-3 ${
              urgent
                ? "border border-[rgba(252,165,165,0.45)] bg-[rgba(254,242,242,0.7)]"
                : "border border-[rgba(210,192,168,0.3)] bg-white/50"
            }`}
          >
            <div
              className="h-2.5 w-2.5 shrink-0 rounded-full"
              style={{ backgroundColor: urgent ? "#EF4444" : "rgba(180,162,138,0.5)" }}
              aria-hidden
            />
            <span className={`flex-1 text-sm font-medium ${urgent ? "font-bold text-kal-text" : "text-[#4A3F33]"}`}>
              {name}
            </span>
            <span
              className={`shrink-0 rounded-lg px-2.5 py-1 text-[10px] font-semibold ${
                urgent
                  ? "bg-[#FEE2E2] text-[#B91C1C]"
                  : "bg-[rgba(210,192,168,0.2)] text-[#7A6B5A]"
              }`}
            >
              {days} days ago
            </span>
          </div>
        ))}
      </div>

      <p className="mt-4 text-[10px] text-kal-muted">Based on last studied date</p>
    </div>
  );
}

/* ─── FocusTimerIllustration ─────────────────────────────────────────────── */
function FocusTimerIllustration() {
  const subjects = [
    { name: "Physics",   mins: 74,  color: "#4F86C6" },
    { name: "Chemistry", mins: 45,  color: "#5BA55B" },
    { name: "Maths",     mins: 58,  color: "#C97A2A" },
  ];
  const maxMins = 90;
  const r = 44;
  const circ = 2 * Math.PI * r;
  const progress = 0.62;

  return (
    <div className="bg-[#0E1525] p-6 select-none">
      <p className="mb-4 text-center text-[9px] font-bold uppercase tracking-[0.14em] text-white/30">
        Focus Timer
      </p>

      {/* Ring timer */}
      <div className="mb-5 flex flex-col items-center">
        <div className="relative">
          <svg width="120" height="120" viewBox="0 0 120 120" aria-hidden>
            <circle cx="60" cy="60" r={r} fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="7" />
            <circle
              cx="60" cy="60" r={r}
              fill="none" stroke="#FF7A00" strokeWidth="7" strokeLinecap="round"
              strokeDasharray={`${circ * progress} ${circ * (1 - progress)}`}
              transform="rotate(-90 60 60)"
              opacity="0.9"
            />
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <p className="font-mono text-2xl font-bold text-white">27:14</p>
            <p className="text-[9px] text-white/40">remaining</p>
          </div>
        </div>
        <p className="mt-1.5 text-[11px] font-semibold text-[rgba(255,122,0,0.85)]">Electrochemistry</p>
      </div>

      <div className="mb-4 h-px bg-white/[0.07]" />

      {/* Subject bars */}
      <p className="mb-3 text-[9px] text-white/30">Today&apos;s study time</p>
      <div className="space-y-2.5">
        {subjects.map(({ name, mins, color }) => (
          <div key={name} className="flex items-center gap-3">
            <span className="w-16 shrink-0 text-[10px] font-semibold text-white/60">{name}</span>
            <div className="flex-1 overflow-hidden rounded-full bg-white/[0.07]" style={{ height: 7 }}>
              <div
                className="h-full rounded-full"
                style={{ width: `${(mins / maxMins) * 100}%`, backgroundColor: color, opacity: 0.75 }}
              />
            </div>
            <span className="w-8 shrink-0 text-right font-serif text-[10px] font-bold" style={{ color }}>
              {mins}m
            </span>
          </div>
        ))}
      </div>

      <p className="mt-4 text-center text-[9px] text-white/20">Real minutes. Real subjects.</p>
    </div>
  );
}

/* ─── PrepBrainIllustration ─────────────────────────────────────────────── */
function PrepBrainIllustration() {
  return (
    <div className="p-6 select-none">
      <p className="mb-4 text-[9px] font-bold uppercase tracking-[0.14em] text-kal-muted">PrepBrain AI</p>

      {/* User message */}
      <div className="mb-3 flex items-start justify-end gap-2">
        <div className="max-w-[80%] rounded-2xl rounded-br-sm border border-[rgba(255,122,0,0.22)] bg-[rgba(255,243,232,0.85)] px-4 py-3">
          <p className="text-[11.5px] leading-relaxed text-kal-text">
            Based on my current syllabus and past data — if I want to score{" "}
            <span className="font-bold text-kal-accent">12 more marks</span>, what specifically should I study?
          </p>
        </div>
        <div className="mt-1 flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-[rgba(255,122,0,0.3)] bg-[rgba(255,122,0,0.1)] text-[9px] font-bold text-kal-accent">
          You
        </div>
      </div>

      {/* AI message */}
      <div className="mb-4 flex items-start gap-2">
        <div className="mt-1 flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-[rgba(99,102,241,0.3)] bg-[rgba(99,102,241,0.1)] text-[9px] font-bold text-indigo-500">
          AI
        </div>
        <div className="rounded-2xl rounded-bl-sm border border-[rgba(99,102,241,0.2)] bg-[rgba(238,242,255,0.85)] px-4 py-3">
          <p className="mb-2 text-[11px] font-semibold text-indigo-700">Focus these 3 areas first:</p>
          <div className="space-y-1.5">
            {[
              { topic: "Optics — Wave theory", marks: "+5 marks", color: "#4338CA" },
              { topic: "Electrochemistry — Nernst Eq.", marks: "+4 marks", color: "#4338CA" },
              { topic: "Probability — Bayes theorem", marks: "+3 marks", color: "#4338CA" },
            ].map(({ topic, marks }) => (
              <div key={topic} className="flex items-center justify-between gap-3">
                <span className="text-[10.5px] text-kal-text">{topic}</span>
                <span className="shrink-0 rounded-md bg-[rgba(99,102,241,0.12)] px-2 py-0.5 text-[9px] font-bold text-indigo-600">
                  {marks}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Syllabus-aware badge */}
      <div className="flex items-center gap-2 rounded-lg border border-[rgba(99,102,241,0.18)] bg-[rgba(238,242,255,0.7)] px-3 py-2">
        <div className="h-1.5 w-1.5 shrink-0 rounded-full bg-indigo-400" aria-hidden />
        <span className="text-[10px] font-semibold text-indigo-600">Based on your syllabus &amp; revision data</span>
      </div>
    </div>
  );
}

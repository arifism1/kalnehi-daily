const BEATS = [
  {
    num: "01",
    label: "Plan",
    headline: "Speak your day, or type it. Done in 90 seconds.",
    body: "Open the app. Talk out your plan and AI structures it into tasks. Or use Self Type if you prefer keys over voice. Either way — your day is set before you sit down to study.",
    mockup: <PlanMockup />,
  },
  {
    num: "02",
    label: "Execute",
    headline: "Focus timer runs. Tasks tick off. Doubts get logged.",
    body: "Start a timed block for any task — real minutes on real topics. Hit a doubt, log it, keep going. Whatever slips rolls into missed tasks or backlog instead of vanishing. When the block ends, mark honest progress.",
    mockup: <ExecuteMockup />,
  },
  {
    num: "03",
    label: "Recover",
    headline: "Brain Yoga, debrief, recap. Close the loop.",
    body: "A short guided reset keeps long study days sustainable. Daily Debrief asks three honest questions (speak or type). Today's Recap shows hours and streaks in Wrapped-style summaries — plus your saved plans stay searchable months later.",
    mockup: <RecoverMockup />,
  },
] as const;

export function DailyRitualSection() {
  return (
    <section className="bg-kal-page-end py-24 lg:py-32">
      <div className="mx-auto max-w-7xl px-6 sm:px-8 lg:px-12">
        <div className="mb-16 max-w-xl">
          <h2
            className="mb-4 text-3xl font-normal leading-tight tracking-tight text-kal-text sm:text-4xl lg:text-[2.75rem]"
            style={{ fontFamily: "var(--font-display)" }}
          >
            Three things, every day.
          </h2>
          <p className="text-lg text-kal-text-secondary">
            Kalnehi is built around a loop that takes 5 minutes to enter and lasts all day.
          </p>
        </div>

        <div className="flex flex-col gap-20 lg:gap-28">
          {BEATS.map(({ num, label, headline, body, mockup }, i) => (
            <div
              key={num}
              className={`flex flex-col gap-10 lg:flex-row lg:items-center lg:gap-16 ${
                i % 2 === 1 ? "lg:flex-row-reverse" : ""
              }`}
            >
              {/* Text */}
              <div className="flex flex-1 flex-col justify-center">
                <div className="mb-4 flex items-baseline gap-3">
                  <span
                    className="text-6xl font-normal leading-none text-kal-accent/20 lg:text-8xl"
                    style={{ fontFamily: "var(--font-display)" }}
                    aria-hidden
                  >
                    {num}
                  </span>
                  <span className="text-[10px] font-bold uppercase tracking-widest text-kal-accent">
                    {label}
                  </span>
                </div>
                <h3
                  className="mb-4 text-2xl font-normal leading-tight text-kal-text sm:text-3xl"
                  style={{ fontFamily: "var(--font-display)" }}
                >
                  {headline}
                </h3>
                <p className="max-w-md text-base leading-relaxed text-kal-text-secondary">{body}</p>
              </div>

              {/* Mockup */}
              <div className="flex flex-1 items-center justify-center lg:justify-start">
                <div className="w-full max-w-sm overflow-hidden rounded-2xl border border-kal-border bg-kal-card shadow-[0_16px_48px_-8px_rgba(14,21,37,0.12)] backdrop-blur-sm dark:shadow-[0_16px_48px_-8px_rgba(0,0,0,0.4)]">
                  {mockup}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function PlanMockup() {
  return (
    <div className="p-5">
      <p className="mb-1 text-[10px] text-kal-muted">Good morning,</p>
      <p className="mb-3 text-lg font-bold text-kal-text" style={{ fontFamily: "var(--font-display)" }}>
        How do you want to plan today?
      </p>

      {/* Voice option */}
      <button
        type="button"
        className="mb-2 flex w-full items-center gap-3 rounded-xl border-2 border-kal-accent/40 bg-kal-accent-soft/50 px-4 py-3 text-left"
        aria-label="Dictate My Day"
        tabIndex={-1}
      >
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-kal-accent text-white text-sm" aria-hidden>
          🎙
        </div>
        <div>
          <p className="text-sm font-bold text-kal-text">Dictate My Day</p>
          <p className="text-[10px] text-kal-muted">Speak your plan — AI parses it to tasks</p>
        </div>
        <span className="ml-auto rounded-full bg-kal-accent/15 px-2 py-0.5 text-[9px] font-bold text-kal-accent">Smart Plan</span>
      </button>

      {/* Type option */}
      <button
        type="button"
        className="mb-4 flex w-full items-center gap-3 rounded-xl border border-kal-border bg-kal-card-muted px-4 py-3 text-left backdrop-blur-sm"
        aria-label="Self Type"
        tabIndex={-1}
      >
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-kal-accent-soft text-sm" aria-hidden>
          ✏️
        </div>
        <div>
          <p className="text-sm font-semibold text-kal-text">Self Type</p>
          <p className="text-[10px] text-kal-muted">Type your tasks directly</p>
        </div>
      </button>

      {/* Voice waveform hint */}
      <div className="flex items-center gap-1.5 rounded-xl border border-kal-border bg-[#0E1525] px-4 py-3">
        <div className="flex items-end gap-0.5 h-5" aria-hidden>
          {[3, 7, 5, 9, 6, 11, 8, 5, 10, 7, 4].map((h, i) => (
            <div
              key={i}
              className="w-1 rounded-sm bg-kal-accent"
              style={{ height: `${h}px`, opacity: 0.6 + (i % 3) * 0.15 }}
            />
          ))}
        </div>
        <p className="ml-2 text-[10px] font-medium text-white/60">Listening...</p>
        <div className="ml-auto h-2 w-2 rounded-full bg-kal-accent animate-pulse" aria-hidden />
      </div>
    </div>
  );
}

function ExecuteMockup() {
  return (
    <div className="bg-[#0E1525] p-5">
      <p className="mb-1 text-[10px] font-medium uppercase tracking-widest text-white/40">
        Focus Session
      </p>
      <p className="mb-4 text-base font-semibold text-white">Electrochemistry — Nernst Equation</p>

      {/* Timer */}
      <div className="mb-4 flex flex-col items-center">
        <div className="relative flex h-24 w-24 items-center justify-center">
          <svg className="absolute h-24 w-24 -rotate-90" viewBox="0 0 96 96" aria-hidden>
            <circle cx="48" cy="48" r="42" fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth="5" />
            <circle
              cx="48" cy="48" r="42" fill="none" stroke="var(--kal-accent)" strokeWidth="5"
              strokeDasharray={`${2 * Math.PI * 42}`}
              strokeDashoffset={`${2 * Math.PI * 42 * 0.45}`}
              strokeLinecap="round"
            />
          </svg>
          <div className="text-center">
            <p className="text-2xl font-bold tabular-nums text-white" style={{ fontFamily: "monospace" }}>
              27:14
            </p>
            <p className="text-[9px] text-white/40">remaining</p>
          </div>
        </div>
      </div>

      {/* Doubt log */}
      <div className="mb-3 flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-3 py-2.5">
        <span className="text-sm" aria-hidden>❓</span>
        <div className="flex-1 min-w-0">
          <p className="text-[10px] text-white/50">Quick doubt log</p>
          <p className="text-[11px] font-medium text-white/80 truncate">Why does EMF change with concentration?</p>
        </div>
        <span className="shrink-0 rounded-md bg-white/10 px-2 py-0.5 text-[9px] text-white/50">Saved</span>
      </div>

      <div className="grid grid-cols-2 gap-2">
        <button type="button" className="flex min-h-[38px] items-center justify-center rounded-xl border border-white/15 text-xs font-semibold text-white/70" tabIndex={-1}>
          Pause
        </button>
        <button type="button" className="flex min-h-[38px] items-center justify-center rounded-xl bg-kal-accent text-xs font-bold text-white" tabIndex={-1}>
          Done
        </button>
      </div>
    </div>
  );
}

function RecoverMockup() {
  const days = ["M", "T", "W", "T", "F", "S", "S"];
  const fills = [0.9, 0.85, 0.4, 1, 0.95, 0.7, 0.9];

  return (
    <div className="p-5">
      {/* Brain Yoga card */}
      <div className="mb-3 rounded-xl border border-[rgba(6,182,212,0.2)] bg-[rgba(6,182,212,0.05)] p-3">
        <div className="mb-2 flex items-center justify-between">
          <p className="text-xs font-bold text-kal-text">Brain Yoga</p>
          <span className="text-[10px] font-medium text-kal-muted">5 min session</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex items-center justify-center h-8 w-8 rounded-full border border-[rgba(6,182,212,0.3)] bg-[rgba(6,182,212,0.1)] text-sm" aria-hidden>
            🧘
          </div>
          <div className="flex-1">
            <p className="text-[11px] font-semibold text-kal-text">Inhale · Hold · Exhale</p>
            <p className="text-[10px] text-kal-muted">Box breathing · Calm + focus reset</p>
          </div>
        </div>
      </div>

      {/* Consistency heatmap */}
      <div className="mb-3">
        <p className="mb-2 text-[9px] font-bold uppercase tracking-wider text-kal-muted">
          This week
        </p>
        <div className="flex gap-1.5">
          {days.map((d, i) => (
            <div key={d + i} className="flex flex-1 flex-col items-center gap-1">
              <div
                className="w-full rounded-md"
                style={{
                  height: "28px",
                  backgroundColor: `rgba(255,122,0,${fills[i] * 0.75})`,
                  border: i === 6 ? "1.5px solid rgba(255,122,0,0.6)" : "none",
                }}
                aria-hidden
              />
              <span className="text-[8px] font-semibold text-kal-muted">{d}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Daily debrief + recap */}
      <div className="space-y-2">
        <div className="rounded-xl border border-kal-border bg-kal-card-muted p-3 backdrop-blur-sm">
          <div className="mb-2 flex items-center justify-between">
            <p className="text-[10px] font-bold text-kal-text">Daily Debrief</p>
            <span className="text-[10px] text-kal-muted">Speak or type</span>
          </div>
          <ul className="space-y-1 text-[10px] leading-snug text-kal-muted">
            <li>· What did you finish today?</li>
            <li>· What did you skip?</li>
            <li>· Tomorrow&apos;s one priority?</li>
          </ul>
        </div>
        <div className="flex items-center justify-between rounded-xl border border-kal-accent/20 bg-kal-accent-soft/40 px-3 py-2.5">
          <p className="text-[10px] font-bold text-kal-text">Today&apos;s Recap</p>
          <span className="text-[10px] font-semibold text-kal-accent">4h 12m · 14-day streak</span>
        </div>
      </div>
    </div>
  );
}

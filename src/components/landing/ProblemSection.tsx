const PROBLEMS = [
  {
    icon: (
      <svg viewBox="0 0 48 48" fill="none" className="h-10 w-10" aria-hidden>
        <path
          d="M8 24 Q14 16 20 24 Q26 32 32 24 Q38 16 40 24"
          stroke="#8A2B1F"
          strokeWidth="2"
          strokeLinecap="round"
          fill="none"
        />
        <circle cx="40" cy="24" r="4" fill="none" stroke="#8A2B1F" strokeWidth="2" />
        <path d="M38 22 L42 24 L38 26" stroke="#8A2B1F" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
        <circle cx="40" cy="24" r="1.5" fill="#8A2B1F" />
      </svg>
    ),
    headline: "You don't know if you're on track.",
    body: "Notion templates and physical planners don't know your syllabus. You mark topics done, but you can't see whether that pace clears Physics before November.",
  },
  {
    icon: (
      <svg viewBox="0 0 48 48" fill="none" className="h-10 w-10" aria-hidden>
        <rect x="8" y="28" width="6" height="12" rx="1" fill="rgba(138,43,31,0.2)" stroke="#8A2B1F" strokeWidth="1.5" />
        <rect x="18" y="20" width="6" height="20" rx="1" fill="rgba(138,43,31,0.2)" stroke="#8A2B1F" strokeWidth="1.5" />
        <rect x="28" y="12" width="6" height="28" rx="1" fill="rgba(138,43,31,0.2)" stroke="#8A2B1F" strokeWidth="1.5" />
        {/* Collapsing bar */}
        <g opacity="0.7">
          <rect x="36" y="8" width="6" height="32" rx="1" fill="rgba(138,43,31,0.15)" stroke="#8A2B1F" strokeWidth="1.5" strokeDasharray="3 2" />
          <path d="M36 38 Q39 40 42 40" stroke="#8A2B1F" strokeWidth="1.5" strokeLinecap="round" />
        </g>
      </svg>
    ),
    headline: "Mock scores never meet your real plan.",
    body: "Even when you log a mock, marks sit apart from today's tasks, syllabus gaps, and revision. Without one system, you repeat the same weak chapters while the calendar keeps moving.",
  },
  {
    icon: (
      <svg viewBox="0 0 48 48" fill="none" className="h-10 w-10" aria-hidden>
        {/* Candle */}
        <rect x="20" y="26" width="8" height="16" rx="1.5" fill="rgba(138,43,31,0.15)" stroke="#8A2B1F" strokeWidth="1.5" />
        {/* Wick */}
        <path d="M24 26 L24 20" stroke="#8A2B1F" strokeWidth="1.5" strokeLinecap="round" />
        {/* Flame — fading */}
        <path
          d="M24 20 C22 17 20 14 24 12 C28 14 26 17 24 20Z"
          fill="rgba(255,122,0,0.3)"
          stroke="rgba(255,122,0,0.5)"
          strokeWidth="1"
        />
        {/* Smoke wisps */}
        <path d="M22 11 Q20 8 22 6" stroke="#8A2B1F" strokeWidth="1" strokeLinecap="round" opacity="0.4" />
        <path d="M26 10 Q28 7 26 5" stroke="#8A2B1F" strokeWidth="1" strokeLinecap="round" opacity="0.3" />
      </svg>
    ),
    headline: "Consistency dies silently.",
    body: "Three missed days become a week. By month two, the streak is gone and so is the plan — with no system to bring you back on track, rebuilding feels impossible.",
  },
] as const;

export function ProblemSection() {
  return (
    <section className="bg-kal-page py-24 lg:py-32">
      <div className="mx-auto max-w-7xl px-6 sm:px-8 lg:px-12">
        {/* Header */}
        <div className="mb-14 max-w-2xl">
          <h2
            className="mb-4 text-3xl font-normal leading-tight tracking-tight text-kal-text sm:text-4xl lg:text-[2.75rem]"
            style={{ fontFamily: "var(--font-display)" }}
          >
            Generic planners were not built for this.
          </h2>
          <p className="text-lg text-kal-text-secondary">
            Every Indian aspirant has tried Notion, WhatsApp groups, and colour-coded spreadsheets.
            They all fail for the same reasons.
          </p>
        </div>

        {/* Cards */}
        <div className="grid gap-6 md:grid-cols-3">
          {PROBLEMS.map(({ icon, headline, body }) => (
            <div
              key={headline}
              className="group rounded-2xl border border-kal-border bg-kal-card p-7 shadow-[0_2px_8px_rgba(100,75,40,0.05)] backdrop-blur-sm transition hover:shadow-[0_8px_24px_rgba(100,75,40,0.08)] dark:hover:shadow-[0_8px_24px_rgba(0,0,0,0.35)]"
            >
              <div className="mb-5 flex h-14 w-14 items-center justify-center rounded-2xl border border-kal-border bg-kal-card-muted">
                {icon}
              </div>
              <h3 className="mb-3 text-base font-bold leading-snug text-kal-text">
                {headline}
              </h3>
              <p className="text-sm leading-relaxed text-kal-text-secondary">{body}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

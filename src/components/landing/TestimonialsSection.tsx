const WALKTHROUGH = [
  {
    time: "6:58 AM",
    icon: "🎙",
    title: "Dictate My Day",
    action: "Speak your plan out loud. Kalnehi parses it into tasks.",
    detail: "\"Study Thermo chapter 12, revise Optics, do 20 Maths questions\" → 3 tasks, scheduled.",
  },
  {
    time: "8:30 AM",
    icon: "⏱",
    title: "Focus Timer",
    action: "Pick a task. Start the timer. It tracks real minutes.",
    detail: "Thermodynamics — 45 min block. Task checked. Doubt logged mid-session.",
  },
  {
    time: "11:00 AM",
    icon: "📚",
    title: "Syllabus Tracker",
    action: "Mark chapters as done. Coverage updates automatically.",
    detail: "Physics 62% → 65%. Marks Engine recalculates: predicted 441 → 448.",
  },
  {
    time: "2:00 PM",
    icon: "🔁",
    title: "Revision Engine",
    action: "Flags what's fading. Adds it to tomorrow's plan.",
    detail: "Optics: last studied 18 days ago. Added to revision queue.",
  },
  {
    time: "6:00 PM",
    icon: "🧘",
    title: "Brain Yoga",
    action: "5-minute guided breathing reset before the evening session.",
    detail: "Box breath: inhale 4s · hold 4s · exhale 6s. Streak: 6 days.",
  },
  {
    time: "9:30 PM",
    icon: "📓",
    title: "Daily Log",
    action: "Two minutes. What clicked, what didn't. That's it.",
    detail: "\"Electrochemistry is making sense now. Need to revisit mole concept.\"",
  },
] as const;

export function TestimonialsSection() {
  return (
    <section className="bg-[#F7F4EE] py-24 lg:py-32">
      <div className="mx-auto max-w-7xl px-6 sm:px-8 lg:px-12">
        <div className="mb-14 max-w-xl">
          <h2
            className="mb-4 text-3xl font-normal leading-tight tracking-tight text-kal-text sm:text-4xl lg:text-[2.75rem]"
            style={{ fontFamily: "var(--font-display)" }}
          >
            What a real study day looks like.
          </h2>
          <p className="text-lg text-kal-text-secondary">
            Every feature connected. Every action tracked. One loop, every day.
          </p>
        </div>

        <div className="relative">
          {/* Vertical spine */}
          <div
            className="absolute left-[19px] top-4 hidden h-[calc(100%-2rem)] w-px bg-gradient-to-b from-kal-accent/30 via-kal-border to-transparent sm:block"
            aria-hidden
          />

          <div className="space-y-6">
            {WALKTHROUGH.map(({ time, icon, title, action, detail }) => (
              <div key={title} className="flex gap-5">
                {/* Dot */}
                <div className="relative flex flex-col items-center" aria-hidden>
                  <div className="z-10 flex h-10 w-10 shrink-0 items-center justify-center rounded-full border-2 border-kal-accent/30 bg-[#F7F4EE] text-base shadow-[0_0_0_4px_rgba(255,122,0,0.06)]">
                    {icon}
                  </div>
                </div>

                {/* Card */}
                <div className="flex-1 overflow-hidden rounded-2xl border border-kal-border bg-white/70 p-5 shadow-[0_2px_12px_rgba(100,75,40,0.05)]">
                  <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
                    <span className="text-[10px] font-bold uppercase tracking-widest text-kal-accent">
                      {title}
                    </span>
                    <span className="text-[10px] font-mono text-kal-muted">{time}</span>
                  </div>
                  <p className="mb-1.5 text-sm font-semibold text-kal-text">{action}</p>
                  <p className="text-sm italic leading-relaxed text-kal-muted">{detail}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        <p className="mt-8 text-center text-xs text-kal-muted">
          This is the loop. Show up for it once and it gets easier every day after.
        </p>
      </div>
    </section>
  );
}

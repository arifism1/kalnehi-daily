const TIMELINE = [
  {
    time: "06:00",
    feature: "Reality Snapshot",
    caption: "Open the app. See exactly where you stand.",
    detail: "Predicted score, syllabus coverage, and today's streak — all before you've touched a book. No guessing, no anxiety spiral.",
    icon: "📊",
    accent: false,
  },
  {
    time: "06:10",
    feature: "Dictate My Day",
    caption: "Speak your plan. Done in 90 seconds.",
    detail: "\"Physics Optics, then Electro, maybe Probability in the evening.\" Kalnehi parses it into a real task list. Breakfast first.",
    icon: "🎙",
    accent: true,
  },
  {
    time: "08:00",
    feature: "Focus Timer",
    caption: "First block starts. 45 minutes, no interruptions.",
    detail: "Optics — Wave theory. Timer runs real minutes. The app tracks actual study time, not time the phone was open.",
    icon: "⏱",
    accent: false,
  },
  {
    time: "09:30",
    feature: "Doubt Tracker",
    caption: "A concept doesn't click. Log it, keep going.",
    detail: "Quick tap — \"Why does refraction index change with medium?\" Saved. You stay in flow. The doubt waits for you.",
    icon: "❓",
    accent: false,
  },
  {
    time: "11:30",
    feature: "Mastermind",
    caption: "Ask Mastermind about that doubt. Get a precise answer.",
    detail: "\"Based on where I am in Physics — explain this doubt in context.\" Not a Google result. An answer that knows your syllabus.",
    icon: "🧠",
    accent: true,
  },
  {
    time: "14:00",
    feature: "Syllabus Tracker",
    caption: "Mark two chapters done. Score recalculates live.",
    detail: "Optics: complete. Electrochemistry: 80%. Marks Engine instantly updates your predicted score. You see the number move.",
    icon: "📚",
    accent: false,
  },
  {
    time: "16:30",
    feature: "Revision reminders",
    caption: "Probability due today — you set the date last week.",
    detail: "Open the list, do a short recall pass, mark done or slide the next due date. The queue holds you accountable without guessing what to open.",
    icon: "🔁",
    accent: false,
  },
  {
    time: "18:00",
    feature: "Marks Engine",
    caption: "Check your predicted score. See what's holding it back.",
    detail: "547 out of 720. Thermodynamics alone would add 14 more. Now you know exactly what tomorrow's first block should be.",
    icon: "📈",
    accent: true,
  },
  {
    time: "21:00",
    feature: "Brain Yoga",
    caption: "5-minute reset. Breathe out the day.",
    detail: "Guided box breathing to close the study session. Not optional — this is how you stay consistent for 6 months.",
    icon: "🧘",
    accent: false,
  },
  {
    time: "21:10",
    feature: "Daily Log",
    caption: "Two minutes. What clicked, what didn't. Done.",
    detail: "\"Optics finally clicked. Electro still shaky.\" Written down, it becomes tomorrow's edge. Streak updated. Sleep well.",
    icon: "🌙",
    accent: false,
  },
] as const;

export function DayTimelineSection() {
  return (
    <section className="bg-kal-page py-24 lg:py-32">
      <div className="mx-auto max-w-5xl px-6 sm:px-8 lg:px-12">
        <div className="mb-14">
          <h2
            className="mb-4 text-3xl font-normal leading-tight tracking-tight text-kal-text sm:text-4xl lg:text-[2.75rem]"
            style={{ fontFamily: "var(--font-display)" }}
          >
            A day with Kalnehi Daily.
          </h2>
          <p className="max-w-lg text-lg text-kal-text-secondary">
            Every feature has a moment. Together, they make a serious prep day feel effortless.
          </p>
        </div>

        <div className="relative">
          {/* Vertical line */}
          <div
            className="absolute left-[5.5rem] top-0 bottom-0 hidden w-px bg-kal-border sm:block"
            aria-hidden
          />

          <div className="space-y-0">
            {TIMELINE.map(({ time, feature, caption, detail, icon, accent }, i) => (
              <div key={time + feature} className="group relative flex gap-6 sm:gap-0">
                {/* Time */}
                <div className="hidden w-24 shrink-0 flex-col items-end justify-start pt-4 sm:flex">
                  <span className="font-mono text-xs font-bold tabular-nums text-kal-muted">
                    {time}
                  </span>
                </div>

                {/* Dot */}
                <div className="relative hidden sm:flex w-10 shrink-0 items-start justify-center pt-[1.1rem]">
                  <div
                    className={`relative z-10 flex h-6 w-6 items-center justify-center rounded-full border-2 bg-kal-page text-xs transition-colors group-hover:border-kal-accent ${
                      accent ? "border-kal-accent" : "border-kal-border"
                    }`}
                  >
                    <span>{icon}</span>
                  </div>
                </div>

                {/* Content */}
                <div className={`flex flex-1 flex-col pb-8 ${i === TIMELINE.length - 1 ? "pb-0" : ""}`}>
                  <span className="mb-1 block text-[10px] font-bold text-kal-muted sm:hidden">
                    {time}
                  </span>
                  <div
                    className={`rounded-2xl border px-5 py-4 backdrop-blur-sm transition hover:shadow-[0_4px_12px_rgba(100,75,40,0.07)] sm:ml-2 ${
                      accent
                        ? "border-kal-accent/25 bg-kal-accent-soft"
                        : "border-kal-border bg-kal-card-muted"
                    }`}
                  >
                    <div className="mb-2 flex items-center gap-2">
                      <span
                        className={`rounded-md px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider ${
                          accent
                            ? "bg-kal-accent-soft text-kal-accent"
                            : "bg-kal-border/40 text-kal-muted"
                        }`}
                      >
                        {feature}
                      </span>
                    </div>
                    <p className="mb-1 text-sm font-bold leading-snug text-kal-text sm:text-base">
                      {caption}
                    </p>
                    <p className="text-xs leading-relaxed text-kal-muted sm:text-sm">{detail}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

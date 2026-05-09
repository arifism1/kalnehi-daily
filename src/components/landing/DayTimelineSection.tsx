const TIMELINE = [
  {
    time: "06:00",
    feature: "Reality Snapshot",
    caption: "Home shows how far you’ve got—and where marks might land.",
    detail:
      "Open the dashboard and you’re looking at real syllabus coverage, not a fake headline number. On exams where we ship weightage from recent papers (JEE Main, NEET UG, Boards, and similar), ticking microtopics moves projected marks—often as several year-style lines built from chapter weights, not one fudge figure.",
    icon: "📊",
    accent: false,
  },
  {
    time: "06:15",
    feature: "Dictate My Day · Self Type",
    caption: "Say your day out loud, or type it—same list either way.",
    detail:
      "Try something like “Chemistry, six to eight tonight.” It lands next to lines you typed yourself: tick them off when you’re done, same as always.",
    icon: "🎙",
    accent: true,
  },
  {
    time: "08:00",
    feature: "Focus Timer",
    caption: "Run the timer on the task you actually opened.",
    detail:
      "Start and stop time against today’s item—Pomodoro or a longer block. If you sat for two hours but only thirty minutes felt like real work, that gap shows up in your totals instead of hiding.",
    icon: "⏱",
    accent: false,
  },
  {
    time: "10:15",
    feature: "Syllabus Tracker · Marks Engine",
    caption: "Walk subject → chapter → topic and tick what’s finished.",
    detail:
      "For seeded exams like JEE Main, the tree is already built: mark done or undo if you rushed it. Coverage % and projected marks follow weightage from recent exam patterns—papers usually lean on the last few years.",
    icon: "📚",
    accent: false,
  },
  {
    time: "12:00",
    feature: "Revision reminders",
    caption: "Book the next revision when you close a chapter.",
    detail:
      "From the syllabus or when you finish something on today’s list, pick a future date. It waits in the revision queue, then shows up that morning like any other line.",
    icon: "🔁",
    accent: false,
  },
  {
    time: "13:15",
    feature: "Doubt Tracker",
    caption: "Move doubts from open → working → solved.",
    detail:
      "Drop a doubt in a few seconds—voice, tags, optional photos kept on your device. Drag cards across columns as you work them; fewer mysteries buried in camera rolls.",
    icon: "❓",
    accent: false,
  },
  {
    time: "14:30",
    feature: "Mastermind",
    caption: "Ask for study advice with your real context loaded.",
    detail:
      "You might ask how to grab roughly twenty more marks. Mastermind looks at syllabus gaps, mocks, revision backlog, hours logged, Brain Yoga when it matters, and days left—then answers in one thread instead of five disconnected tips.",
    icon: "🧠",
    accent: true,
  },
  {
    time: "15:45",
    feature: "Missed tasks",
    caption: "What you skip today stays on the record.",
    detail:
      "Unfinished lines pile up by date. From Missed tasks, pin each one to a calendar day; it reappears that morning until you finish or move it again.",
    icon: "⏪",
    accent: false,
  },
  {
    time: "16:15",
    feature: "Backlog list · Backlog tracker",
    caption: "Park “after class” work with hours and a date.",
    detail:
      "Example: “Didn’t finish Chem—need chapter three notes, two hours tomorrow.” Set the hours and when it’s due; it lands on that day’s plan. Miss it again and it slips back to backlog so you pick a new day honestly.",
    icon: "📥",
    accent: false,
  },
  {
    time: "17:15",
    feature: "Mock test log",
    caption: "Record each paper with marks broken down by subject.",
    detail:
      "You’re not stuck with one overall score. Mastermind and Progress read the same trail as your syllabus—where mocks are rising and where coverage still looks thin.",
    icon: "📝",
    accent: false,
  },
  {
    time: "17:45",
    feature: "Target Score Blueprint",
    caption: "Tell it your target score; get an ordered to-do from what’s left.",
    detail:
      "Start from today’s projected score and the number you want. Kalnehi scans unfinished syllabus, sorts chapters by marks upside versus effort, and puts the heavy hitters up top so you work the list in order.",
    icon: "🎚️",
    accent: false,
  },
  {
    time: "18:30",
    feature: "Progress",
    caption: "Charts for hours, syllabus—and how you compare, quietly.",
    detail:
      "See whether your rhythm is climbing or sliding; syllabus and marks stay beside it. When enough people on your exam use Kalnehi, you get an anonymous weekly band—roughly “top ~10–20% of peers here”—not names on a leaderboard.",
    icon: "📈",
    accent: false,
  },
  {
    time: "18:50",
    feature: "Consistency Tracker",
    caption: "The calendar tints each day by how much you finished.",
    detail:
      "Green when you cleared north of 80% of what was due, amber between half and four-fifths, red under half—grey when nothing was scheduled. You’re looking at a habit, not a gut guess.",
    icon: "🗓",
    accent: false,
  },
  {
    time: "20:15",
    feature: "Brain Yoga",
    caption: "Short guided resets between long study pushes.",
    detail:
      "Pick quick sessions—focus drills, breath, body scan, visualization, gratitude—so a brutal week doesn’t leave you wrecked before the real exam. Logged frequency shows up where Mastermind can factor it in.",
    icon: "🧘",
    accent: false,
  },
  {
    time: "21:00",
    feature: "Daily Debrief",
    caption: "Three questions at night—type or talk.",
    detail:
      "What did you actually finish? What did you dodge? What’s the one thing tomorrow hinges on? Straight answers beat vague motivation when you’re tired.",
    icon: "✍️",
    accent: true,
  },
  {
    time: "21:20",
    feature: "Today's Recap",
    caption: "Share a day summary or scroll old weeks and months.",
    detail:
      "Cards pull study hours, streaks, and how much of the plan you closed. Jump back—“what was I doing a month ago?”—and spot repeat skips or spots where you usually stall.",
    icon: "🎁",
    accent: false,
  },
] as const;

export function DayTimelineSection() {
  return (
    <section className="bg-kal-page py-24 lg:py-32" id="study-day">
      <div className="mx-auto max-w-5xl px-6 sm:px-8 lg:px-12">
        <div className="mb-14 max-w-2xl">
          <h2
            className="mb-4 text-3xl font-normal leading-tight tracking-tight text-kal-text sm:text-4xl lg:text-[2.75rem]"
            style={{ fontFamily: "var(--font-display)" }}
          >
            What one study day looks like
          </h2>
          <p className="text-lg text-kal-text-secondary">
            When you open Kalnehi, home shows syllabus coverage and projected marks where we ship weightage-backed models — especially for exams like JEE Main and NEET. Plan by voice or typing, run the timer on the task you&apos;re sitting with, and let missed work and backlog land on real dates instead of disappearing. Log mocks, use Target Score Blueprint and Mastermind when you want priorities or a second opinion, then finish with debrief and recap. Voice skips menu-diving for jumps and quick adds; we go deepest on JEE Main, NEET UG, and Class 11/12 Boards today, with the same rhythm across 27 exam profiles.
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

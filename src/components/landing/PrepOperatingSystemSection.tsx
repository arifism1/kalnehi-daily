const PILLARS = [
  {
    title: "Dashboard & syllabus",
    hook: "Truth at microtopic level — then numbers you can trust.",
    body: "See syllabus percentage and projected marks where your exam has weightage data. Tick subject → chapter → microtopics so coverage matches how papers actually allocate marks.",
    bullets: [
      "Official-style syllabus trees, not a blank checklist",
      "Marks Engine ties completion to recent exam patterns where available",
      "Home dashboard keeps the snapshot next to today’s execution",
    ],
  },
  {
    title: "Daily execution",
    hook: "Plan with your voice, run the clock, close the loop.",
    body: "Dictate or self-type today’s tasks, link timers (including Pomodoro-style blocks), and log real minutes against what you intended. Missed work surfaces as pending; backlog items you schedule land on the right day automatically.",
    bullets: [
      "Dictate My Day and Self Type feed the same tickable plan",
      "Missed tasks stack so you reschedule instead of forgetting",
      "Backlog list and tracker move work onto the calendar",
    ],
  },
  {
    title: "Memory & rhythm",
    hook: "Reflection and history beat vague intentions.",
    body: "End the day with a structured debrief, skim Wrapped-style recaps (daily, weekly, monthly), and browse saved plans months back. Consistency views show when you actually executed — not when you felt productive.",
    bullets: [
      "Daily Debrief: three prompts you can speak or type",
      "Recaps for study hours, streaks, and completion trends",
      "Calendar / heatmap colored by how much of the plan you finished",
    ],
  },
  {
    title: "Coaching & wellness",
    hook: "Strategy, habits, and calm — not just more tasks.",
    body: "Mastermind reasons over your prep context; Target Score Blueprint bridges the gap to your goal. Log mocks subject-wise, watch Progress, and see anonymous cohort bands where enough peers are active. Revision queues, doubts, mistake log, habits, motivation vault, and Brain Yoga keep the human side of prep online.",
    bullets: [
      "Mastermind for prioritization, pressure, and next steps",
      "Mock tracker, Progress graphs, anonymous weekly cohort band",
      "Voice navigation across the app for faster moves mid-session",
    ],
  },
] as const;

export function PrepOperatingSystemSection() {
  return (
    <section className="bg-kal-page-end py-24 lg:py-32" id="prep-os">
      <div className="mx-auto max-w-7xl px-6 sm:px-8 lg:px-12">
        <div className="mb-14 max-w-2xl">
          <p className="mb-3 text-[10px] font-bold uppercase tracking-widest text-kal-accent">
            One preparation operating system
          </p>
          <h2
            className="mb-4 text-3xl font-normal leading-tight tracking-tight text-kal-text sm:text-4xl lg:text-[2.75rem]"
            style={{ fontFamily: "var(--font-display)" }}
          >
            Syllabus, marks, execution, and coaching — wired together.
          </h2>
        </div>

        <div className="grid gap-6 md:grid-cols-2">
          {PILLARS.map(({ title, hook, body, bullets }) => (
            <div
              key={title}
              className="flex flex-col gap-4 rounded-2xl border border-kal-border bg-kal-card p-7 shadow-[0_2px_8px_rgba(100,75,40,0.05)] backdrop-blur-sm transition hover:border-kal-accent/20 hover:shadow-[0_8px_24px_rgba(100,75,40,0.08)] dark:hover:shadow-[0_8px_24px_rgba(0,0,0,0.35)]"
            >
              <div>
                <h3 className="text-lg font-semibold text-kal-text">{title}</h3>
                <p className="mt-1 text-sm font-semibold leading-snug text-kal-accent/90">{hook}</p>
              </div>
              <p className="text-sm leading-relaxed text-kal-text-secondary">{body}</p>
              <ul className="mt-1 space-y-2 border-t border-kal-border pt-4">
                {bullets.map((b) => (
                  <li key={b} className="flex items-start gap-2.5 text-sm leading-relaxed text-kal-text-secondary">
                    <span className="mt-2 size-1 shrink-0 rounded-full bg-kal-accent" aria-hidden />
                    <span>{b}</span>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

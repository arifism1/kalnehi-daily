const FACTS = [
  {
    value: "18",
    label: "features in one app",
    detail: "Plan, track, revise, stay consistent — nothing left to juggle separately.",
  },
  {
    value: "3",
    label: "days free, no card",
    detail: "Every feature unlocked for 3 days. Your trial starts when you're ready.",
  },
  {
    value: "₹399",
    label: "per month, full access",
    detail: "2 million PrepBrain tokens and 100 minutes of voice every month. Everything, always.",
  },
  {
    value: "27",
    label: "exams in the catalog",
    detail:
      "Pick your profile in-app (including Other). Deepest syllabus + marks + revision coverage today: JEE Main, NEET UG, and Class 11/12 Boards.",
  },
] as const;

export function OutcomesBlock() {
  return (
    <section className="bg-[#0E1525] py-24 lg:py-32">
      <div className="mx-auto max-w-7xl px-6 sm:px-8 lg:px-12">
        <div className="mb-14 text-center">
          <h2
            className="mb-4 text-3xl font-normal leading-tight tracking-tight text-white sm:text-4xl lg:text-[2.75rem]"
            style={{ fontFamily: "var(--font-display)" }}
          >
            The honest numbers.
          </h2>
          <p className="mx-auto max-w-lg text-lg text-white/50">
            No inflated stats. Just facts about what you get.
          </p>
        </div>

        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {FACTS.map(({ value, label, detail }) => (
            <div
              key={label}
              className="flex flex-col gap-3 rounded-2xl border border-white/[0.06] bg-white/[0.04] p-6"
            >
              <p
                className="text-5xl font-normal leading-none tabular-nums text-kal-accent lg:text-6xl"
                style={{ fontFamily: "var(--font-display)" }}
              >
                {value}
              </p>
              <p className="text-sm font-bold text-white/80">{label}</p>
              <p className="text-sm leading-relaxed text-white/40">{detail}</p>
            </div>
          ))}
        </div>

        {/* AI quotas row */}
        <div className="mt-10 rounded-2xl border border-white/[0.06] bg-white/[0.03] p-6">
          <p className="mb-5 text-center text-[10px] font-bold uppercase tracking-widest text-white/30">
            AI usage by plan
          </p>
          <div className="flex flex-wrap items-center justify-center gap-x-10 gap-y-4">
            {[
              { label: "3-day free trial", voice: "12 min total", tokens: "60k tokens" },
              { label: "Smart Plan (₹399/mo)", voice: "100 hrs/month", tokens: "2M tokens/month" },
            ].map(({ label, voice, tokens }) => (
              <div key={label} className="text-center">
                <p className="text-[10px] font-bold uppercase tracking-wider text-kal-accent/60">{label}</p>
                <p className="mt-1 text-sm font-bold text-white">
                  {voice} voice
                </p>
                <p className="text-xs text-white/40">{tokens} PrepBrain AI</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

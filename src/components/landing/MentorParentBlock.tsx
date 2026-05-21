export function MentorParentBlock() {
  return (
    <section className="bg-[#F2EFE8] py-24 lg:py-32">
      <div className="mx-auto max-w-7xl px-6 sm:px-8 lg:px-12">
        <div className="mb-14 max-w-2xl">
          <h2
            className="mb-4 text-3xl font-normal leading-tight tracking-tight text-kal-text sm:text-4xl lg:text-[2.75rem]"
            style={{ fontFamily: "var(--font-display)" }}
          >
            For the people cheering you on.
          </h2>
          <p className="text-lg text-kal-text-secondary">
            Parents pay the bill. Mentors set the direction. Kalnehi gives them both exactly
            what they need — and nothing more.
          </p>
        </div>

        <div className="grid gap-8 lg:grid-cols-2">
          {/* Mentor card */}
          <div className="rounded-2xl border border-kal-border bg-white/70 p-8 shadow-[0_4px_12px_rgba(100,75,40,0.05)]">
            <div className="mb-5 flex size-12 items-center justify-center rounded-2xl bg-kal-accent-soft text-2xl">
              🎓
            </div>
            <h3 className="mb-2 text-lg font-semibold text-kal-text">For mentors and teachers</h3>
            <p className="mb-6 text-sm leading-relaxed text-kal-text-secondary">
              Create a cohort. Assign weekly targets. See every student&apos;s weak areas in one
              grid — who&apos;s falling behind, who&apos;s on track, and what to address in
              tomorrow&apos;s class.
            </p>
            <div className="rounded-xl border border-kal-border bg-[rgba(250,245,238,0.7)] p-4">
              <div className="grid grid-cols-3 gap-2 text-center">
                {[
                  { label: "Students", val: "47" },
                  { label: "On track", val: "38" },
                  { label: "Need attention", val: "9" },
                ].map(({ label, val }) => (
                  <div key={label}>
                    <p className="text-lg font-bold text-kal-text" style={{ fontFamily: "var(--font-display)" }}>{val}</p>
                    <p className="text-[10px] text-kal-muted">{label}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Parent card */}
          <div className="rounded-2xl border border-kal-border bg-white/70 p-8 shadow-[0_4px_12px_rgba(100,75,40,0.05)]">
            <div className="mb-5 flex size-12 items-center justify-center rounded-2xl bg-kal-accent-soft text-2xl">
              🏠
            </div>
            <h3 className="mb-2 text-lg font-semibold text-kal-text">For parents</h3>
            <p className="mb-6 text-sm leading-relaxed text-kal-text-secondary">
              Get a weekly summary — honest, clean, no drama. Enough to know they&apos;re okay,
              not enough to micromanage. No more daily interrogations at dinner.
            </p>

            {/* WhatsApp-style mock summary */}
            <div className="rounded-xl border border-[rgba(37,211,102,0.2)] bg-[rgba(37,211,102,0.04)] p-4">
              <div className="mb-2 flex items-center gap-2">
                <div className="flex size-6 items-center justify-center rounded-full bg-[rgba(37,211,102,0.15)] text-[11px]">
                  K
                </div>
                <span className="text-[11px] font-bold text-kal-text">Kalnehi Daily</span>
                <span className="ml-auto text-[9px] text-kal-muted">Weekly report</span>
              </div>
              <p className="text-[11px] leading-relaxed text-kal-text-secondary">
                <strong>Ananya had a strong week.</strong> Physics is on track. She missed
                Sunday&apos;s revision — already rescheduled to Monday. Consistency: 6/7 days.
                Next milestone: Complete Thermodynamics by Thursday.
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

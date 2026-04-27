export function FounderNoteSection() {
  return (
    <section className="bg-kal-page py-24 lg:py-32">
      <div className="mx-auto max-w-3xl px-6 sm:px-8 lg:px-12">
        <div className="rounded-2xl border border-kal-border bg-kal-card p-8 shadow-[0_4px_12px_rgba(100,75,40,0.05)] backdrop-blur-sm sm:p-10 lg:p-12 dark:shadow-[0_4px_12px_rgba(0,0,0,0.35)]">
          {/* Quote mark */}
          <div
            className="mb-6 text-6xl leading-none text-kal-accent/20"
            style={{ fontFamily: "var(--font-display)" }}
            aria-hidden
          >
            &ldquo;
          </div>

          <p className="mb-8 text-base leading-loose text-kal-text-secondary sm:text-lg sm:leading-loose">
            I was a JEE aspirant. I kept four notebooks, two apps and a whiteboard, and I still
            didn&apos;t know if I was on track the week before my exam. Kalnehi Daily is the tool I
            wish I&apos;d had — built from honest conversations with aspirants who are, right now,
            exactly where I was. If one student clears their exam because this app made their prep
            more organised and less anxious, it will have been worth it.
          </p>

          <div className="flex items-center gap-4">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-kal-accent text-base font-bold text-white">
              K
            </div>
            <div>
              <p className="text-sm font-bold text-kal-text">The Kalnehi Daily Team</p>
              <p className="text-xs text-kal-muted">Built in Bengaluru · For every aspirant in India</p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

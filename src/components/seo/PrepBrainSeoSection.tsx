/**
 * Visible, crawlable copy for /prepbrain — complements the interactive PrepBrain UI.
 */
export function PrepBrainSeoSection() {
  return (
    <section
      className="mx-auto mt-10 max-w-3xl border-t border-kal-border pt-8 text-sm text-kal-text-secondary"
      aria-labelledby="prepbrain-seo-heading"
    >
      <h2 id="prepbrain-seo-heading" className="text-base font-semibold text-kal-text">
        PrepBrain AI for JEE, NEET & Boards
      </h2>
      <p className="mt-3 leading-relaxed">
        PrepBrain is Kalnehi Daily’s syllabus-aware assistant: ask for explanations, drill plans, and
        quick clarifications while staying aligned with your weekly planner and habits. Use it to
        unblock hard topics, structure revision, and keep momentum on long preparation cycles.
      </p>
      <p className="mt-3 leading-relaxed">
        Install Kalnehi Daily as a Progressive Web App on Android for a full-screen experience with
        offline-friendly caching — ideal for libraries, hostels, and commute revision.
      </p>
    </section>
  );
}

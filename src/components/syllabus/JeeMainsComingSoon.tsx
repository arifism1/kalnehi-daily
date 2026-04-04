import { Construction } from "lucide-react";

export function JeeMainsComingSoon() {
  return (
    <div className="mx-auto max-w-lg">
      <div className="relative overflow-hidden rounded-3xl border-2 border-amber-400/90 bg-[#0a0a0a] px-6 py-14 text-center shadow-[0_0_60px_-12px_rgba(251,191,36,0.35)]">
        <div
          className="pointer-events-none absolute inset-0 opacity-[0.07]"
          style={{
            backgroundImage:
              "repeating-linear-gradient(-45deg, #fff 0, #fff 1px, transparent 1px, transparent 12px)",
          }}
        />
        <div className="relative">
          <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-2xl border-2 border-amber-400/80 bg-amber-500/15 shadow-lg shadow-amber-500/20">
            <Construction
              className="h-10 w-10 text-amber-300"
              strokeWidth={2}
              aria-hidden
            />
          </div>
          <h1 className="mt-8 text-2xl font-bold tracking-tight text-white">
            JEE Mains tracking
          </h1>
          <p className="mt-3 text-base leading-relaxed text-zinc-300">
            We&apos;re building a dedicated JEE Mains syllabus experience — chapter
            weighting, pyqs, and progress tuned for the exam pattern.
          </p>
          <p className="mt-4 text-sm font-medium text-amber-300/95">
            Coming soon. Stay on NEET UG in Profile to explore the live tracker
            today.
          </p>
        </div>
      </div>
    </div>
  );
}

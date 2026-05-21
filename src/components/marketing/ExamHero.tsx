import Link from "next/link";

interface ExamHeroProps {
  badge: string;
  headline: string;
  subheadline: string;
  ctaLabel?: string;
  ctaHref?: string;
  stats?: { label: string; value: string }[];
}

export function ExamHero({
  badge,
  headline,
  subheadline,
  ctaLabel = "Start free — 7 days on us",
  ctaHref = "/auth",
  stats,
}: ExamHeroProps) {
  return (
    <header className="space-y-5 pb-2">
      <p className="inline-flex items-center gap-1.5 rounded-full border border-kal-accent/25 bg-kal-accent-soft px-3 py-1 text-xs font-bold uppercase tracking-wide text-kal-accent-dark">
        <span className="size-1.5 rounded-full bg-kal-accent" aria-hidden />
        {badge}
      </p>

      <h1 className="kal-feature-title max-w-3xl leading-tight">{headline}</h1>

      <p className="max-w-2xl text-base leading-relaxed text-kal-text-secondary sm:text-lg">
        {subheadline}
      </p>

      <div className="flex flex-col gap-3 pt-1 sm:flex-row">
        <Link
          href={ctaHref}
          className="inline-flex min-h-[52px] items-center justify-center rounded-full bg-kal-accent px-8 text-sm font-bold text-white shadow-[0_4px_20px_rgba(255,122,0,0.3)] transition hover:brightness-105 active:scale-[0.99]"
        >
          {ctaLabel}
        </Link>
        <Link
          href="/pricing"
          className="inline-flex min-h-[52px] items-center justify-center rounded-full border border-kal-border px-8 text-sm font-semibold text-kal-text transition hover:border-kal-accent/40 hover:text-kal-accent-dark"
        >
          See pricing
        </Link>
      </div>

      {stats && stats.length > 0 && (
        <div className="flex flex-wrap gap-6 pt-2">
          {stats.map(({ label, value }) => (
            <div key={label}>
              <p className="text-lg font-bold text-kal-text">{value}</p>
              <p className="text-xs text-kal-text-secondary">{label}</p>
            </div>
          ))}
        </div>
      )}
    </header>
  );
}

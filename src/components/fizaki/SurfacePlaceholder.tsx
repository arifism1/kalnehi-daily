/**
 * Temporary scaffold card for FIZAKI surfaces not yet built out (Tier-1 work lands in
 * the next phase). Keeps navigation functional and copy on-brand (revenue/readiness —
 * never training/course/LMS wording).
 */
export function SurfacePlaceholder({
  title,
  subtitle,
  points,
}: {
  title: string;
  subtitle: string;
  points?: string[];
}) {
  return (
    <section className="mx-auto max-w-md">
      <h1 className="text-2xl font-bold tracking-tight text-kal-text">{title}</h1>
      <p className="mt-1 text-sm text-kal-text-secondary">{subtitle}</p>
      {points && points.length > 0 && (
        <ul className="mt-5 space-y-2">
          {points.map((p) => (
            <li
              key={p}
              className="rounded-xl border border-kal-border bg-kal-card px-4 py-3 text-sm text-kal-text-secondary"
            >
              {p}
            </li>
          ))}
        </ul>
      )}
      <p className="mt-6 rounded-xl bg-kal-accent-soft px-4 py-3 text-xs font-medium text-kal-accent">
        Coming online in this build.
      </p>
    </section>
  );
}

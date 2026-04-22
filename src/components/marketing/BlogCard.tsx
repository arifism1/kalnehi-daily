import Link from "next/link";

export interface BlogCardProps {
  slug: string;
  title: string;
  description: string;
  category: string;
  categoryLabel: string;
  publishedAt: string;
  readingTimeMin: number;
}

export function BlogCard({
  slug,
  title,
  description,
  categoryLabel,
  publishedAt,
  readingTimeMin,
}: BlogCardProps) {
  return (
    <article className="kal-glass-card rounded-2xl p-5 flex flex-col gap-3 hover:border-kal-accent/30 transition-colors">
      <div className="flex items-center gap-2">
        <span className="inline-block rounded-full bg-kal-accent-soft px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-kal-accent-dark">
          {categoryLabel}
        </span>
        <span className="text-xs text-kal-muted">
          {readingTimeMin} min read · {publishedAt}
        </span>
      </div>
      <Link href={`/blog/${slug}`} className="group">
        <h2 className="text-base font-semibold text-kal-text leading-snug group-hover:text-kal-accent-dark transition-colors">
          {title}
        </h2>
      </Link>
      <p className="text-sm leading-relaxed text-kal-text-secondary line-clamp-3">{description}</p>
      <Link
        href={`/blog/${slug}`}
        className="mt-auto text-xs font-semibold text-kal-accent-dark hover:underline underline-offset-2"
      >
        Read article →
      </Link>
    </article>
  );
}

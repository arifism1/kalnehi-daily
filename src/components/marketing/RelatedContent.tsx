import Link from "next/link";

import { getPostBySlug } from "@/content/blog";
import { getInternalLinks } from "@/config/internalLinks";

type Props = {
  /** Next.js route path, e.g. `/jee` or `/features/prepbrain-ai` */
  pathname: string;
};

/**
 * Centralised “Related articles / exams / features” block driven by {@link INTERNAL_LINKS}.
 */
export function RelatedContent({ pathname }: Props) {
  const links = getInternalLinks(pathname);
  if (!links) return null;

  const posts = (links.relatedPosts ?? [])
    .map((slug) => {
      const p = getPostBySlug(slug);
      return p ? { slug, title: p.title } : null;
    })
    .filter((x): x is { slug: string; title: string } => x !== null);

  const hasAny =
    posts.length > 0 || (links.relatedExams?.length ?? 0) > 0 || (links.relatedFeatures?.length ?? 0) > 0;
  if (!hasAny) return null;

  return (
    <section className="space-y-4 rounded-2xl border border-kal-border bg-kal-card/40 p-5" aria-labelledby="related-content">
      <h2 id="related-content" className="text-base font-bold text-kal-text">
        Related on Kalnehi Daily
      </h2>
      <div className="grid gap-6 sm:grid-cols-2">
        {posts.length > 0 && (
          <div className="space-y-2">
            <p className="text-xs font-bold uppercase tracking-wide text-kal-muted">Articles</p>
            <ul className="space-y-1.5 text-sm">
              {posts.map((p) => (
                <li key={p.slug}>
                  <Link href={`/blog/${p.slug}`} className="font-medium text-kal-accent-dark hover:underline">
                    {p.title}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        )}
        {(links.relatedExams?.length ?? 0) > 0 && (
          <div className="space-y-2">
            <p className="text-xs font-bold uppercase tracking-wide text-kal-muted">Exams</p>
            <ul className="space-y-1.5 text-sm">
              {links.relatedExams!.map((href) => (
                <li key={href}>
                  <Link href={href} className="font-medium text-kal-accent-dark hover:underline">
                    {href.replace(/^\//, "").replace(/-/g, " ")}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        )}
        {(links.relatedFeatures?.length ?? 0) > 0 && (
          <div className="space-y-2 sm:col-span-2">
            <p className="text-xs font-bold uppercase tracking-wide text-kal-muted">Features</p>
            <ul className="flex flex-wrap gap-2">
              {links.relatedFeatures!.map((href) => (
                <li key={href}>
                  <Link
                    href={href}
                    className="inline-block rounded-full border border-kal-border bg-kal-page px-3 py-1 text-xs font-medium text-kal-text hover:border-kal-accent/40"
                  >
                    {href.split("/").pop()?.replace(/-/g, " ")}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </section>
  );
}

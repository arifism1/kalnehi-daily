import Link from "next/link";
import clsx from "clsx";

export type BreadcrumbItem = { name: string; path: string };

type Props = {
  items: BreadcrumbItem[];
  className?: string;
};

/**
 * Visible trail above H1 — pairs with BreadcrumbList JSON-LD in MarketingPageJsonLd / ArticleJsonLd.
 * Uses route paths; links resolve via Next.js `Link`.
 */
export function Breadcrumbs({ items, className }: Props) {
  if (items.length <= 1) return null;

  return (
    <nav aria-label="Breadcrumb" className={clsx("text-xs text-kal-muted", className)}>
      <ol className="flex flex-wrap items-center gap-x-1.5 gap-y-1">
        {items.map((item, i) => {
          const isLast = i === items.length - 1;
          return (
            <li key={item.path} className="flex items-center gap-1.5">
              {isLast ? (
                <span className="font-medium text-kal-text-secondary">{item.name}</span>
              ) : (
                <Link href={item.path} className="hover:text-kal-accent-dark hover:underline">
                  {item.name}
                </Link>
              )}
              {!isLast && (
                <span aria-hidden className="text-kal-muted/80 select-none">
                  ›
                </span>
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}

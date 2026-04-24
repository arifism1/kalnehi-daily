import Link from "next/link";
import { CTABanner } from "@/components/marketing/CTABanner";
import { Breadcrumbs } from "@/components/seo/Breadcrumbs";
import { MarketingPageJsonLd } from "@/components/seo/MarketingPageJsonLd";
import { marketingPageMetadata } from "@/lib/marketing-seo";
import { SITE_NAME } from "@/lib/seo-metadata";
import { getAllComparisons } from "@/content/comparisons";

export const metadata = marketingPageMetadata({
  path: "/vs",
  title: `Kalnehi vs other study tools | ${SITE_NAME}`,
  description: `Side-by-side comparisons: Kalnehi against Notion, calendars, Excel planners, and more — built for competitive exam prep.`,
});

export default function ComparisonsIndexPage() {
  const comparisons = getAllComparisons();

  return (
    <>
      <MarketingPageJsonLd
        breadcrumbs={[{ name: "Home", path: "/" }, { name: "Comparisons", path: "/vs" }]}
        webPage={{
          name: `Kalnehi vs other study tools | ${SITE_NAME}`,
          description: "Honest feature comparisons for exam aspirants choosing a study system.",
        }}
      />

      <Breadcrumbs items={[{ name: "Home", path: "/" }, { name: "Comparisons", path: "/vs" }]} className="mb-2" />

      <div className="space-y-10">
        <header className="space-y-4">
          <p className="inline-flex items-center gap-1.5 rounded-full border border-kal-accent/25 bg-kal-accent-soft px-3 py-1 text-xs font-bold uppercase tracking-wide text-kal-accent-dark">
            <span className="h-1.5 w-1.5 rounded-full bg-kal-accent" aria-hidden />
            Comparisons
          </p>
          <h1 className="kal-feature-title">Kalnehi vs other study tools</h1>
          <p className="max-w-2xl text-base text-kal-text-secondary">
            See how Kalnehi compares to general-purpose apps and paper workflows — for syllabus tracking, consistency, and exam-day readiness.
          </p>
        </header>

        <ul className="space-y-3">
          {comparisons.map((c) => (
            <li key={c.slug}>
              <Link
                href={`/vs/${c.slug}`}
                className="kal-glass-card block rounded-2xl p-5 transition-colors hover:border-kal-accent/30"
              >
                <h2 className="text-base font-semibold text-kal-text">vs {c.competitorName}</h2>
                <p className="mt-1 text-sm text-kal-text-secondary leading-relaxed">{c.subheadline}</p>
              </Link>
            </li>
          ))}
        </ul>

        <CTABanner
          headline="Try Kalnehi free for 3 days"
          subtext="No credit card. Full access. See the difference in your first week of prep."
        />
      </div>
    </>
  );
}

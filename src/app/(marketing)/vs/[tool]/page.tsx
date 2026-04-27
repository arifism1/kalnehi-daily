import { notFound } from "next/navigation";
import { CTABanner } from "@/components/marketing/CTABanner";
import { ComparisonTable } from "@/components/marketing/ComparisonTable";
import { Breadcrumbs } from "@/components/seo/Breadcrumbs";
import { MarketingPageJsonLd } from "@/components/seo/MarketingPageJsonLd";
import { marketingPageMetadata } from "@/lib/marketing-seo";
import { SITE_NAME } from "@/lib/seo-metadata";
import { getAllComparisons, getComparisonBySlug, getComparisonSlugs } from "@/content/comparisons";
import Link from "next/link";

export function generateStaticParams() {
  return getComparisonSlugs().map((tool) => ({ tool }));
}

interface Props {
  params: Promise<{ tool: string }>;
}

export async function generateMetadata({ params }: Props) {
  const { tool } = await params;
  const data = getComparisonBySlug(tool);
  if (!data) return {};
  return marketingPageMetadata({
    path: `/vs/${tool}`,
    title: `${data.headline} | ${SITE_NAME}`,
    description: data.subheadline,
  });
}

export default async function ComparisonPage({ params }: Props) {
  const { tool } = await params;
  const data = getComparisonBySlug(tool);
  if (!data) notFound();

  return (
    <>
      <MarketingPageJsonLd
        breadcrumbs={[
          { name: "Home", path: "/" },
          { name: "Comparisons", path: "/vs" },
          { name: `vs ${data.competitorName}`, path: `/vs/${tool}` },
        ]}
        faqs={data.faqs.map((f) => ({ question: f.q, answer: f.a }))}
      />

      <Breadcrumbs items={[
          { name: "Home", path: "/" },
          { name: "Comparisons", path: "/vs" },
          { name: `vs ${data.competitorName}`, path: `/vs/${tool}` },
        ]} className="mb-2" />

      <div className="space-y-10">
        <header className="space-y-3">
          <p className="inline-flex items-center gap-1.5 rounded-full border border-kal-accent/25 bg-kal-accent-soft px-3 py-1 text-xs font-bold uppercase tracking-wide text-kal-accent-dark">
            <span className="h-1.5 w-1.5 rounded-full bg-kal-accent" aria-hidden />
            Honest comparison
          </p>
          <h1 className="kal-feature-title">{data.headline}</h1>
          <p className="max-w-2xl text-base leading-relaxed text-kal-text-secondary">
            {data.subheadline}
          </p>
        </header>

        <div className="text-sm text-kal-text-secondary leading-relaxed">
          <p>{data.intro}</p>
        </div>

        <section className="space-y-4">
          <h2 className="text-base font-semibold text-kal-text">Feature comparison</h2>
          <ComparisonTable competitorName={data.competitorName} rows={data.rows} />
        </section>

        <section className="space-y-4">
          <h2 className="text-base font-semibold text-kal-text">Why exam aspirants choose Kalnehi Daily</h2>
          <ul className="space-y-3">
            {data.whyKalnehi.map((point, i) => (
              <li key={i} className="flex gap-3 text-sm text-kal-text-secondary leading-relaxed">
                <span className="mt-1 h-5 w-5 flex-shrink-0 rounded-full bg-kal-accent/10 text-kal-accent-dark text-xs flex items-center justify-center font-bold">
                  {i + 1}
                </span>
                <span>{point}</span>
              </li>
            ))}
          </ul>
        </section>

        {data.limitations && (
          <section className="rounded-2xl border border-kal-border bg-kal-card p-5 space-y-2">
            <h2 className="text-sm font-semibold text-kal-text">When {data.competitorName} might still be the right choice</h2>
            <p className="text-sm text-kal-text-secondary leading-relaxed">{data.limitations}</p>
          </section>
        )}

        <section className="space-y-4">
          <h2 className="text-base font-semibold text-kal-text">Frequently asked questions</h2>
          <div className="space-y-3">
            {data.faqs.map((faq) => (
              <div key={faq.q} className="kal-glass-card rounded-xl p-4 space-y-1">
                <p className="text-sm font-semibold text-kal-text">{faq.q}</p>
                <p className="text-sm text-kal-text-secondary leading-relaxed">{faq.a}</p>
              </div>
            ))}
          </div>
        </section>

        {data.relatedExams.length > 0 && (
          <section className="space-y-3">
            <h2 className="text-sm font-semibold text-kal-text-secondary uppercase tracking-wide">Kalnehi Daily for your exam</h2>
            <div className="flex flex-wrap gap-2">
              {data.relatedExams.map((exam) => (
                <Link
                  key={exam}
                  href={`/${exam}`}
                  className="rounded-full border border-kal-border px-4 py-1.5 text-sm font-medium text-kal-text-secondary hover:border-kal-accent/40 hover:text-kal-accent-dark transition-colors"
                >
                  /{exam}
                </Link>
              ))}
            </div>
          </section>
        )}

        <div className="space-y-3">
          <h2 className="text-sm font-semibold text-kal-text-secondary uppercase tracking-wide">Other comparisons</h2>
          <div className="flex flex-wrap gap-2">
            {getAllComparisons()
              .filter((c) => c.slug !== tool)
              .map((c) => (
                <Link
                  key={c.slug}
                  href={`/vs/${c.slug}`}
                  className="rounded-full border border-kal-border px-4 py-1.5 text-sm font-medium text-kal-text-secondary hover:border-kal-accent/40 hover:text-kal-accent-dark transition-colors"
                >
                  vs {c.competitorName}
                </Link>
              ))}
          </div>
        </div>

        <CTABanner
          headline="Try Kalnehi Daily free for 3 days"
          subtext="No credit card. Full access. See why students choose it over alternatives."
        />
      </div>
    </>
  );
}

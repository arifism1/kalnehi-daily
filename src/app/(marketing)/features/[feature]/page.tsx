import { notFound } from "next/navigation";
import Link from "next/link";

import { CTABanner } from "@/components/marketing/CTABanner";
import { FAQBlock } from "@/components/marketing/FAQBlock";
import { RelatedContent } from "@/components/marketing/RelatedContent";
import { Breadcrumbs } from "@/components/seo/Breadcrumbs";
import { MarketingPageJsonLd } from "@/components/seo/MarketingPageJsonLd";
import { marketingPageMetadata } from "@/lib/marketing-seo";
import { SITE_NAME } from "@/lib/seo-metadata";
import { getAllFeatures, getFeatureBySlug, getFeatureSlugs } from "@/content/features";

interface Props {
  params: Promise<{ feature: string }>;
}

export async function generateStaticParams() {
  return getFeatureSlugs().map((feature) => ({ feature }));
}

export async function generateMetadata({ params }: Props) {
  const { feature: slug } = await params;
  const feature = getFeatureBySlug(slug);
  if (!feature) return {};
  return marketingPageMetadata({
    path: `/features/${slug}`,
    title: `${feature.name} — ${feature.tagline} | ${SITE_NAME}`,
    description: feature.metaDescription,
  });
}

export default async function FeaturePage({ params }: Props) {
  const { feature: slug } = await params;
  const feature = getFeatureBySlug(slug);
  if (!feature) notFound();

  const allFeatures = getAllFeatures();
  const relatedFeatureData = feature.relatedFeatures
    .map((s) => allFeatures.find((f) => f.slug === s))
    .filter(Boolean);

  return (
    <>
      <MarketingPageJsonLd
        breadcrumbs={[
          { name: "Home", path: "/" },
          { name: "Features", path: "/features" },
          { name: feature.name, path: `/features/${slug}` },
        ]}
        faqs={feature.faqs}
        webPage={{ name: `${feature.name} | ${SITE_NAME}`, description: feature.metaDescription }}
      />

      <Breadcrumbs
        items={[
          { name: "Home", path: "/" },
          { name: "Features", path: "/features" },
          { name: feature.name, path: `/features/${slug}` },
        ]}
        className="mb-2"
      />

      <article className="space-y-10">
        {/* Hero */}
        <header className="space-y-4">
          <p className="inline-flex items-center gap-1.5 rounded-full border border-kal-accent/25 bg-kal-accent-soft px-3 py-1 text-xs font-bold uppercase tracking-wide text-kal-accent-dark">
            <span className="h-1.5 w-1.5 rounded-full bg-kal-accent" aria-hidden />
            Kalnehi Feature
          </p>
          <h1 className="kal-feature-title">{feature.headline}</h1>
          <p className="text-sm font-semibold text-kal-accent-dark">{feature.tagline}</p>
          <div className="flex gap-3">
            <Link
              href="/auth"
              className="inline-flex min-h-[48px] items-center justify-center rounded-full bg-kal-accent px-6 text-sm font-bold text-white shadow-[0_4px_16px_rgba(255,122,0,0.28)] transition hover:brightness-105"
            >
              Start free — 3 days on us
            </Link>
            <Link
              href="/features"
              className="inline-flex min-h-[48px] items-center justify-center rounded-full border border-kal-border px-6 text-sm font-semibold text-kal-text transition hover:border-kal-accent/40"
            >
              All features
            </Link>
          </div>
        </header>

        {/* Description */}
        <section className="space-y-3" aria-labelledby="feature-what">
          <h2 id="feature-what" className="text-xl font-bold text-kal-text">What {feature.name} does</h2>
          <div className="prose prose-sm max-w-none text-kal-text-secondary leading-relaxed">
            {feature.description.split("\n\n").map((para, i) => (
              <p key={i} className="mb-3">{para}</p>
            ))}
          </div>
        </section>

        {/* Scenarios */}
        <section className="space-y-4" aria-labelledby="feature-scenarios">
          <h2 id="feature-scenarios" className="text-xl font-bold text-kal-text">
            What it looks like in real prep
          </h2>
          <div className="space-y-3">
            {feature.scenarios.map((scenario, i) => (
              <div key={i} className="kal-glass-card rounded-xl border-l-2 border-kal-accent/40 p-5">
                <p className="text-sm leading-relaxed text-kal-text-secondary">{scenario}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Exam compatibility */}
        <section className="kal-glass-card rounded-2xl p-5 space-y-2" aria-labelledby="feature-exams">
          <h2 id="feature-exams" className="text-base font-semibold text-kal-text">Exam compatibility</h2>
          <p className="text-sm text-kal-text-secondary">{feature.examCompatibility}</p>
          <div className="flex flex-wrap gap-2 pt-1">
            {feature.relatedExams.map((href) => {
              const label = href.replace("/", "").toUpperCase().replace(/-/g, " ");
              return (
                <Link
                  key={href}
                  href={href}
                  className="rounded-full border border-kal-border bg-kal-card px-3 py-1 text-xs font-medium text-kal-text-secondary hover:border-kal-accent/40 hover:text-kal-accent-dark transition-colors"
                >
                  {label}
                </Link>
              );
            })}
          </div>
        </section>

        {/* Related features */}
        {relatedFeatureData.length > 0 && (
          <section className="space-y-3" aria-labelledby="feature-related">
            <h2 id="feature-related" className="text-base font-semibold text-kal-text">Works best with</h2>
            <div className="flex flex-wrap gap-3">
              {relatedFeatureData.map((f) => f && (
                <Link
                  key={f.slug}
                  href={`/features/${f.slug}`}
                  className="kal-glass-card rounded-xl px-4 py-3 text-sm font-medium text-kal-text hover:border-kal-accent/30 transition-colors"
                >
                  <span className="font-semibold">{f.name}</span>
                  <span className="ml-1 text-kal-muted">— {f.tagline}</span>
                </Link>
              ))}
            </div>
          </section>
        )}

        <RelatedContent pathname={`/features/${slug}`} />

        <FAQBlock items={feature.faqs} title={`${feature.name} — FAQ`} />

        <CTABanner
          headline={`Try ${feature.name} free for 3 days`}
          subtext="Full access to every feature. No credit card required."
        />
      </article>
    </>
  );
}

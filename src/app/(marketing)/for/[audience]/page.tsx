import { notFound } from "next/navigation";
import { CTABanner } from "@/components/marketing/CTABanner";
import { MarketingPageJsonLd } from "@/components/seo/MarketingPageJsonLd";
import { marketingPageMetadata } from "@/lib/marketing-seo";
import { SITE_NAME } from "@/lib/seo-metadata";
import { getAllUseCases, getUseCaseBySlug, getUseCaseSlugs } from "@/content/use-cases";
import Link from "next/link";

export function generateStaticParams() {
  return getUseCaseSlugs().map((audience) => ({ audience }));
}

interface Props {
  params: Promise<{ audience: string }>;
}

export async function generateMetadata({ params }: Props) {
  const { audience } = await params;
  const data = getUseCaseBySlug(audience);
  if (!data) return {};
  return marketingPageMetadata({
    path: `/for/${audience}`,
    title: `${data.headline} | ${SITE_NAME}`,
    description: data.subheadline,
  });
}

export default async function UseCasePage({ params }: Props) {
  const { audience } = await params;
  const data = getUseCaseBySlug(audience);
  if (!data) notFound();

  return (
    <>
      <MarketingPageJsonLd
        breadcrumbs={[
          { name: "Home", path: "/" },
          { name: `For ${data.audienceLabel}`, path: `/for/${audience}` },
        ]}
        faqs={data.faqs.map((f) => ({ question: f.q, answer: f.a }))}
      />

      <div className="space-y-10">
        <header className="space-y-3">
          <p className="inline-flex items-center gap-1.5 rounded-full border border-kal-accent/25 bg-kal-accent-soft px-3 py-1 text-xs font-bold uppercase tracking-wide text-kal-accent-dark">
            <span className="h-1.5 w-1.5 rounded-full bg-kal-accent" aria-hidden />
            For {data.audienceLabel}
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
          <h2 className="text-base font-semibold text-kal-text">The real challenges</h2>
          <ul className="space-y-2">
            {data.challenges.map((challenge, i) => (
              <li key={i} className="flex gap-3 text-sm text-kal-text-secondary leading-relaxed">
                <span className="mt-1 text-kal-accent flex-shrink-0">→</span>
                <span>{challenge}</span>
              </li>
            ))}
          </ul>
        </section>

        <section className="space-y-4">
          <h2 className="text-base font-semibold text-kal-text">A day in the life with Kalnehi</h2>
          <div className="rounded-2xl border border-kal-border overflow-hidden">
            {data.dayInTheLife.map((entry, i) => (
              <div
                key={entry.time}
                className={`flex gap-4 px-4 py-3 text-sm ${i % 2 === 0 ? "bg-kal-page" : "bg-kal-card/40"} ${i < data.dayInTheLife.length - 1 ? "border-b border-kal-border" : ""}`}
              >
                <span className="w-20 flex-shrink-0 font-mono text-xs text-kal-muted pt-0.5">{entry.time}</span>
                <div className="flex-1 space-y-1">
                  <p className="font-medium text-kal-text">{entry.activity}</p>
                  {entry.kalnehiRole && (
                    <p className="text-xs text-kal-accent-dark">{entry.kalnehiRole}</p>
                  )}
                </div>
              </div>
            ))}
          </div>
        </section>

        <section className="space-y-4">
          <h2 className="text-base font-semibold text-kal-text">
            Key Kalnehi features for {data.audienceLabel.toLowerCase()}
          </h2>
          <div className="grid gap-4 sm:grid-cols-2">
            {data.features.map((feature) => (
              <div key={feature.title} className="kal-glass-card rounded-2xl p-4 space-y-2">
                <p className="text-sm font-semibold text-kal-text">{feature.title}</p>
                <p className="text-sm text-kal-text-secondary leading-relaxed">{feature.why}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="space-y-4">
          <h2 className="text-base font-semibold text-kal-text">Frequently asked questions</h2>
          <div className="space-y-3">
            {data.faqs.map((faq) => (
              <div key={faq.q} className="kal-glass-card rounded-xl p-4 space-y-1">
                <p className="text-sm font-semibold text-kal-text">{faq.q}</p>
                <p className="text-sm text-kal-text-secondary">{faq.a}</p>
              </div>
            ))}
          </div>
        </section>

        {(data.relatedExams.length > 0 || data.relatedFeatures.length > 0) && (
          <section className="space-y-4">
            {data.relatedExams.length > 0 && (
              <div className="space-y-2">
                <h3 className="text-sm font-semibold text-kal-text-secondary uppercase tracking-wide">Exam-specific pages</h3>
                <div className="flex flex-wrap gap-2">
                  {data.relatedExams.map((exam) => (
                    <Link
                      key={exam}
                      href={`/${exam}`}
                      className="rounded-full border border-kal-border px-4 py-1.5 text-sm font-medium text-kal-text-secondary hover:border-kal-accent/40 hover:text-kal-accent-dark transition-colors"
                    >
                      Kalnehi for /{exam}
                    </Link>
                  ))}
                </div>
              </div>
            )}
            {data.relatedFeatures.length > 0 && (
              <div className="space-y-2">
                <h3 className="text-sm font-semibold text-kal-text-secondary uppercase tracking-wide">Relevant features</h3>
                <div className="flex flex-wrap gap-2">
                  {data.relatedFeatures.map((feature) => (
                    <Link
                      key={feature}
                      href={`/features/${feature}`}
                      className="rounded-full border border-kal-border px-4 py-1.5 text-sm font-medium text-kal-text-secondary hover:border-kal-accent/40 hover:text-kal-accent-dark transition-colors"
                    >
                      {feature}
                    </Link>
                  ))}
                </div>
              </div>
            )}
          </section>
        )}

        <div className="space-y-3">
          <h3 className="text-sm font-semibold text-kal-text-secondary uppercase tracking-wide">Also useful for</h3>
          <div className="flex flex-wrap gap-2">
            {getAllUseCases()
              .filter((u) => u.slug !== audience)
              .map((u) => (
                <Link
                  key={u.slug}
                  href={`/for/${u.slug}`}
                  className="rounded-full border border-kal-border px-4 py-1.5 text-sm font-medium text-kal-text-secondary hover:border-kal-accent/40 hover:text-kal-accent-dark transition-colors"
                >
                  {u.audienceLabel}
                </Link>
              ))}
          </div>
        </div>

        <CTABanner
          headline={`Start free — built for ${data.audienceLabel.toLowerCase()}`}
          subtext="3-day free trial. No credit card. Your exam syllabus ready on day one."
        />
      </div>
    </>
  );
}

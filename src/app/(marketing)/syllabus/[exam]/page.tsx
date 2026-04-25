import { notFound } from "next/navigation";
import { CTABanner } from "@/components/marketing/CTABanner";
import { Breadcrumbs } from "@/components/seo/Breadcrumbs";
import { MarketingPageJsonLd } from "@/components/seo/MarketingPageJsonLd";
import { marketingPageMetadata } from "@/lib/marketing-seo";
import { SITE_NAME } from "@/lib/seo-metadata";
import { getAllSyllabi, getSyllabusBySlug, getSyllabusSlugs } from "@/content/syllabus";
import PrintSyllabusButton from "./PrintSyllabusButton";
import Link from "next/link";

export function generateStaticParams() {
  return getSyllabusSlugs().map((exam) => ({ exam }));
}

interface Props {
  params: Promise<{ exam: string }>;
}

export async function generateMetadata({ params }: Props) {
  const { exam } = await params;
  const data = getSyllabusBySlug(exam);
  if (!data) return {};
  return marketingPageMetadata({
    path: `/syllabus/${exam}`,
    title: `${data.exam} Syllabus ${data.lastUpdated} — Complete Topic-wise | ${SITE_NAME}`,
    description: `Complete ${data.exam} syllabus with all subjects and topics. Updated ${data.lastUpdated}. Printable. Track your syllabus coverage in Kalnehi.`,
  });
}

export default async function SyllabusPage({ params }: Props) {
  const { exam } = await params;
  const data = getSyllabusBySlug(exam);
  if (!data) notFound();

  const breadcrumbJsonLd = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Home", item: "https://kalnehi.com" },
      { "@type": "ListItem", position: 2, name: "Syllabus", item: "https://kalnehi.com/syllabus" },
      { "@type": "ListItem", position: 3, name: `${data.exam} Syllabus`, item: `https://kalnehi.com/syllabus/${exam}` },
    ],
  };

  const otherSyllabi = getAllSyllabi().filter((s) => s.slug !== exam).slice(0, 5);

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbJsonLd) }}
      />
      <MarketingPageJsonLd
        breadcrumbs={[
          { name: "Home", path: "/" },
          { name: "Syllabus", path: "/syllabus/jee-main" },
          { name: `${data.exam} Syllabus`, path: `/syllabus/${exam}` },
        ]}
      />

      <Breadcrumbs items={[
          { name: "Home", path: "/" },
          { name: "Syllabus", path: "/syllabus/jee-main" },
          { name: `${data.exam} Syllabus`, path: `/syllabus/${exam}` },
        ]} className="mb-2" />

      <div className="space-y-10">
        <header className="space-y-3">
          <p className="inline-flex items-center gap-1.5 rounded-full border border-kal-accent/25 bg-kal-accent-soft px-3 py-1 text-xs font-bold uppercase tracking-wide text-kal-accent-dark">
            <span className="h-1.5 w-1.5 rounded-full bg-kal-accent" aria-hidden />
            Official Syllabus — Updated {data.lastUpdated}
          </p>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div className="space-y-1">
              <h1 className="kal-feature-title">{data.exam} Syllabus {data.lastUpdated}</h1>
              <p className="text-sm text-kal-muted">{data.fullName} · Conducted by {data.conductedBy}</p>
            </div>
            <div className="flex gap-2 flex-shrink-0">
              <PrintSyllabusButton examName={data.exam} />
              <Link
                href="/auth/signup"
                className="inline-flex min-h-[40px] items-center justify-center rounded-full bg-kal-accent px-5 text-sm font-bold text-white transition hover:brightness-105"
              >
                Track in Kalnehi
              </Link>
            </div>
          </div>
          <p className="max-w-2xl text-sm leading-relaxed text-kal-text-secondary">
            {data.description}
          </p>
        </header>

        {data.importantNotes.length > 0 && (
          <section className="rounded-2xl border border-kal-border bg-kal-card p-5 space-y-3">
            <h2 className="text-sm font-semibold text-kal-text">Important notes</h2>
            <ul className="space-y-2">
              {data.importantNotes.map((note, i) => (
                <li key={i} className="flex gap-2 text-sm text-kal-text-secondary leading-relaxed">
                  <span className="flex-shrink-0 text-kal-accent mt-0.5">•</span>
                  <span>{note}</span>
                </li>
              ))}
            </ul>
          </section>
        )}

        <div className="space-y-8" id="syllabus-content">
          {data.subjects.map((subject) => (
            <section key={subject.name} className="space-y-4">
              <h2 className="text-lg font-bold text-kal-text border-b border-kal-border pb-2">{subject.name}</h2>
              <div className="grid gap-4 sm:grid-cols-2">
                {subject.chapters.map((chapter) => (
                  <div key={chapter.name} className="kal-glass-card rounded-2xl p-4 space-y-2">
                    <h3 className="text-sm font-semibold text-kal-text">{chapter.name}</h3>
                    <ul className="space-y-1">
                      {chapter.topics.map((topic) => (
                        <li key={topic} className="flex gap-2 text-xs text-kal-text-secondary">
                          <span className="flex-shrink-0 text-kal-accent mt-0.5">·</span>
                          <span>{topic}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                ))}
              </div>
            </section>
          ))}
        </div>

        <section className="rounded-2xl border border-kal-accent/20 bg-kal-accent/5 p-5 space-y-3">
          <h2 className="text-base font-semibold text-kal-text">Track this syllabus in Kalnehi</h2>
          <p className="text-sm text-kal-text-secondary leading-relaxed">
            Kalnehi's Syllabus Tracker has {data.exam} pre-loaded. Mark topics as done, see your coverage percentage, and get Mastermind to tell you what to focus on next — based on your actual progress.
          </p>
          <div className="flex flex-col gap-2 sm:flex-row">
            <Link
              href="/auth/signup"
              className="inline-flex min-h-[44px] items-center justify-center rounded-full bg-kal-accent px-6 text-sm font-bold text-white transition hover:brightness-105"
            >
              Start free — 3 days on us
            </Link>
            <Link
              href="/features/syllabus-tracker"
              className="inline-flex min-h-[44px] items-center justify-center rounded-full border border-kal-border px-6 text-sm font-semibold text-kal-text transition hover:border-kal-accent/40"
            >
              How the Syllabus Tracker works
            </Link>
          </div>
        </section>

        {otherSyllabi.length > 0 && (
          <section className="space-y-3">
            <h2 className="text-sm font-semibold text-kal-text-secondary uppercase tracking-wide">Other exam syllabi</h2>
            <div className="flex flex-wrap gap-2">
              {otherSyllabi.map((s) => (
                <Link
                  key={s.slug}
                  href={`/syllabus/${s.slug}`}
                  className="rounded-full border border-kal-border px-4 py-1.5 text-sm font-medium text-kal-text-secondary hover:border-kal-accent/40 hover:text-kal-accent-dark transition-colors"
                >
                  {s.exam} Syllabus
                </Link>
              ))}
            </div>
          </section>
        )}

        <CTABanner
          headline={`Track your ${data.exam} syllabus coverage in Kalnehi`}
          subtext="Mastermind, revision reminders, and daily planning — all around your exam syllabus."
        />
      </div>
    </>
  );
}

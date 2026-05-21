import type { Metadata } from "next";
import Link from "next/link";
import { BlogCard } from "@/components/marketing/BlogCard";
import { CTABanner } from "@/components/marketing/CTABanner";
import { Breadcrumbs } from "@/components/seo/Breadcrumbs";
import { MarketingPageJsonLd } from "@/components/seo/MarketingPageJsonLd";
import { marketingPageMetadata } from "@/lib/marketing-seo";
import { SITE_NAME } from "@/lib/seo-metadata";
import { absoluteUrl } from "@/lib/site";
import { getAllPosts, getAllCategories } from "@/content/blog";
import { CATEGORY_LABELS } from "@/content/blog/types";

const blogBase: Metadata = marketingPageMetadata({
  path: "/blog",
  title: `Blog — Study Strategy & Exam Prep Guides | ${SITE_NAME}`,
  description: `Real, useful articles on JEE, NEET, UPSC, CAT, GATE and CA preparation. Study techniques, daily routines, syllabus strategies and honest advice for serious Indian competitive exam aspirants.`,
});

const POSTS_PER_PAGE = 8;

type BlogSearch = { page?: string };

export async function generateMetadata({ searchParams }: { searchParams: Promise<BlogSearch> }): Promise<Metadata> {
  const { page: pageParam } = await searchParams;
  const page = Math.max(1, parseInt(String(pageParam ?? "1"), 10) || 1);
  const all = getAllPosts();
  const totalPages = Math.max(1, Math.ceil(all.length / POSTS_PER_PAGE));
  if (page > 1) {
    return {
      ...blogBase,
      title: { absolute: `Blog — page ${page} | ${SITE_NAME}` },
      alternates: { canonical: absoluteUrl("/blog") },
      robots: { index: false, follow: true },
      pagination: {
        previous: page > 2 ? absoluteUrl(`/blog?page=${page - 1}`) : absoluteUrl("/blog"),
        next: page < totalPages ? absoluteUrl(`/blog?page=${page + 1}`) : undefined,
      },
    };
  }
  return {
    ...blogBase,
    pagination: {
      next: totalPages > 1 ? absoluteUrl("/blog?page=2") : undefined,
    },
  };
}

export default function BlogPage({ searchParams }: { searchParams: Promise<BlogSearch> }) {
  return <BlogIndex searchParams={searchParams} />;
}

async function BlogIndex({ searchParams }: { searchParams: Promise<BlogSearch> }) {
  const { page: pageParam } = await searchParams;
  const page = Math.max(1, parseInt(String(pageParam ?? "1"), 10) || 1);
  const allPosts = getAllPosts();
  const totalPages = Math.max(1, Math.ceil(allPosts.length / POSTS_PER_PAGE));
  const start = (page - 1) * POSTS_PER_PAGE;
  const posts = allPosts.slice(start, start + POSTS_PER_PAGE);
  const categories = getAllCategories();

  return (
    <>
      <MarketingPageJsonLd
        breadcrumbs={[{ name: "Home", path: "/" }, { name: "Blog", path: "/blog" }]}
        webPage={{
          name: `Blog | ${SITE_NAME}`,
          description: "Study strategy and exam prep articles for JEE, NEET, UPSC, CAT, GATE and CA aspirants.",
        }}
      />

      <Breadcrumbs
        items={[{ name: "Home", path: "/" }, { name: "Blog", path: "/blog" }]}
        className="mb-2"
      />

      <div className="space-y-10">
        <header className="space-y-4">
          <p className="inline-flex items-center gap-1.5 rounded-full border border-kal-accent/25 bg-kal-accent-soft px-3 py-1 text-xs font-bold uppercase tracking-wide text-kal-accent-dark">
            <span className="size-1.5 rounded-full bg-kal-accent" aria-hidden />
            Kalnehi Daily Blog
          </p>
          <h1 className="kal-feature-title">Study Strategy for Indian Competitive Exams</h1>
          <p className="max-w-2xl text-base text-kal-text-secondary">
            Real, useful articles on JEE, NEET, UPSC, CAT, GATE and CA preparation. No fluff. No generic advice. Just specific, actionable guidance for serious aspirants.
          </p>
        </header>

        {/* Category filter */}
        <div className="flex flex-wrap gap-2" aria-label="Filter by category">
          <Link
            href="/blog"
            className="rounded-full border border-kal-accent/40 bg-kal-accent-soft px-3 py-1 text-xs font-bold text-kal-accent-dark"
          >
            All
          </Link>
          {categories.map((cat) => (
            <Link
              key={cat}
              href={`/blog/category/${cat}`}
              className="rounded-full border border-kal-border px-3 py-1 text-xs font-medium text-kal-text-secondary hover:border-kal-accent/40 hover:text-kal-accent-dark transition-colors"
            >
              {CATEGORY_LABELS[cat] ?? cat}
            </Link>
          ))}
        </div>

        {/* Posts grid */}
        <div className="grid gap-4 sm:grid-cols-2">
          {posts.map((post) => (
            <BlogCard key={post.slug} {...post} />
          ))}
        </div>

        {totalPages > 1 && (
          <nav className="flex flex-wrap items-center justify-center gap-2" aria-label="Blog pagination">
            {page > 1 && (
              <Link
                href={page === 2 ? "/blog" : `/blog?page=${page - 1}`}
                className="rounded-full border border-kal-border px-4 py-2 text-sm font-medium text-kal-text hover:border-kal-accent/40"
                rel="prev"
              >
                Previous
              </Link>
            )}
            <span className="text-sm text-kal-muted">
              Page {page} of {totalPages}
            </span>
            {page < totalPages && (
              <Link
                href={`/blog?page=${page + 1}`}
                className="rounded-full border border-kal-border px-4 py-2 text-sm font-medium text-kal-text hover:border-kal-accent/40"
                rel="next"
              >
                Next
              </Link>
            )}
          </nav>
        )}

        <CTABanner
          headline="Put what you read into practice"
          subtext="Start free for 7 days. Full access to Mastermind, syllabus tracker, and all planning tools."
        />
      </div>
    </>
  );
}

import Link from "next/link";
import { BlogCard } from "@/components/marketing/BlogCard";
import { CTABanner } from "@/components/marketing/CTABanner";
import { MarketingPageJsonLd } from "@/components/seo/MarketingPageJsonLd";
import { marketingPageMetadata } from "@/lib/marketing-seo";
import { SITE_NAME } from "@/lib/seo-metadata";
import { getAllPosts, getAllCategories } from "@/content/blog";
import { CATEGORY_LABELS } from "@/content/blog/types";

export const metadata = marketingPageMetadata({
  path: "/blog",
  title: `Blog — Study Strategy & Exam Prep Guides | ${SITE_NAME}`,
  description: `Real, useful articles on JEE, NEET, UPSC, CAT, GATE and CA preparation. Study techniques, daily routines, syllabus strategies and honest advice for serious Indian competitive exam aspirants.`,
});

export default function BlogPage() {
  const posts = getAllPosts();
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

      <div className="space-y-10">
        <header className="space-y-4">
          <p className="inline-flex items-center gap-1.5 rounded-full border border-kal-accent/25 bg-kal-accent-soft px-3 py-1 text-xs font-bold uppercase tracking-wide text-kal-accent-dark">
            <span className="h-1.5 w-1.5 rounded-full bg-kal-accent" aria-hidden />
            Kalnehi Blog
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

        <CTABanner
          headline="Put what you read into practice"
          subtext="Start free for 3 days. Full access to PrepBrain AI, syllabus tracker, and all planning tools."
        />
      </div>
    </>
  );
}

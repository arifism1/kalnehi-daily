import { notFound } from "next/navigation";
import Link from "next/link";

import { BlogCard } from "@/components/marketing/BlogCard";
import { CTABanner } from "@/components/marketing/CTABanner";
import { Breadcrumbs } from "@/components/seo/Breadcrumbs";
import { MarketingPageJsonLd } from "@/components/seo/MarketingPageJsonLd";
import { marketingPageMetadata } from "@/lib/marketing-seo";
import { SITE_NAME } from "@/lib/seo-metadata";
import { getAllCategories, getPostsByCategory } from "@/content/blog";
import { CATEGORY_LABELS } from "@/content/blog/types";

interface Props {
  params: Promise<{ category: string }>;
}

export async function generateStaticParams() {
  return getAllCategories().map((category) => ({ category }));
}

export async function generateMetadata({ params }: Props) {
  const { category } = await params;
  const label = CATEGORY_LABELS[category];
  if (!label) return {};
  return marketingPageMetadata({
    path: `/blog/category/${category}`,
    title: `${label} Articles | ${SITE_NAME}`,
    description: `Articles, guides and study strategies for ${label} preparation — from Kalnehi.`,
    noindex: true,
  });
}

export default async function CategoryPage({ params }: Props) {
  const { category } = await params;
  const label = CATEGORY_LABELS[category];
  if (!label) notFound();

  const posts = getPostsByCategory(category);

  return (
    <>
      <MarketingPageJsonLd
        breadcrumbs={[
          { name: "Home", path: "/" },
          { name: "Blog", path: "/blog" },
          { name: label, path: `/blog/category/${category}` },
        ]}
      />

      <Breadcrumbs items={[
          { name: "Home", path: "/" },
          { name: "Blog", path: "/blog" },
          { name: label, path: `/blog/category/${category}` },
        ]} className="mb-2" />

      <div className="space-y-8">
        <header className="space-y-3">
          <nav className="text-sm text-kal-muted">
            <Link href="/blog" className="hover:text-kal-accent-dark">Blog</Link>
            {" / "}
            <span>{label}</span>
          </nav>
          <h1 className="kal-feature-title">{label} — Articles &amp; Guides</h1>
          <p className="text-sm text-kal-text-secondary">
            {posts.length} article{posts.length !== 1 ? "s" : ""} on {label} preparation.
          </p>
        </header>

        <div className="grid gap-4 sm:grid-cols-2">
          {posts.map((post) => (
            <BlogCard key={post.slug} {...post} />
          ))}
        </div>

        <CTABanner
          headline="Apply what you read — start free for 3 days"
          subtext="Full Mastermind, syllabus tracker, daily planner. No credit card."
        />
      </div>
    </>
  );
}

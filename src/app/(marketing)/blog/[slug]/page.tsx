import { notFound } from "next/navigation";
import Link from "next/link";

import { CTABanner } from "@/components/marketing/CTABanner";
import { BlogCard } from "@/components/marketing/BlogCard";
import { Breadcrumbs } from "@/components/seo/Breadcrumbs";
import { ArticleJsonLd } from "@/components/seo/ArticleJsonLd";
import { ogImageBlog } from "@/lib/og-image";
import { marketingPageMetadata } from "@/lib/marketing-seo";
import { SITE_NAME } from "@/lib/seo-metadata";
import { absoluteUrl } from "@/lib/site";
import { getAllPosts, getPostBySlug, getRelatedPosts } from "@/content/blog";
import { CATEGORY_LABELS } from "@/content/blog/types";

interface Props {
  params: Promise<{ slug: string }>;
}

export async function generateStaticParams() {
  return getAllPosts().map((p) => ({ slug: p.slug }));
}

export async function generateMetadata({ params }: Props) {
  const { slug } = await params;
  const post = getPostBySlug(slug);
  if (!post) return {};
  const label = CATEGORY_LABELS[post.category] ?? post.category;
  return marketingPageMetadata({
    path: `/blog/${slug}`,
    title: `${post.title} | ${SITE_NAME}`,
    description: post.description,
    ogType: "article",
    articlePublishedTime: post.publishedAt,
    articleModifiedTime: post.modifiedAt ?? post.publishedAt,
    articleAuthor: "Kalnehi Daily",
    ogImage: ogImageBlog(post.title, label),
  });
}

function renderMarkdown(content: string): React.ReactNode[] {
  const lines = content.split("\n");
  const elements: React.ReactNode[] = [];
  let i = 0;

  while (i < lines.length) {
    const line = lines[i];

    if (line.startsWith("## ")) {
      elements.push(<h2 key={i} className="mt-8 text-xl font-bold text-kal-text first:mt-0">{line.slice(3)}</h2>);
    } else if (line.startsWith("### ")) {
      elements.push(<h3 key={i} className="mt-6 text-base font-semibold text-kal-text">{line.slice(4)}</h3>);
    } else if (line.startsWith("**") && line.endsWith("**") && !line.slice(2, -2).includes("**")) {
      elements.push(<p key={i} className="mt-3 font-semibold text-kal-text">{line.slice(2, -2)}</p>);
    } else if (line.startsWith("| ")) {
      // Table
      const tableLines: string[] = [];
      while (i < lines.length && lines[i].startsWith("| ")) {
        tableLines.push(lines[i]);
        i++;
      }
      const [header, , ...rows] = tableLines;
      const headers = header.split("|").filter(Boolean).map(h => h.trim());
      elements.push(
        <div key={`table-${i}`} className="my-4 overflow-x-auto rounded-xl border border-kal-border">
          <table className="w-full text-sm">
            <thead className="bg-kal-card">
              <tr>{headers.map((h, j) => <th key={j} className="px-3 py-2 text-left font-semibold text-kal-text">{h}</th>)}</tr>
            </thead>
            <tbody>
              {rows.map((row, ri) => {
                const cells = row.split("|").filter(Boolean).map(c => c.trim());
                return <tr key={ri} className={ri % 2 === 0 ? "bg-kal-page" : "bg-kal-card/40"}>{cells.map((c, ci) => <td key={ci} className="px-3 py-2 text-kal-text-secondary">{c}</td>)}</tr>;
              })}
            </tbody>
          </table>
        </div>
      );
      continue;
    } else if (line.startsWith("- ") || line.startsWith("* ")) {
      const items: string[] = [];
      while (i < lines.length && (lines[i].startsWith("- ") || lines[i].startsWith("* "))) {
        items.push(lines[i].slice(2));
        i++;
      }
      elements.push(
        <ul key={`ul-${i}`} className="mt-3 space-y-1.5 pl-4">
          {items.map((item, j) => (
            <li key={j} className="text-sm text-kal-text-secondary leading-relaxed list-disc"
              dangerouslySetInnerHTML={{ __html: item.replace(/\*\*(.*?)\*\*/g, '<strong class="text-kal-text">$1</strong>') }}
            />
          ))}
        </ul>
      );
      continue;
    } else if (line.startsWith("1. ") || /^\d+\. /.test(line)) {
      const items: string[] = [];
      while (i < lines.length && /^\d+\. /.test(lines[i])) {
        items.push(lines[i].replace(/^\d+\. /, ""));
        i++;
      }
      elements.push(
        <ol key={`ol-${i}`} className="mt-3 space-y-1.5 pl-4">
          {items.map((item, j) => (
            <li key={j} className="text-sm text-kal-text-secondary leading-relaxed list-decimal"
              dangerouslySetInnerHTML={{ __html: item.replace(/\*\*(.*?)\*\*/g, '<strong class="text-kal-text">$1</strong>') }}
            />
          ))}
        </ol>
      );
      continue;
    } else if (line.trim() !== "") {
      elements.push(
        <p key={i} className="mt-3 text-sm leading-relaxed text-kal-text-secondary"
          dangerouslySetInnerHTML={{ __html: line.replace(/\*\*(.*?)\*\*/g, '<strong class="text-kal-text">$1</strong>') }}
        />
      );
    }

    i++;
  }

  return elements;
}

export default async function BlogPostPage({ params }: Props) {
  const { slug } = await params;
  const post = getPostBySlug(slug);
  if (!post) notFound();

  const related = getRelatedPosts(post);

  return (
    <>
      <ArticleJsonLd
        slug={post.slug}
        title={post.title}
        description={post.description}
        publishedAt={post.publishedAt}
        modifiedAt={post.modifiedAt}
        imageUrl={absoluteUrl(ogImageBlog(post.title, CATEGORY_LABELS[post.category] ?? post.category))}
        breadcrumbs={[
          { name: "Home", path: "/" },
          { name: "Blog", path: "/blog" },
          { name: CATEGORY_LABELS[post.category] ?? post.category, path: `/blog/category/${post.category}` },
          { name: post.title, path: `/blog/${slug}` },
        ]}
      />

      <Breadcrumbs
        items={[
          { name: "Home", path: "/" },
          { name: "Blog", path: "/blog" },
          { name: CATEGORY_LABELS[post.category] ?? post.category, path: `/blog/category/${post.category}` },
          { name: post.title, path: `/blog/${slug}` },
        ]}
        className="mb-2"
      />

      <article className="space-y-8">
        {/* Header */}
        <header className="space-y-4 pb-4 border-b border-kal-border">
          <div className="flex flex-wrap items-center gap-2">
            <Link
              href={`/blog/category/${post.category}`}
              className="inline-block rounded-full bg-kal-accent-soft px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-kal-accent-dark hover:underline"
            >
              {CATEGORY_LABELS[post.category] ?? post.category}
            </Link>
            <span className="text-xs text-kal-muted">
              {post.readingTimeMin} min read · {post.publishedAt}
            </span>
          </div>
          <h1 className="kal-feature-title">{post.title}</h1>
          <p className="text-base leading-relaxed text-kal-text-secondary">{post.description}</p>

          {/* Nav links */}
          <nav className="text-sm text-kal-muted" aria-label="Breadcrumb">
            <Link href="/blog" className="hover:text-kal-accent-dark">Blog</Link>
            {" / "}
            <Link href={`/blog/category/${post.category}`} className="hover:text-kal-accent-dark">
              {CATEGORY_LABELS[post.category] ?? post.category}
            </Link>
          </nav>
        </header>

        {/* Content */}
        <div className="space-y-1">
          {renderMarkdown(post.content)}
        </div>

        {/* Related exam/feature links */}
        {(post.relatedExams?.length || post.relatedFeatures?.length) && (
          <div className="flex flex-wrap gap-2 pt-2">
            {post.relatedExams?.map((href) => (
              <Link key={href} href={href} className="rounded-full border border-kal-border px-3 py-1 text-xs font-medium text-kal-text-secondary hover:border-kal-accent/40 hover:text-kal-accent-dark transition-colors">
                {href.replace("/", "").toUpperCase().replace(/-/g, " ")} →
              </Link>
            ))}
            {post.relatedFeatures?.map((href) => (
              <Link key={href} href={href} className="rounded-full border border-kal-border px-3 py-1 text-xs font-medium text-kal-text-secondary hover:border-kal-accent/40 hover:text-kal-accent-dark transition-colors">
                {href.split("/").pop()?.replace(/-/g, " ")} feature →
              </Link>
            ))}
          </div>
        )}

        {/* Related posts */}
        {related.length > 0 && (
          <section className="space-y-4" aria-labelledby="related-posts">
            <h2 id="related-posts" className="text-lg font-bold text-kal-text">Read next</h2>
            <div className="grid gap-4 sm:grid-cols-2">
              {related.map((p) => <BlogCard key={p.slug} {...p} />)}
            </div>
          </section>
        )}

        <CTABanner
          headline="Put this into practice with Kalnehi Daily"
          subtext="Start free for 3 days. Full Mastermind, syllabus tracker and daily planner."
        />
      </article>
    </>
  );
}

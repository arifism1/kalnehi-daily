import { getAllPosts } from "@/content/blog";
import { absoluteProductionUrl } from "@/lib/site";
import { SITE_NAME } from "@/lib/seo-metadata";

export const revalidate = 86400;

export async function GET() {
  const posts = getAllPosts();
  const siteUrl = absoluteProductionUrl("/");

  const items = posts
    .map(
      (post) => `
    <item>
      <title><![CDATA[${post.title}]]></title>
      <link>${absoluteProductionUrl(`/blog/${post.slug}`)}</link>
      <guid>${absoluteProductionUrl(`/blog/${post.slug}`)}</guid>
      <pubDate>${new Date(post.publishedAt).toUTCString()}</pubDate>
      <description><![CDATA[${post.description}]]></description>
      <category><![CDATA[${post.categoryLabel}]]></category>
    </item>`,
    )
    .join("\n");

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
  <channel>
    <title>${SITE_NAME} — Blog</title>
    <link>${siteUrl}</link>
    <atom:link href="${absoluteProductionUrl("/blog/rss.xml")}" rel="self" type="application/rss+xml"/>
    <description>Study strategy and exam prep articles for JEE, NEET, UPSC, CAT, GATE and CA aspirants.</description>
    <language>en-IN</language>
    <lastBuildDate>${new Date().toUTCString()}</lastBuildDate>
    ${items}
  </channel>
</rss>`;

  return new Response(xml, {
    headers: {
      "Content-Type": "application/xml; charset=utf-8",
      "Cache-Control": "public, max-age=3600",
    },
  });
}

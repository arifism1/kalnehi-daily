import { ImageResponse } from "next/og";
import { notFound } from "next/navigation";

import { getAllPosts, getPostBySlug } from "@/content/blog";
import { CATEGORY_LABELS } from "@/content/blog/types";
import {
  OG_IMAGE_HEIGHT,
  OG_IMAGE_WIDTH,
  SITE_BRAND,
} from "@/lib/seo-metadata";

export const alt = `${SITE_BRAND} — Blog`;

export const size = {
  width: OG_IMAGE_WIDTH,
  height: OG_IMAGE_HEIGHT,
};

export const contentType = "image/png";

const accent = "#FF7A00";
const bg = "linear-gradient(135deg, #FAF7F2 0%, #FFF5EB 45%, #FAF7F2 100%)";

const ogCacheHeaders = {
  "Cache-Control":
    "public, max-age=3600, s-maxage=3600, stale-while-revalidate=86400",
};

export async function generateStaticParams() {
  return getAllPosts().map((p) => ({ slug: p.slug }));
}

interface Props {
  params: Promise<{ slug: string }>;
}

export default async function Image({ params }: Props) {
  const { slug } = await params;
  const post = getPostBySlug(slug);
  if (!post) notFound();

  const categoryLabel = CATEGORY_LABELS[post.category] ?? post.category;
  const title = post.title;

  return new ImageResponse(
    (
      <div
        style={{
          height: "100%",
          width: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          background: bg,
          padding: 48,
          fontFamily: "ui-sans-serif, system-ui, sans-serif",
        }}
      >
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: 16,
          }}
        >
          {categoryLabel ? (
            <div
              style={{
                fontSize: 22,
                fontWeight: 700,
                color: accent,
                textTransform: "uppercase",
                letterSpacing: 1,
              }}
            >
              {categoryLabel}
            </div>
          ) : null}
          <div
            style={{
              fontSize: title.length > 60 ? 44 : 56,
              fontWeight: 800,
              color: "#18181b",
              lineHeight: 1.1,
              letterSpacing: -0.02,
              maxWidth: 1040,
            }}
          >
            {title}
          </div>
        </div>
        <div
          style={{
            display: "flex",
            flexDirection: "row",
            justifyContent: "space-between",
            alignItems: "flex-end",
          }}
        >
          <div style={{ fontSize: 28, fontWeight: 800, color: "#18181b" }}>
            {SITE_BRAND}
          </div>
          <div style={{ fontSize: 20, color: "#52525b" }}>Win Daily</div>
        </div>
      </div>
    ),
    {
      width: size.width,
      height: size.height,
      headers: ogCacheHeaders,
    },
  );
}

import { ImageResponse } from "next/og";

import {
  OG_IMAGE_HEIGHT,
  OG_IMAGE_WIDTH,
  SITE_BRAND,
} from "@/lib/seo-metadata";

export const alt = `${SITE_BRAND} — CAT Preparation`;

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

export default function OpenGraphImage() {
  const title = "CAT Preparation";
  const sub = "Daily OS for serious aspirants";

  return new ImageResponse(
    (
      <div
        style={{
          height: "100%",
          width: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          gap: 24,
          background: bg,
          padding: 56,
          fontFamily: "ui-sans-serif, system-ui, sans-serif",
        }}
      >
        <div
          style={{
            fontSize: title.length > 40 ? 52 : 64,
            fontWeight: 800,
            color: "#18181b",
            lineHeight: 1.05,
            letterSpacing: -0.02,
            maxWidth: 1080,
          }}
        >
          {title}
        </div>
        <div
          style={{
            fontSize: 28,
            fontWeight: 600,
            color: accent,
          }}
        >
          {sub}
        </div>
        <div
          style={{
            marginTop: 32,
            display: "flex",
            flexDirection: "row",
            justifyContent: "space-between",
            alignItems: "center",
          }}
        >
          <div style={{ fontSize: 30, fontWeight: 800, color: "#18181b" }}>
            {SITE_BRAND}
          </div>
          <div style={{ fontSize: 22, color: "#52525b" }}>Win Daily</div>
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

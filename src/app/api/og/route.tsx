import { ImageResponse } from "next/og";

import { SITE_BRAND } from "@/lib/seo-metadata";

export const runtime = "edge";

const ogSize = { width: 1200, height: 630 } as const;

const accent = "#FF7A00";
const bg = "linear-gradient(135deg, #FAF7F2 0%, #FFF5EB 45%, #FAF7F2 100%)";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const type = (searchParams.get("type") ?? "default").toLowerCase();
  const title = searchParams.get("title") || SITE_BRAND;
  const category = searchParams.get("category") || "";
  const sub = searchParams.get("subtitle") || "Daily OS for serious aspirants";

  if (type === "blog") {
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
            {category && (
              <div
                style={{
                  fontSize: 22,
                  fontWeight: 700,
                  color: accent,
                  textTransform: "uppercase",
                  letterSpacing: 1,
                }}
              >
                {category}
              </div>
            )}
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
            <div style={{ fontSize: 28, fontWeight: 800, color: "#18181b" }}>{SITE_BRAND}</div>
            <div style={{ fontSize: 20, color: "#52525b" }}>Win Daily</div>
          </div>
        </div>
      ),
      { ...ogSize },
    );
  }

  if (type === "exam") {
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
            <div style={{ fontSize: 30, fontWeight: 800, color: "#18181b" }}>{SITE_BRAND}</div>
            <div style={{ fontSize: 22, color: "#52525b" }}>Win Daily</div>
          </div>
        </div>
      ),
      { ...ogSize },
    );
  }

  // default — match root opengraph-image feel
  return new ImageResponse(
    (
      <div
        style={{
          height: "100%",
          width: "100%",
          display: "flex",
          flexDirection: "column",
          alignItems: "flex-start",
          justifyContent: "center",
          background: bg,
          padding: 56,
        }}
      >
        <div
          style={{
            fontSize: 64,
            fontWeight: 800,
            color: "#18181b",
            letterSpacing: -0.02,
            lineHeight: 1.1,
          }}
        >
          {SITE_BRAND}
        </div>
        <div
          style={{
            fontSize: 34,
            fontWeight: 700,
            color: accent,
            marginTop: 16,
          }}
        >
          Win Daily
        </div>
        <div
          style={{
            fontSize: 24,
            color: "#52525b",
            marginTop: 28,
            maxWidth: 920,
            lineHeight: 1.35,
          }}
        >
          {title}
        </div>
      </div>
    ),
    { ...ogSize },
  );
}

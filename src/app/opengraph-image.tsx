import { ImageResponse } from "next/og";

import { SITE_BRAND, SITE_TAGLINE } from "@/lib/seo-metadata";

export const alt = `${SITE_BRAND} — ${SITE_TAGLINE}`;
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function OpenGraphImage() {
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
          background: "linear-gradient(135deg, #FAF7F2 0%, #FFF5EB 45%, #FAF7F2 100%)",
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
            color: "#FF7A00",
            marginTop: 16,
          }}
        >
          {SITE_TAGLINE}
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
          Exam prep planner, syllabus tracking, study sessions, and optional PrepBrain AI —
          installable PWA for JEE, NEET, UPSC & Boards.
        </div>
      </div>
    ),
    { ...size },
  );
}

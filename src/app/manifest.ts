import type { MetadataRoute } from "next";

import { SITE_BRAND, SITE_NAME } from "@/lib/seo-metadata";

export default function manifest(): MetadataRoute.Manifest {
  return {
    id: "/",
    name: SITE_NAME,
    short_name: SITE_BRAND,
    description:
      "Kalnehi Daily - Exam Prep Tracker: best daily planner for JEE 2026, NEET 2026 & UPSC CSE — weekly planner, syllabus, study sessions, habits, PrepBrain AI (Pro). Install the PWA from Chrome for offline-friendly study & push notifications when enabled.",
    start_url: "/",
    scope: "/",
    display: "standalone",
    display_override: ["standalone", "minimal-ui"],
    orientation: "portrait-primary",
    background_color: "#f8f9fa",
    theme_color: "#ef4444",
    lang: "en-IN",
    dir: "ltr",
    categories: ["education", "productivity"],
    prefer_related_applications: false,
    shortcuts: [
      {
        name: "Study guides",
        short_name: "Guides",
        description: "Public SEO guides — JEE, NEET, UPSC & consistency",
        url: "/guides",
        icons: [{ src: "/icon-192x192.png", sizes: "192x192", type: "image/png" }],
      },
      {
        name: "JEE 2026 planner",
        short_name: "JEE 2026",
        description: "Best daily planner for JEE 2026",
        url: "/jee-study-planner",
        icons: [{ src: "/icon-192x192.png", sizes: "192x192", type: "image/png" }],
      },
      {
        name: "NEET 2026 planner",
        short_name: "NEET 2026",
        description: "Best daily planner for NEET 2026",
        url: "/neet-study-planner",
        icons: [{ src: "/icon-192x192.png", sizes: "192x192", type: "image/png" }],
      },
    ],
    icons: [
      {
        src: "/icon-192x192.png",
        sizes: "192x192",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/icon-maskable-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
      {
        src: "/icon-maskable-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/icon-512x512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "any",
      },
    ],
  };
}

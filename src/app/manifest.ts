import type { MetadataRoute } from "next";

import { SITE_NAME } from "@/lib/seo-metadata";

export default function manifest(): MetadataRoute.Manifest {
  return {
    // TWA: `id` must be a stable canonical path — do not change after publishing.
    id: "/",
    name: SITE_NAME,
    // "Kalnehi" fits Play Store's 12-char short-name limit and looks clean on the home screen.
    short_name: "Kalnehi",
    description:
      "Kalnehi Daily - Exam Prep Tracker: best daily planner for JEE 2026, NEET 2026 & UPSC CSE — weekly planner, syllabus, study sessions, habits, PrepBrain AI (Pro). Install the PWA from Chrome for offline-friendly study & push notifications when enabled.",
    start_url: "/",
    scope: "/",
    display: "standalone",
    display_override: ["standalone", "minimal-ui"],
    orientation: "portrait-primary",
    // Light premium theme: white shell background, Kalnehi red accent.
    background_color: "#ffffff",
    theme_color: "#ef4444",
    lang: "en-IN",
    dir: "ltr",
    categories: ["education", "productivity"],
    // TWA: keep false so Chrome doesn't redirect users to the Play Store listing.
    prefer_related_applications: false,
    screenshots: [
      // narrow = phone portrait (Play Store mobile listing preview)
      {
        src: "/screenshots/narrow-1.png",
        sizes: "1080x1920",
        type: "image/png",
        form_factor: "narrow",
        label: "Daily planner — track JEE, NEET & UPSC prep",
        platform: "play",
      },
      {
        src: "/screenshots/narrow-2.png",
        sizes: "1080x1920",
        type: "image/png",
        form_factor: "narrow",
        label: "PrepBrain AI — personalised exam guidance",
        platform: "play",
      },
      // wide = tablet landscape (Play Store tablet listing preview)
      {
        src: "/screenshots/wide-1.png",
        sizes: "1920x1080",
        type: "image/png",
        form_factor: "wide",
        label: "Kalnehi Daily on tablet",
        platform: "play",
      },
    ],
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
      // 192 — required minimum for TWA / Chrome install prompt.
      {
        src: "/icon-192x192.png",
        sizes: "192x192",
        type: "image/png",
        purpose: "any",
      },
      // 512 maskable — used by Android adaptive icon engine (safe-zone cropping).
      {
        src: "/icon-maskable-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
      // 512 any — splash screen, task switcher, Play Store listing icon.
      {
        src: "/icon-512x512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "any",
      },
    ],
  };
}

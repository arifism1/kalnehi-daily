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
      "Kalnehi Daily - Exam Prep Tracker: execution planner for Smart Exam Prep. Daily Plan with live task tracking, Syllabus Tracker, Brain Yoga focus resets, PrepBrain AI coaching, Notifications & push reminders, study sessions, habits, and progress analytics — start with a 3-day free trial, then Smart Plan (₹499/month). All in one offline-ready PWA.",
    start_url: "/",
    scope: "/",
    display: "standalone",
    display_override: ["standalone", "minimal-ui"],
    orientation: "portrait-primary",
    // Premium glassmorphic theme: warm cream background, Kalnehi warm orange accent.
    background_color: "#FAF7F2",
    theme_color: "#FF7A00",
    lang: "en-IN",
    dir: "ltr",
    categories: ["education", "productivity"],
    // TWA: keep false so Chrome doesn't redirect users to the Play Store listing.
    prefer_related_applications: false,
    // Play Store requires ≥2 screenshots per form factor; 8 max per factor.
    // Replace image files in public/screenshots/ before submitting to Play Console.
    screenshots: [
      // ── Narrow (phone portrait 1080×1920) ──────────────────────────────────
      {
        src: "/screenshots/narrow-1.png",
        sizes: "1080x1920",
        type: "image/png",
        form_factor: "narrow",
        label: "Daily Plan — live task checklist for Smart Exam Prep",
        platform: "play",
      },
      {
        src: "/screenshots/narrow-2.png",
        sizes: "1080x1920",
        type: "image/png",
        form_factor: "narrow",
        label: "Syllabus Tracker — chapter and topic progress",
        platform: "play",
      },
      {
        src: "/screenshots/narrow-3.png",
        sizes: "1080x1920",
        type: "image/png",
        form_factor: "narrow",
        label: "Brain Yoga — guided focus reset between study blocks",
        platform: "play",
      },
      {
        src: "/screenshots/narrow-4.png",
        sizes: "1080x1920",
        type: "image/png",
        form_factor: "narrow",
        label: "Notifications & push reminders — never miss a study slot",
        platform: "play",
      },
      // ── Wide (tablet landscape 1920×1080) ──────────────────────────────────
      {
        src: "/screenshots/wide-1.png",
        sizes: "1920x1080",
        type: "image/png",
        form_factor: "wide",
        label: "Daily Hub — execution signals and 3-Day view on tablet",
        platform: "play",
      },
      {
        src: "/screenshots/wide-2.png",
        sizes: "1920x1080",
        type: "image/png",
        form_factor: "wide",
        label: "PrepBrain AI coaching on tablet",
        platform: "play",
      },
    ],
    // Android long-press shortcuts — max 4 shown by Android launcher; keep most-used first.
    shortcuts: [
      {
        name: "Daily Plan",
        short_name: "Daily Plan",
        description: "Today's live task list — check off, edit, and execute",
        url: "/daily-plan",
        icons: [
          { src: "/icon-maskable-192.png", sizes: "192x192", type: "image/png" },
        ],
      },
      {
        name: "Syllabus Tracker",
        short_name: "Syllabus",
        description: "Track chapter and topic progress across your syllabus",
        url: "/syllabus",
        icons: [
          { src: "/icon-maskable-192.png", sizes: "192x192", type: "image/png" },
        ],
      },
      {
        name: "Brain Yoga",
        short_name: "Brain Yoga",
        description: "Guided focus resets and breathing exercises between study blocks",
        url: "/meditation",
        icons: [
          { src: "/icon-maskable-192.png", sizes: "192x192", type: "image/png" },
        ],
      },
      {
        name: "Notifications & Reminders",
        short_name: "Reminders",
        description: "Manage study reminders, push alerts, and daily nudges",
        url: "/settings",
        icons: [
          { src: "/icon-maskable-192.png", sizes: "192x192", type: "image/png" },
        ],
      },
      // 5th shortcut — Android shows max 4 on long-press; My Subscription is kept for completeness.
      {
        name: "My Subscription",
        short_name: "My Subscription",
        description: "View your subscription, AI credits, and billing details",
        url: "/my-subscription",
        icons: [
          { src: "/icon-maskable-192.png", sizes: "192x192", type: "image/png" },
        ],
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
      // 192 maskable — shortcuts / contexts that apply the same mask as the launcher tile.
      {
        src: "/icon-maskable-192.png",
        sizes: "192x192",
        type: "image/png",
        purpose: "maskable",
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

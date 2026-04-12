import type { MetadataRoute } from "next";

import { absoluteUrl } from "@/lib/site";

const PATHS: { path: string; changeFrequency: "daily" | "weekly"; priority: number }[] = [
  { path: "/", changeFrequency: "daily", priority: 1 },
  { path: "/guides", changeFrequency: "weekly", priority: 0.95 },
  { path: "/jee-study-planner", changeFrequency: "weekly", priority: 0.9 },
  { path: "/neet-study-planner", changeFrequency: "weekly", priority: 0.9 },
  { path: "/boards-study-planner", changeFrequency: "weekly", priority: 0.9 },
  { path: "/prepbrain", changeFrequency: "weekly", priority: 0.8 },
  { path: "/brain-yoga", changeFrequency: "weekly", priority: 0.8 },
  { path: "/study-sessions", changeFrequency: "weekly", priority: 0.8 },
  { path: "/planner", changeFrequency: "weekly", priority: 0.8 },
  { path: "/pricing", changeFrequency: "weekly", priority: 0.8 },
  { path: "/about", changeFrequency: "weekly", priority: 0.8 },
  { path: "/meditation", changeFrequency: "weekly", priority: 0.8 },
  { path: "/syllabus", changeFrequency: "weekly", priority: 0.8 },
  { path: "/daily-plan", changeFrequency: "weekly", priority: 0.8 },
  { path: "/habits", changeFrequency: "weekly", priority: 0.8 },
  { path: "/timer", changeFrequency: "weekly", priority: 0.8 },
  { path: "/motivation", changeFrequency: "weekly", priority: 0.8 },
  { path: "/progress", changeFrequency: "weekly", priority: 0.8 },
  { path: "/privacy", changeFrequency: "weekly", priority: 0.4 },
  { path: "/terms", changeFrequency: "weekly", priority: 0.4 },
];

export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date();
  return PATHS.map(({ path, changeFrequency, priority }) => ({
    url: absoluteUrl(path),
    lastModified: now,
    changeFrequency,
    priority,
  }));
}

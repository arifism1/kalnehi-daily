import { getAllPosts } from "@/content/blog";
import { getAllComparisons } from "@/content/comparisons";
import { getAllFeatures } from "@/content/features";
import { getSyllabusSlugs, getSyllabusBySlug } from "@/content/syllabus";
import { getAllUseCases } from "@/content/use-cases";
import { EXAM_SITEMAP_PATHS, getPagesSitemapEntries } from "@/lib/sitemap-data";
import { SMART_PLAN_MONTHLY_DISPLAY } from "@/lib/smartPlanPricing";

export type SearchResultType = "page" | "exam" | "feature" | "blog" | "tool" | "comparison" | "for-audience" | "syllabus";

export type SearchIndexEntry = {
  title: string;
  description: string;
  url: string;
  type: SearchResultType;
};

const examSet = new Set(EXAM_SITEMAP_PATHS);

/** Optional richer copy for exam landings; falls back to generic line. */
const EXAM_OVERRIDES: Partial<Record<string, { title: string; description: string }>> = {
  "/jee": {
    title: "JEE Preparation — daily planner with syllabus & Mastermind",
    description: "JEE Main & Advanced: PCM tracking, daily plans, voice, and AI strategy for serious aspirants.",
  },
  "/neet": {
    title: "NEET Preparation — Biology-first syllabus tracking & study OS",
    description: "NEET UG: track PCB chapters, build consistency, and get Mastermind guidance for weightage and mocks.",
  },
  "/upsc": {
    title: "UPSC CSE — daily execution system for prelims & mains",
    description: "UPSC strategy: syllabus, plans, current-affairs routine, and AI-assisted revision on Kalnehi Daily.",
  },
  "/cat": { title: "CAT Preparation", description: "VARC, DILR, Quant planning, mocks, and consistency for MBA aspirants." },
  "/gate": { title: "GATE Preparation", description: "Engineering GATE: syllabus, revision windows, and mock analytics." },
};

function examEntries(): SearchIndexEntry[] {
  return EXAM_SITEMAP_PATHS.map((path) => {
    const o = EXAM_OVERRIDES[path];
    if (o) {
      return { ...o, url: path, type: "exam" as const };
    }
    const label = path.replace(/^\//, "").replace(/-/g, " ");
    return {
      title: label.replace(/\b\w/g, (c) => c.toUpperCase()),
      description: `Exam prep landing, planning, and tools on Kalnehi Daily for ${label}.`,
      url: path,
      type: "exam",
    };
  });
}

const PAGE_OVERRIDES: Record<string, { title: string; description: string; type: SearchResultType }> = {
  "/": {
    title: "Kalnehi Daily — Win Daily",
    description: "Privacy-first study OS: planning, Mastermind, voice, syllabus, revision.",
    type: "page",
  },
  "/pricing": {
    title: "Pricing",
    description: `3-day free trial and Smart Plan (${SMART_PLAN_MONTHLY_DISPLAY}/month) — JEE, NEET, UPSC, and all major exams.`,
    type: "page",
  },
  "/search": {
    title: "Search",
    description: "Find exam pages, features, blog posts, and tools on Kalnehi Daily.",
    type: "page",
  },
};

let cached: SearchIndexEntry[] | null = null;

/**
 * All public, searchable routes — used by `/search` (client) and sitemap/SEO.
 * Call `getSearchIndex()` so blog/features stay in sync with content modules.
 */
export function getSearchIndex(): SearchIndexEntry[] {
  if (cached) return cached;
  const pages = new Map<string, SearchIndexEntry>();
  for (const e of getPagesSitemapEntries()) {
    const path = e.path;
    if (path === "/blog") continue; // blog index from posts
    if (examSet.has(path)) continue;
    const o = PAGE_OVERRIDES[path];
    if (o) {
      pages.set(path, { title: o.title, description: o.description, url: path, type: o.type });
    } else {
      const label = path.replace(/^\//, "") || "Home";
      pages.set(path, {
        title: label.split("/").pop()?.replace(/-/g, " ") ?? "Page",
        description: `Kalnehi Daily — ${label.replace(/-/g, " ")}`,
        url: path,
        type: path.startsWith("/tools") ? "tool" : "page",
      });
    }
  }
  for (const f of getAllFeatures()) {
    pages.set(`/features/${f.slug}`, {
      title: f.name,
      description: f.metaDescription,
      url: `/features/${f.slug}`,
      type: "feature",
    });
  }
  for (const p of getAllPosts()) {
    pages.set(`/blog/${p.slug}`, {
      title: p.title,
      description: p.description,
      url: `/blog/${p.slug}`,
      type: "blog",
    });
  }
  for (const c of getAllComparisons()) {
    pages.set(`/vs/${c.slug}`, {
      title: c.headline,
      description: c.subheadline,
      url: `/vs/${c.slug}`,
      type: "comparison",
    });
  }
  for (const u of getAllUseCases()) {
    pages.set(`/for/${u.slug}`, {
      title: u.headline,
      description: u.subheadline,
      url: `/for/${u.slug}`,
      type: "for-audience",
    });
  }
  for (const slug of getSyllabusSlugs()) {
    const s = getSyllabusBySlug(slug);
    pages.set(`/syllabus/${slug}`, {
      title: s ? `${s.exam} syllabus` : `Syllabus — ${slug}`,
      description: s?.description?.slice(0, 200) ?? `Official-style syllabus view for ${slug}.`,
      url: `/syllabus/${slug}`,
      type: "syllabus",
    });
  }
  for (const ex of examEntries()) {
    if (!pages.has(ex.url)) pages.set(ex.url, ex);
  }
  const blogIndex: SearchIndexEntry = {
    title: "Blog — study strategy for Indian competitive exams",
    description: "Articles on JEE, NEET, UPSC, CA, GATE, and study techniques.",
    url: "/blog",
    type: "blog",
  };
  if (!pages.has("/blog")) pages.set("/blog", blogIndex);

  cached = [...pages.values()];
  return cached;
}

/** Eager static export for client bundles (same data as getSearchIndex). */
export const SEARCH_INDEX: SearchIndexEntry[] = getSearchIndex();

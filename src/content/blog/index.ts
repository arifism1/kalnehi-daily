import type { BlogPost } from "./types";

import post1 from "./posts/how-to-make-daily-study-timetable-jee";
import post2 from "./posts/how-many-hours-neet-aspirant-study";
import post3 from "./posts/upsc-consistency-more-important-than-hours";
import post4 from "./posts/spaced-repetition-competitive-exams-india";
import post5 from "./posts/how-toppers-track-syllabus";
import post6 from "./posts/jee-dropper-study-plan";
import post7 from "./posts/voice-study-planning-why-it-works";
import post8 from "./posts/ca-intermediate-daily-routine";
import post9 from "./posts/upsc-daily-study-routine";
import post10 from "./posts/neet-syllabus-tracker-strategy";
import post11 from "./posts/gate-preparation-daily-plan";
import post12 from "./posts/study-consistency-vs-long-hours";
import post13 from "./posts/ai-study-planner-india";
import post14 from "./posts/doubt-tracking-system-exam-prep";
import post15 from "./posts/class-12-boards-jee-neet-balance";

const ALL_POSTS: BlogPost[] = [
  post1, post2, post3, post4, post5,
  post6, post7, post8, post9, post10,
  post11, post12, post13, post14, post15,
].toSorted((a, b) => new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime());

export function getAllPosts(): BlogPost[] {
  return ALL_POSTS;
}

export function getPostBySlug(slug: string): BlogPost | undefined {
  return ALL_POSTS.find((p) => p.slug === slug);
}

export function getPostsByCategory(category: string): BlogPost[] {
  return ALL_POSTS.filter((p) => p.category === category);
}

export function getRelatedPosts(post: BlogPost): BlogPost[] {
  return post.relatedSlugs
    .flatMap((slug) => {
      const p = ALL_POSTS.find((post) => post.slug === slug);
      return p ? [p] : [];
    })
    .slice(0, 3);
}

export function getPostSlugs(): string[] {
  return ALL_POSTS.map((p) => p.slug);
}

export function getAllCategories(): string[] {
  return [...new Set(ALL_POSTS.map((p) => p.category))];
}

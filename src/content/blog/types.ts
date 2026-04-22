export interface BlogPost {
  slug: string;
  title: string;
  description: string;
  category: string;
  categoryLabel: string;
  publishedAt: string;
  /** ISO 8601 date — defaults to publishedAt if not set */
  modifiedAt?: string;
  readingTimeMin: number;
  targetKeyword: string;
  relatedSlugs: string[];
  relatedExams?: string[];
  relatedFeatures?: string[];
  content: string; // Markdown
}

export const CATEGORY_LABELS: Record<string, string> = {
  "jee-preparation": "JEE Preparation",
  "neet-preparation": "NEET Preparation",
  "upsc-preparation": "UPSC Preparation",
  "study-techniques": "Study Techniques",
  "ca-preparation": "CA Preparation",
  "gate-preparation": "GATE Preparation",
};

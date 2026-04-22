/**
 * Open Graph image URLs (resolved with `metadataBase` / `absoluteUrl` in `marketingPageMetadata`).
 */
export function ogImageBlog(title: string, categoryLabel: string): string {
  const q = new URLSearchParams({
    type: "blog",
    title: title.slice(0, 200),
    category: categoryLabel,
  });
  return `/api/og?${q.toString()}`;
}

export function ogImageExam(examTitle: string, subtitle = "Daily OS for serious aspirants"): string {
  const q = new URLSearchParams({
    type: "exam",
    title: examTitle.slice(0, 120),
    subtitle,
  });
  return `/api/og?${q.toString()}`;
}

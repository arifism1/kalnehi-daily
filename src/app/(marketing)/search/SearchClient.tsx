"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useMemo } from "react";

import type { SearchIndexEntry, SearchResultType } from "@/config/searchIndex";

const TYPE_ORDER: SearchResultType[] = [
  "exam",
  "feature",
  "blog",
  "tool",
  "comparison",
  "for-audience",
  "syllabus",
  "page",
];

const TYPE_LABEL: Record<SearchResultType, string> = {
  exam: "Exams",
  feature: "Features",
  blog: "Blog posts",
  tool: "Tools",
  comparison: "Comparisons",
  "for-audience": "For you",
  syllabus: "Syllabi",
  page: "Pages",
};

const POPULAR: { title: string; url: string }[] = [
  { title: "JEE preparation", url: "/jee" },
  { title: "NEET preparation", url: "/neet" },
  { title: "UPSC preparation", url: "/upsc" },
  { title: "Mastermind", url: "/features/prepbrain-ai" },
  { title: "Pricing", url: "/pricing" },
  { title: "Blog", url: "/blog" },
];

function tokenize(s: string): string[] {
  return s
    .toLowerCase()
    .split(/[^a-z0-9\u0900-\u0fff]+/i)
    .filter(Boolean);
}

function scoreEntry(q: string, e: SearchIndexEntry): number {
  const toks = tokenize(q);
  if (toks.length === 0) return 0;
  const hay = `${e.title} ${e.description} ${e.url} ${e.type}`.toLowerCase();
  let score = 0;
  for (const t of toks) {
    if (e.title.toLowerCase().includes(t)) score += 5;
    if (e.description.toLowerCase().includes(t)) score += 2;
    if (e.url.toLowerCase().includes(t)) score += 1;
  }
  return score;
}

type Props = { index: SearchIndexEntry[] };

export function SearchClient({ index }: Props) {
  const searchParams = useSearchParams();
  const q = (searchParams.get("q") ?? "").trim();

  const results = useMemo(() => {
    if (q.length < 2) return [];
    return index
      .flatMap((e) => {
        const s = scoreEntry(q, e);
        return s > 0 ? [{ e, s }] : [];
      })
      .sort((a, b) => b.s - a.s);
  }, [q, index]);

  const grouped = useMemo(() => {
    const m = new Map<SearchResultType, SearchIndexEntry[]>();
    for (const t of TYPE_ORDER) m.set(t, []);
    for (const { e } of results) {
      m.get(e.type)!.push(e);
    }
    return m;
  }, [results]);

  return (
    <div className="space-y-10">
      <header className="space-y-2">
        <h1 className="kal-feature-title">Search</h1>
        <p className="text-sm text-kal-text-secondary">
          Find exams, features, blog posts, and free tools. Use the site search with{" "}
          <kbd className="rounded border border-kal-border bg-kal-card px-1.5 py-0.5 text-xs">?q=</kbd> in the
          address bar.
        </p>
      </header>

      {q.length < 2 && (
        <p className="text-sm text-kal-muted">Enter at least 2 characters after <code className="text-kal-text">?q=</code> in the URL (example: <Link href="/search?q=jee" className="text-kal-accent-dark underline">/search?q=jee</Link>).</p>
      )}

      {q.length >= 2 && results.length === 0 && (
        <div className="space-y-4 rounded-2xl border border-kal-border bg-kal-card/60 p-6">
          <p className="text-sm text-kal-text">
            No results for <span className="font-semibold text-kal-text">&quot;{q}&quot;</span>. Try
            &quot;jee&quot;, &quot;mastermind&quot;, or &quot;upsc routine&quot;.
          </p>
          <div>
            <p className="text-xs font-bold uppercase tracking-wide text-kal-muted">Popular on Kalnehi Daily</p>
            <ul className="mt-2 grid gap-2 sm:grid-cols-2">
              {POPULAR.map((p) => (
                <li key={p.url}>
                  <Link href={p.url} className="text-sm font-medium text-kal-accent-dark hover:underline">
                    {p.title}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}

      {q.length >= 2 && results.length > 0 && (
        <div className="space-y-8">
          {TYPE_ORDER.map((type) => {
            const list = grouped.get(type) ?? [];
            if (list.length === 0) return null;
            return (
              <section key={type} className="space-y-3" aria-labelledby={`search-${type}`}>
                <h2 id={`search-${type}`} className="text-sm font-semibold uppercase tracking-wide text-kal-muted">
                  {TYPE_LABEL[type]}
                </h2>
                <ul className="space-y-2">
                  {list.map((e) => (
                    <li key={e.url}>
                      <Link href={e.url} className="block rounded-xl border border-kal-border/80 bg-kal-page/80 p-3 transition hover:border-kal-accent/30">
                        <span className="block text-sm font-semibold text-kal-text">{e.title}</span>
                        <span className="mt-0.5 line-clamp-2 text-xs text-kal-text-secondary">{e.description}</span>
                        <span className="mt-1 text-[10px] uppercase text-kal-muted">{e.url}</span>
                      </Link>
                    </li>
                  ))}
                </ul>
              </section>
            );
          })}
        </div>
      )}
    </div>
  );
}

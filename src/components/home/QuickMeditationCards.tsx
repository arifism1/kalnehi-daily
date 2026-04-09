"use client";

import { Wind } from "lucide-react";
import Link from "next/link";

export function QuickMeditationCards() {
  return (
    <section className="rounded-2xl border border-kal-border bg-kal-card p-5 kal-shadow-card">
      <div className="flex items-center gap-2">
        <Wind className="h-4 w-4 text-kal-accent" />
        <h2 className="text-sm font-semibold text-kal-text">Quick Meditation</h2>
      </div>
      <p className="mt-2 text-sm text-kal-muted">Calm your mind between study blocks.</p>
      <div className="mt-4 grid gap-2 sm:grid-cols-2">
        <Link
          href="/meditation"
          className="rounded-xl border border-kal-border bg-kal-page px-4 py-3 text-sm hover:bg-kal-card-muted"
        >
          2-min Anxiety Reset
        </Link>
        <Link
          href="/meditation"
          className="rounded-xl border border-kal-border bg-kal-page px-4 py-3 text-sm hover:bg-kal-card-muted"
        >
          5-min Focus Breath
        </Link>
      </div>
    </section>
  );
}

"use client";

import { Wind } from "lucide-react";
import Link from "next/link";

export function QuickMeditationCards() {
  return (
    <section className="kal-glass-panel rounded-2xl p-5">
      <div className="flex items-center gap-2">
        <Wind className="h-4 w-4 text-kal-accent" />
        <h2 className="text-sm font-semibold text-kal-text">Quick Brain Yoga</h2>
      </div>
      <p className="mt-2 text-sm text-kal-muted">Calm breath and focus between study blocks.</p>
      <div className="mt-4 grid gap-2 sm:grid-cols-2">
        <Link
          href="/meditation"
          className="rounded-xl border border-white/30 bg-white/45 px-4 py-3 text-sm backdrop-blur-sm transition-colors hover:border-white/45 hover:bg-white/65 dark:border-white/12 dark:bg-zinc-900/45 dark:hover:bg-zinc-900/70"
        >
          2-min Anxiety Reset
        </Link>
        <Link
          href="/meditation"
          className="rounded-xl border border-white/30 bg-white/45 px-4 py-3 text-sm backdrop-blur-sm transition-colors hover:border-white/45 hover:bg-white/65 dark:border-white/12 dark:bg-zinc-900/45 dark:hover:bg-zinc-900/70"
        >
          5-min Focus Breath
        </Link>
      </div>
    </section>
  );
}

import Link from "next/link";
import { Brain, Leaf, Wind } from "lucide-react";

import { kalnehiPageMetadata } from "@/lib/seo-metadata";

export const metadata = kalnehiPageMetadata("brainYoga");

export default function BrainYogaPage() {
  return (
    <article className="mx-auto max-w-3xl space-y-8">
      <header className="space-y-2">
        <p className="text-xs font-semibold uppercase tracking-wide text-kal-accent">
          Kalnehi Daily · Focus & recovery
        </p>
        <h1 className="text-2xl font-bold tracking-tight text-kal-text sm:text-3xl">
          Brain Yoga — reset attention between tough chapters
        </h1>
        <p className="text-sm leading-relaxed text-kal-text-secondary sm:text-base">
          “Brain Yoga” is short, practical recovery between subjects: breathing, posture, and
          micro-breaks that protect deep work for JEE, NEET, and Boards. Pair it with Kalnehi Daily’s
          meditation and consistency tools to build a sustainable prep rhythm without burning out.
        </p>
      </header>

      <section className="space-y-4 rounded-2xl border border-kal-border bg-kal-card p-5 shadow-kal-card">
        <h2 className="flex items-center gap-2 text-lg font-semibold text-kal-text">
          <Wind className="h-5 w-5 text-kal-accent" aria-hidden />
          What to practice
        </h2>
        <ul className="space-y-3 text-sm leading-relaxed text-kal-text-secondary">
          <li className="flex gap-2">
            <span className="mt-1 text-kal-accent" aria-hidden>
              ·
            </span>
            <span>
              <strong className="text-kal-text">Two-minute breathing:</strong> slow nasal inhales and
              longer exhales to downshift stress before the next block.
            </span>
          </li>
          <li className="flex gap-2">
            <span className="mt-1 text-kal-accent" aria-hidden>
              ·
            </span>
            <span>
              <strong className="text-kal-text">Eyes & neck reset:</strong> look to a distant point,
              roll shoulders — screen-heavy study needs this between problem sets.
            </span>
          </li>
          <li className="flex gap-2">
            <span className="mt-1 text-kal-accent" aria-hidden>
              ·
            </span>
            <span>
              <strong className="text-kal-text">Single-task transition:</strong> name the next task
              aloud, close unrelated tabs, then start the timer in Kalnehi Daily.
            </span>
          </li>
        </ul>
      </section>

      <section className="flex flex-col gap-4 rounded-2xl border border-dashed border-kal-border bg-kal-accent-soft/30 p-5 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-start gap-3">
          <Leaf className="mt-0.5 h-8 w-8 shrink-0 text-kal-accent" aria-hidden />
          <div>
            <h2 className="font-semibold text-kal-text">Go deeper in Meditation</h2>
            <p className="mt-1 text-sm text-kal-text-secondary">
              Guided micro-sessions and consistency tracking live under Meditation — stack them with
              Brain Yoga for longer study days.
            </p>
          </div>
        </div>
        <Link
          href="/meditation"
          className="inline-flex min-h-[44px] shrink-0 items-center justify-center rounded-xl bg-kal-accent px-5 text-sm font-bold text-kal-accent-foreground"
        >
          Open Meditation
        </Link>
      </section>

      <section className="text-sm leading-relaxed text-kal-text-secondary" aria-labelledby="brain-yoga-seo">
        <h2 id="brain-yoga-seo" className="text-base font-semibold text-kal-text">
          Why students search “brain yoga” during exam prep
        </h2>
        <p className="mt-3">
          High-stakes exams reward volume <em>and</em> recovery. Short mindfulness breaks — sometimes
          called brain yoga — help you return to problems with a fresh working memory instead of
          pushing through fog. Kalnehi Daily packages this mindset next to your planner and study
          sessions so recovery is part of the system, not an afterthought. Install the PWA on Android
          to keep the full workflow one tap away.
        </p>
      </section>

      <p className="flex items-center gap-2 text-xs text-kal-muted">
        <Brain className="h-4 w-4" aria-hidden />
        Related: <Link href="/study-sessions">Study sessions</Link>,{" "}
        <Link href="/prepbrain">PrepBrain AI</Link>
      </p>
    </article>
  );
}

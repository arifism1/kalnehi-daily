import Link from "next/link";
import { Brain, Leaf, Wind } from "lucide-react";

import { Breadcrumbs } from "@/components/seo/Breadcrumbs";
import { MarketingPageJsonLd } from "@/components/seo/MarketingPageJsonLd";
import { marketingPageMetadata } from "@/lib/marketing-seo";
import { SITE_NAME } from "@/lib/seo-metadata";

export const metadata = marketingPageMetadata({
  path: "/brain-yoga",
  title: `Brain Yoga for Exam Warriors — focus & recovery for JEE, NEET & UPSC | ${SITE_NAME}`,
  description: `Brain Yoga: short breathing, posture, and micro-breaks between marathon study blocks. Build sustainable JEE 2026, NEET 2026, and UPSC prep with ${SITE_NAME} — planner, sessions, meditation & installable PWA.`,
});

export default function BrainYogaMarketingPage() {
  return (
    <>
      <MarketingPageJsonLd
        breadcrumbs={[
          { name: "Home", path: "/" },
          { name: "Guides", path: "/guides" },
          { name: "Brain Yoga for Exam Warriors", path: "/brain-yoga" },
        ]}
        faqs={[
          {
            question: "What is Brain Yoga for exam preparation?",
            answer:
              "Short, repeatable recovery between subjects: controlled breathing, eyes and neck resets, and single-task transitions so you return to problems with clearer working memory.",
          },
          {
            question: "Is Brain Yoga a replacement for sleep?",
            answer:
              "No. It complements sleep and meal timing. Use it between chapters, not instead of rest.",
          },
          {
            question: `How does ${SITE_NAME} support this?`,
            answer:
              "The app combines planners, timed study sessions, and meditation tools so recovery sits next to execution — sign in to use the full workflow.",
          },
          {
            question: `Can I install ${SITE_NAME} like an app?`,
            answer:
              "Yes. On Android Chrome, install the PWA from the browser menu after signing in for offline-friendly caching and a full-screen study shell.",
          },
        ]}
      />

      <Breadcrumbs items={[
          { name: "Home", path: "/" },
          { name: "Guides", path: "/guides" },
          { name: "Brain Yoga for Exam Warriors", path: "/brain-yoga" },
        ]} className="mb-2" />
      <article className="space-y-8">
        <header className="space-y-3">
          <p className="text-xs font-semibold uppercase tracking-wide text-kal-accent">
            Focus & recovery
          </p>
          <h1 className="kal-feature-title">
            Brain Yoga for Exam Warriors — reset between JEE, NEET & UPSC blocks
          </h1>
          <p className="text-sm leading-relaxed text-kal-text-secondary sm:text-base">
            High-stakes exams reward <strong className="text-kal-text">volume plus recovery</strong>.
            “Brain Yoga” here means practical micro-routines: breathing, posture, and attention resets
            between PCM drills, PCB chapters, or UPSC mains writing — so you do not push through brain
            fog with more screen time.
          </p>
        </header>

        <section className="kal-glass-card space-y-4 rounded-2xl p-5">
          <h2 className="kal-section-heading flex items-center gap-2">
            <Wind className="size-5 text-kal-accent" aria-hidden />
            What to practice (5–10 minutes total)
          </h2>
          <ul className="space-y-3 text-sm leading-relaxed text-kal-text-secondary">
            <li className="flex gap-2">
              <span className="mt-1 text-kal-accent" aria-hidden>
                ·
              </span>
              <span>
                <strong className="text-kal-text">Breathing:</strong> slow nasal inhales, longer
                exhales — downshift stress before the next timer block.
              </span>
            </li>
            <li className="flex gap-2">
              <span className="mt-1 text-kal-accent" aria-hidden>
                ·
              </span>
              <span>
                <strong className="text-kal-text">Eyes & neck:</strong> look far, roll shoulders;
                non‑negotiable for 10+ hour study days.
              </span>
            </li>
            <li className="flex gap-2">
              <span className="mt-1 text-kal-accent" aria-hidden>
                ·
              </span>
              <span>
                <strong className="text-kal-text">Single-task transition:</strong> name the next task,
                close unrelated tabs, then start {`${SITE_NAME}'s`} timer.
              </span>
            </li>
          </ul>
        </section>

        <section className="kal-glass-panel flex flex-col gap-4 rounded-2xl p-5 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-start gap-3">
            <Leaf className="mt-0.5 size-8 shrink-0 text-kal-accent" aria-hidden />
            <div>
              <h2 className="font-semibold text-kal-text">Stack with Meditation in the app</h2>
              <p className="mt-1 text-sm text-kal-text-secondary">
                Guided micro-sessions and consistency tools live inside {SITE_NAME} after you sign
                in — pair them with Brain Yoga for longer, steadier prep weeks.
              </p>
            </div>
          </div>
          <Link href="/auth" className="kal-btn-accent min-h-[44px] shrink-0">
            Sign in to open app
          </Link>
        </section>

        <section className="text-sm leading-relaxed text-kal-text-secondary" aria-labelledby="by-related">
          <h2 id="by-related" className="text-base font-semibold text-kal-text">
            Related guides
          </h2>
          <ul className="mt-3 list-inside list-disc space-y-1">
            <li>
              <Link href="/jee-study-planner" className="font-medium text-kal-accent-dark hover:underline">
                Best daily planner for JEE 2026
              </Link>
            </li>
            <li>
              <Link href="/neet-study-planner" className="font-medium text-kal-accent-dark hover:underline">
                Best daily planner for NEET 2026
              </Link>
            </li>
            <li>
              <Link href="/upsc-study-planner" className="font-medium text-kal-accent-dark hover:underline">
                Best daily planner for UPSC CSE
              </Link>
            </li>
            <li>
              <Link
                href="/guides/how-to-maintain-consistency-in-jee-preparation"
                className="font-medium text-kal-accent-dark hover:underline"
              >
                How to maintain consistency in JEE preparation
              </Link>
            </li>
          </ul>
        </section>

        <p className="flex items-center gap-2 text-xs text-kal-muted">
          <Brain className="size-4" aria-hidden />
          <Link href="/guides" className="hover:underline">
            All guides
          </Link>
          {" · "}
          <Link href="/auth" className="hover:underline">
            Get started free
          </Link>
        </p>
      </article>
    </>
  );
}

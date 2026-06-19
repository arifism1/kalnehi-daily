import Link from "next/link";
import { ArrowRight } from "lucide-react";

import { BookDemoForm } from "@/components/fizaki/landing/BookDemoForm";
import {
  FIZAKI_DEMO_FORM,
  FIZAKI_FAQ_ITEMS,
  FIZAKI_FEATURES,
  FIZAKI_HERO,
  FIZAKI_HOW_IT_WORKS,
  FIZAKI_ROI,
  FIZAKI_WHO_ITS_FOR,
} from "@/components/fizaki/landing/copy";

export function FizakiLandingContent() {
  return (
    <>
      {/* Hero */}
      <section className="relative min-h-[85vh] bg-kal-page">
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 overflow-hidden"
          style={{
            background:
              "radial-gradient(ellipse 55% 45% at 75% 35%, rgba(59,77,219,0.12) 0%, transparent 70%)",
          }}
        />
        <div className="relative mx-auto flex min-h-[85vh] max-w-7xl flex-col items-center justify-center px-6 pb-16 pt-28 lg:px-8">
          <p className="mb-4 text-[10px] font-bold uppercase tracking-[0.25em] text-kal-muted">
            {FIZAKI_HERO.eyebrow}
          </p>
          <h1
            className="max-w-3xl text-center text-[2.4rem] font-normal leading-[1.08] tracking-tight text-kal-text sm:text-5xl lg:text-[3.25rem]"
            style={{ fontFamily: "var(--font-display)" }}
          >
            {FIZAKI_HERO.headline}
            <br />
            <span className="text-kal-accent">{FIZAKI_HERO.headlineAccent}</span>
          </h1>
          <p className="mt-6 max-w-2xl text-center text-lg leading-relaxed text-kal-text-secondary">
            {FIZAKI_HERO.subhead}
          </p>
          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <a
              href="#demo"
              className="inline-flex min-h-[52px] items-center justify-center rounded-full bg-kal-accent px-8 text-base font-bold text-kal-accent-foreground shadow-[0_4px_20px_rgba(59,77,219,0.35)] transition hover:brightness-105 active:scale-[0.99]"
            >
              {FIZAKI_HERO.primaryCta}
            </a>
            <a
              href="#how-it-works"
              className="inline-flex min-h-[52px] items-center justify-center gap-2 rounded-full border border-kal-border bg-kal-card px-6 text-base font-semibold text-kal-text backdrop-blur-sm transition hover:border-kal-accent/30 active:scale-[0.99]"
            >
              {FIZAKI_HERO.secondaryCta}
              <ArrowRight className="size-4" aria-hidden />
            </a>
          </div>
        </div>
      </section>

      {/* Who it's for */}
      <section id="who-its-for" className="border-t border-kal-border bg-kal-card-muted/50 py-20">
        <div className="mx-auto max-w-7xl px-6 lg:px-8">
          <h2 className="text-center text-3xl font-semibold tracking-tight text-kal-text">
            {FIZAKI_WHO_ITS_FOR.title}
          </h2>
          <p className="mx-auto mt-3 max-w-2xl text-center text-kal-text-secondary">
            {FIZAKI_WHO_ITS_FOR.subtitle}
          </p>
          <div className="mt-12 grid gap-6 md:grid-cols-3">
            {FIZAKI_WHO_ITS_FOR.roles.map((role) => (
              <div
                key={role.id}
                className="rounded-2xl border border-kal-border bg-kal-card p-6 shadow-sm"
              >
                <p className="text-xs font-bold uppercase tracking-widest text-kal-accent">
                  {role.title}
                </p>
                <p className="mt-3 text-sm leading-relaxed text-kal-text-secondary">
                  {role.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Product / features */}
      <section id="product" className="py-20">
        <div className="mx-auto max-w-7xl px-6 lg:px-8">
          <h2 className="text-center text-3xl font-semibold tracking-tight text-kal-text">
            {FIZAKI_FEATURES.title}
          </h2>
          <p className="mx-auto mt-3 max-w-2xl text-center text-kal-text-secondary">
            {FIZAKI_FEATURES.subtitle}
          </p>
          <ul className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {FIZAKI_FEATURES.items.map((item) => (
              <li
                key={item.title}
                className="rounded-2xl border border-kal-border bg-kal-card p-5"
              >
                <p className="font-semibold text-kal-text">{item.title}</p>
                <p className="mt-2 text-sm leading-relaxed text-kal-text-secondary">
                  {item.description}
                </p>
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* ROI strip */}
      <section className="border-y border-kal-border bg-kal-accent-soft py-16">
        <div className="mx-auto max-w-7xl px-6 lg:px-8">
          <h2 className="text-center text-2xl font-semibold text-kal-text">
            {FIZAKI_ROI.title}
          </h2>
          <p className="mx-auto mt-2 max-w-xl text-center text-sm text-kal-text-secondary">
            {FIZAKI_ROI.subtitle}
          </p>
          <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {FIZAKI_ROI.metrics.map((m) => (
              <div
                key={m.label}
                className="rounded-xl border border-kal-border bg-kal-card/80 px-4 py-5 text-center"
              >
                <p className="text-xs font-bold uppercase tracking-wide text-kal-muted">
                  {m.label}
                </p>
                <p className="mt-2 text-sm font-semibold text-kal-text">{m.value}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How it works */}
      <section id="how-it-works" className="py-20">
        <div className="mx-auto max-w-7xl px-6 lg:px-8">
          <h2 className="text-center text-3xl font-semibold tracking-tight text-kal-text">
            {FIZAKI_HOW_IT_WORKS.title}
          </h2>
          <ol className="mt-12 grid gap-8 md:grid-cols-3">
            {FIZAKI_HOW_IT_WORKS.steps.map((step) => (
              <li key={step.step} className="text-center">
                <span className="inline-flex size-10 items-center justify-center rounded-full bg-kal-accent text-sm font-bold text-kal-accent-foreground">
                  {step.step}
                </span>
                <p className="mt-4 text-lg font-semibold text-kal-text">{step.title}</p>
                <p className="mt-2 text-sm text-kal-text-secondary">{step.description}</p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      {/* FAQ */}
      <section id="faq" className="border-t border-kal-border bg-kal-card-muted/50 py-20">
        <div className="mx-auto max-w-3xl px-6 lg:px-8">
          <h2 className="text-center text-3xl font-semibold tracking-tight text-kal-text">
            FAQ
          </h2>
          <dl className="mt-10 space-y-6">
            {FIZAKI_FAQ_ITEMS.map((item) => (
              <div
                key={item.question}
                className="rounded-2xl border border-kal-border bg-kal-card p-5"
              >
                <dt className="font-semibold text-kal-text">{item.question}</dt>
                <dd className="mt-2 text-sm leading-relaxed text-kal-text-secondary">
                  {item.answer}
                </dd>
              </div>
            ))}
          </dl>
        </div>
      </section>

      {/* Demo form CTA */}
      <section id="demo" className="py-20">
        <div className="mx-auto max-w-xl px-6 lg:px-8">
          <h2 className="text-center text-3xl font-semibold tracking-tight text-kal-text">
            {FIZAKI_DEMO_FORM.title}
          </h2>
          <p className="mt-3 text-center text-kal-text-secondary">
            {FIZAKI_DEMO_FORM.subtitle}
          </p>
          <div className="relative mt-10 rounded-2xl border border-kal-border bg-kal-card p-6 shadow-sm sm:p-8">
            <BookDemoForm />
          </div>
          <p className="mt-6 text-center text-sm text-kal-muted">
            Already have access?{" "}
            <Link href="/auth" className="font-medium text-kal-accent hover:underline">
              Sign in
            </Link>
          </p>
        </div>
      </section>
    </>
  );
}

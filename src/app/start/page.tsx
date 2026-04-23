import Image from "next/image";
import Link from "next/link";
import type { Metadata } from "next";

import { InstagramWelcomeBanner } from "@/components/InstagramWelcomeBanner";
import { SITE_NAME } from "@/lib/seo-metadata";

export const metadata: Metadata = {
  title: `Get Started — ${SITE_NAME}`,
  description: "Sign up for your 3-day free trial of Kalnehi Daily.",
  robots: { index: false },
};

export default function StartPage() {
  return (
    <div className="kal-page-bg flex min-h-full flex-col items-center justify-center gap-8 px-6 py-16">
      <InstagramWelcomeBanner />

      <div className="flex flex-col items-center gap-4 text-center">
        <div className="grid size-16 shrink-0 place-items-center overflow-hidden rounded-2xl bg-[rgba(255,252,248,0.95)] shadow-sm ring-2 ring-kal-accent/20">
          <Image
            src="/icon-192x192.png"
            alt=""
            width={52}
            height={52}
            priority
            className="size-11 object-contain"
          />
        </div>
        <div>
          <h1 className="kal-feature-title">{SITE_NAME}</h1>
          <p className="mt-2 max-w-sm text-sm leading-relaxed text-kal-muted">
            Your AI-powered daily study companion — built for serious exam prep.
          </p>
        </div>
      </div>

      <div className="flex w-full max-w-xs flex-col gap-3">
        <Link
          href="/auth?mode=signup"
          className="flex h-11 w-full items-center justify-center rounded-xl bg-kal-accent px-6 text-sm font-semibold text-white shadow-sm transition-opacity hover:opacity-90 active:opacity-80"
        >
          Create free account
        </Link>
        <Link
          href="/auth?mode=login"
          className="flex h-11 w-full items-center justify-center rounded-xl border border-kal-border bg-kal-card px-6 text-sm font-medium text-kal-text-secondary transition-colors hover:text-kal-text"
        >
          Already have an account? Sign in
        </Link>
      </div>
    </div>
  );
}

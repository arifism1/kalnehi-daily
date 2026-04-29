"use client";

import Link from "next/link";

import { usePlatform } from "@/hooks/usePlatform";

import type { AiUsagePhase } from "@/lib/prepbrainTokens";

/** Hash target on My Subscription — must match `id` on the extra credits card. */
export const MY_SUBSCRIPTION_EXTRA_CREDITS_HREF = "/my-subscription#extra-credits";

export function AiTokenLimitLinks({ phase }: { phase: AiUsagePhase }) {
  const { isApp } = usePlatform();

  if (phase === "monthly") {
    if (isApp) {
      return (
        <p className="mt-2 text-[11px] leading-snug text-kal-text-secondary">
          Extra Mastermind tokens can be purchased from the website (My Subscription).
        </p>
      );
    }
    return (
      <p className="mt-2 text-[11px] leading-snug text-kal-text">
        <Link
          href={MY_SUBSCRIPTION_EXTRA_CREDITS_HREF}
          className="font-semibold text-kal-accent underline underline-offset-2"
        >
          Buy extra Mastermind tokens
        </Link>
        <span className="text-kal-text-secondary">
          {" "}
          (My Subscription — bonus packs use before your monthly cap, 30-day validity).
        </span>
      </p>
    );
  }
  if (phase === "welcome" || phase === "paid_trial") {
    if (isApp) {
      return (
        <p className="mt-2 text-[11px] leading-snug text-kal-text-secondary">
          Full Smart Plan access can be activated from the website or via WhatsApp/email instructions.
        </p>
      );
    }
    return (
      <p className="mt-2 text-[11px] leading-snug text-kal-text">
        <Link
          href="/pricing"
          className="font-semibold text-kal-accent underline underline-offset-2"
        >
          View plans & pricing
        </Link>
        <span className="text-kal-text-secondary"> to unlock full Smart Plan access.</span>
      </p>
    );
  }
  return null;
}

export function VoiceMinuteLimitLink() {
  const { isApp } = usePlatform();
  if (isApp) {
    return (
      <p className="mt-2 text-[11px] leading-snug text-kal-text-secondary">
        Extra voice minutes can be purchased from the website (My Subscription).
      </p>
    );
  }
  return (
    <p className="mt-2 text-[11px] leading-snug text-kal-text">
      <Link
        href={MY_SUBSCRIPTION_EXTRA_CREDITS_HREF}
        className="font-semibold text-kal-accent underline underline-offset-2"
      >
        My Subscription — buy extra voice minutes
      </Link>
      <span className="text-kal-text-secondary">
        {" "}
        (same checkout as Mastermind token packs).
      </span>
    </p>
  );
}

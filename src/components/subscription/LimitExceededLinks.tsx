"use client";

import Link from "next/link";

import type { AiUsagePhase } from "@/lib/prepbrainTokens";

/** Hash target on My Subscription — must match `id` on the extra credits card. */
export const MY_SUBSCRIPTION_EXTRA_CREDITS_HREF = "/my-subscription#extra-credits";

export function AiTokenLimitLinks({ phase }: { phase: AiUsagePhase }) {
  if (phase === "monthly") {
    return (
      <p className="mt-2 text-[11px] leading-snug text-kal-text">
        <Link
          href={MY_SUBSCRIPTION_EXTRA_CREDITS_HREF}
          className="font-semibold text-kal-accent underline underline-offset-2"
        >
          Buy extra AI credits
        </Link>
        <span className="text-kal-text-secondary">
          {" "}
          (My Subscription — bonus packs use before your monthly cap, 30-day validity).
        </span>
      </p>
    );
  }
  if (phase === "welcome" || phase === "paid_trial") {
    return (
      <p className="mt-2 text-[11px] leading-snug text-kal-text">
        <Link
          href="/pricing"
          className="font-semibold text-kal-accent underline underline-offset-2"
        >
          View plans & pricing
        </Link>
        <span className="text-kal-text-secondary"> to unlock full Pro access.</span>
      </p>
    );
  }
  return null;
}

export function VoiceMinuteLimitLink() {
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
        (same checkout as bonus AI credits).
      </span>
    </p>
  );
}

"use client";

import Script from "next/script";
import { useMemo, useState } from "react";

import {
  activateRazorpaySubscription,
  createRazorpayTrialSubscription,
} from "@/actions/subscription";
import { CancelSubscriptionButton } from "@/components/subscription/CancelSubscriptionButton";
import { useSubscriptionAccess } from "@/hooks/useSubscriptionAccess";

type RazorpayCheckoutResponse = {
  razorpay_payment_id: string;
  razorpay_subscription_id: string;
  razorpay_signature: string;
};

type RazorpayInstance = {
  open: () => void;
};

type RazorpayConstructor = new (options: Record<string, unknown>) => RazorpayInstance;

declare global {
  interface Window {
    Razorpay?: RazorpayConstructor;
  }
}

const BENEFITS = [
  "Wake up with a crystal-clear daily execution map so your best hours never get wasted.",
  "Stay unstoppable with accountability loops that keep momentum high on low-motivation days.",
  "Turn consistency into rank-moving outcomes with a system designed for serious aspirants.",
];

export function PricingPageClient() {
  const { hasPaidAccess, status: subscriptionStatus } = useSubscriptionAccess();
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState<string | null>(null);

  const ctaLabel = useMemo(
    () => (busy ? "Opening checkout..." : "Pay ₹21 to Start 3-Day Trial"),
    [busy],
  );

  async function startCheckout() {
    setBusy(true);
    setStatus(null);
    try {
      const created = await createRazorpayTrialSubscription();
      if (!created.ok) {
        setStatus(created.error);
        return;
      }

      if (typeof window === "undefined" || !window.Razorpay) {
        setStatus("Unable to load payment window. Refresh and try again.");
        return;
      }

      const rzp = new window.Razorpay({
        key: created.keyId,
        name: "Kalnehi Daily",
        description: "3-Day Trial Access (₹21)",
        subscription_id: created.subscriptionId,
        amount: created.amountPaise,
        currency: "INR",
        theme: { color: "#ef4444" },
        handler: async (response: RazorpayCheckoutResponse) => {
          const updated = await activateRazorpaySubscription({ ...response });
          if (!updated.ok) {
            setStatus(updated.error);
            return;
          }
          setStatus(
            "Trial started! ₹299/month will auto-charge after 3 days for 12 months.",
          );
          window.location.assign("/");
        },
      });
      rzp.open();
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Checkout failed.");
    } finally {
      setBusy(false);
    }
  }

  const showCancel =
    subscriptionStatus === "trial" || subscriptionStatus === "active";

  return (
    <>
      <Script src="https://checkout.razorpay.com/v1/checkout.js" strategy="afterInteractive" />
      <section className="mx-auto max-w-5xl space-y-8 pb-10">
        <header className="rounded-2xl border border-kal-border bg-kal-card px-6 py-8 text-center kal-shadow-card">
          <p className="text-[0.7rem] font-semibold uppercase tracking-[0.22em] text-kal-accent">
            Premium Access
          </p>
          <h1 className="mt-3 text-3xl font-bold tracking-tight text-kal-text">
            Start your 3-day Pro trial
          </h1>
          <p className="mx-auto mt-3 max-w-2xl text-sm leading-relaxed text-kal-text-secondary">
            ₹21 is upfront validation. After 3 days, ₹299 will be automatically
            charged every month for 12 months (1 year). You can cancel anytime.
          </p>
        </header>

        <div className="grid grid-cols-1 gap-5">
          <article className="relative rounded-2xl border-2 border-kal-accent bg-kal-card p-6 kal-shadow-card">
            <span className="absolute -top-3 left-4 rounded-full bg-kal-accent px-3 py-1 text-[10px] font-bold uppercase tracking-wide text-kal-accent-foreground">
              Most Popular
            </span>
            <h2 className="text-xl font-bold text-kal-text">₹21 3-Day Trial</h2>
            <p className="mt-2 text-sm text-kal-text-secondary">
              Unlock the full app instantly. No limited mode. No restricted planner.
            </p>
            <button
              type="button"
              onClick={() => void startCheckout()}
              disabled={busy || hasPaidAccess}
              className="mt-6 inline-flex min-h-[48px] w-full items-center justify-center rounded-xl bg-kal-accent px-4 py-3 text-sm font-bold text-kal-accent-foreground disabled:opacity-60"
            >
              {hasPaidAccess ? "You have an active subscription" : ctaLabel}
            </button>
            <p className="mt-4 rounded-xl border border-kal-border bg-kal-card-muted px-3 py-2 text-xs text-kal-text-secondary">
              ₹21 is upfront validation. After 3 days, ₹299 will be automatically
              charged every month for 12 months (1 year). You can cancel anytime
              before day 3 to avoid charges.
            </p>
            {showCancel ? (
              <div className="mt-4">
                <CancelSubscriptionButton />
              </div>
            ) : null}
          </article>
        </div>

        <section className="rounded-2xl border border-kal-border bg-kal-card p-6">
          <h3 className="text-sm font-semibold uppercase tracking-wide text-kal-accent">
            What do you get in Pro?
          </h3>
          <ul className="mt-4 space-y-2 text-sm text-kal-text-secondary">
            {BENEFITS.map((benefit) => (
              <li key={benefit}>- {benefit}</li>
            ))}
          </ul>
          {status ? (
            <p className="mt-5 rounded-xl border border-kal-border bg-kal-card-muted px-3 py-2 text-sm text-kal-text">
              {status}
            </p>
          ) : null}
        </section>
      </section>
    </>
  );
}
